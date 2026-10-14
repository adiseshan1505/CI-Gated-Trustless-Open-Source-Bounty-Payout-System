#!/usr/bin/env node
// Runs source.js locally against the live GitHub API, exactly as the DON would.
//
//   node simulate.js <owner/repo> <issue> <pr> <developer> [bountyCreatedAt] [submittedAt]
//
// Timestamps are unix seconds and default to 0 / now. Set GITHUB_TOKEN to avoid rate limits.
require("dotenv").config();
const { runSource } = require("./lib/run-source");

async function main() {
  const [repo, issue, pr, developer, createdAt = "0", submittedAt = String(Math.floor(Date.now() / 1000))] =
    process.argv.slice(2);
  if (!repo || !issue || !pr || !developer) {
    console.error("usage: node simulate.js <owner/repo> <issue> <pr> <developer> [bountyCreatedAt] [submittedAt]");
    process.exit(2);
  }

  const secrets = process.env.GITHUB_TOKEN ? { githubToken: process.env.GITHUB_TOKEN } : {};
  const { checks, passed, detail } = await runSource({
    args: [repo, issue, pr, developer, createdAt, submittedAt],
    secrets,
  });

  for (const [name, ok] of Object.entries(detail)) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  console.log(`\nchecks = 0x${checks.toString(16).padStart(2, "0")}  ->  ${passed ? "VERIFIED (payout)" : "REJECTED"}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error(`ERROR  ${err.message}\n\n-> REJECTED (the contract treats oracle errors as a failed verification)`);
  process.exit(1);
});
