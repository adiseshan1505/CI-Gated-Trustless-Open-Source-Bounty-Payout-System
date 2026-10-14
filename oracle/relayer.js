#!/usr/bin/env node
// Relayer: the non-Chainlink verification path. Watches BountyEscrow for new
// submissions, runs the same source.js checks off-chain and reports the verdict
// with verifySubmission(). The signer must be the contract's `relayer`.
//
//   node relayer.js          # poll forever
//   node relayer.js --once   # single pass (e.g. from cron or a scheduled workflow)
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const { runSource } = require("./lib/run-source");

const ABI_PATH = path.join(__dirname, "..", "contracts", "abi", "BountyEscrow.json");
// GitHub statuses that mean the PR can never verify; anything else is retried.
const PERMANENT_HTTP = new Set([404, 410, 422]);

function env(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") throw Error(`missing env ${name} (see .env.example)`);
  return value;
}

async function processSubmission(escrow, submissionId, secrets) {
  if (await escrow.isResolved(submissionId)) return;

  const sub = await escrow.getSubmission(submissionId);
  const bounty = await escrow.getBounty(sub.bountyId);
  const createdAt = await escrow.bountyCreatedAt(sub.bountyId);
  const args = [bounty.repo, bounty.issueNumber, sub.prNumber, sub.developer, createdAt, sub.submittedAt];

  let passed;
  try {
    const result = await runSource({ args, secrets });
    passed = result.passed;
    console.log(`#${submissionId} ${bounty.repo}#${sub.prNumber}`, JSON.stringify(result.detail));
  } catch (err) {
    const status = Number((err.message.match(/failed: (\d{3})/) || [])[1]);
    if (!PERMANENT_HTTP.has(status)) {
      console.warn(`#${submissionId} transient error, will retry: ${err.message}`);
      return;
    }
    console.log(`#${submissionId} rejected: ${err.message}`);
    passed = false;
  }

  const tx = await escrow.verifySubmission(submissionId, passed);
  await tx.wait();
  console.log(`#${submissionId} ${passed ? "VERIFIED -> paid" : "REJECTED"} (tx ${tx.hash})`);
}

async function main() {
  const once = process.argv.includes("--once");
  const provider = new ethers.JsonRpcProvider(env("RPC_URL"));
  const signer = new ethers.Wallet(env("RELAYER_PRIVATE_KEY"), provider);
  const { abi } = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
  const escrow = new ethers.Contract(env("ESCROW_ADDRESS"), abi, signer);
  const secrets = process.env.GITHUB_TOKEN ? { githubToken: process.env.GITHUB_TOKEN } : {};
  const pollMs = Number(env("POLL_INTERVAL_MS", "15000"));
  const chunk = Number(env("LOG_BLOCK_RANGE", "5000"));

  const configured = await escrow.relayer();
  if (configured.toLowerCase() !== signer.address.toLowerCase()) {
    throw Error(`signer ${signer.address} is not the contract relayer (${configured})`);
  }
  console.log(`relayer ${signer.address} watching ${await escrow.getAddress()}`);

  let fromBlock = BigInt(env("FROM_BLOCK", "0"));
  const pending = new Set(); // submissions to (re)try

  for (;;) {
    const latest = BigInt(await provider.getBlockNumber());
    while (fromBlock <= latest) {
      const toBlock = fromBlock + BigInt(chunk) - 1n < latest ? fromBlock + BigInt(chunk) - 1n : latest;
      const logs = await escrow.queryFilter(escrow.filters.SubmissionCreated(), fromBlock, toBlock);
      for (const log of logs) pending.add(log.args.submissionId);
      fromBlock = toBlock + 1n;
    }

    for (const id of [...pending]) {
      try {
        await processSubmission(escrow, id, secrets);
        if (await escrow.isResolved(id)) pending.delete(id);
      } catch (err) {
        console.error(`#${id} failed: ${err.shortMessage || err.message}`);
      }
    }

    if (once) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
