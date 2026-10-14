// Deploys BountyEscrow and (optionally) configures Chainlink Functions.
//
//   npx hardhat run scripts/deploy.js --network localhost   # uses a MockFunctionsRouter
//   npx hardhat run scripts/deploy.js --network sepolia     # uses FUNCTIONS_ROUTER from .env
//
// Writes deployments/<network>.json with the address and deployment block.
const fs = require("node:fs");
const path = require("node:path");
const { ethers, network } = require("hardhat");

const LOCAL = ["hardhat", "localhost"].includes(network.name);
const SOURCE_PATH = path.join(__dirname, "..", "..", "oracle", "source.js");

/** Drops full-line comments and blank lines: the source is stored on-chain, so bytes cost gas. */
function loadSource() {
  return fs
    .readFileSync(SOURCE_PATH, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("//"))
    .join("\n");
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const env = process.env;
  console.log(`network ${network.name}, deployer ${deployer.address}`);

  let router = env.FUNCTIONS_ROUTER;
  if (LOCAL) {
    const mock = await ethers.deployContract("MockFunctionsRouter");
    await mock.waitForDeployment();
    router = await mock.getAddress();
    console.log(`MockFunctionsRouter ${router}`);
  }
  if (!router) throw Error("FUNCTIONS_ROUTER is not set (see .env.example)");

  const relayer = env.RELAYER_ADDRESS || (LOCAL ? deployer.address : ethers.ZeroAddress);
  const escrow = await ethers.deployContract("BountyEscrow", [router, relayer]);
  const receipt = await escrow.deploymentTransaction().wait();
  const address = await escrow.getAddress();
  console.log(`BountyEscrow ${address} (block ${receipt.blockNumber})`);
  console.log(`relayer ${relayer === ethers.ZeroAddress ? "disabled" : relayer}`);

  const subscriptionId = BigInt(env.FUNCTIONS_SUBSCRIPTION_ID || "0");
  if (subscriptionId > 0n) {
    const donId = ethers.encodeBytes32String(env.FUNCTIONS_DON_ID || "fun-ethereum-sepolia-1");
    const gasLimit = Number(env.FUNCTIONS_CALLBACK_GAS_LIMIT || "300000");
    await (await escrow.setFunctionsConfig(donId, subscriptionId, gasLimit, loadSource())).wait();
    console.log(`Chainlink Functions enabled: subscription ${subscriptionId}, DON ${env.FUNCTIONS_DON_ID}`);

    const secretsVersion = BigInt(env.FUNCTIONS_SECRETS_VERSION || "0");
    if (secretsVersion > 0n) {
      await (await escrow.setSecrets(Number(env.FUNCTIONS_SECRETS_SLOT_ID || "0"), secretsVersion)).wait();
      console.log(`DON-hosted secrets: slot ${env.FUNCTIONS_SECRETS_SLOT_ID}, version ${secretsVersion}`);
    }
  } else {
    console.log("Chainlink Functions not configured (FUNCTIONS_SUBSCRIPTION_ID=0): relayer path only");
  }

  const record = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    address,
    router,
    relayer,
    deployBlock: receipt.blockNumber,
    functionsSubscriptionId: subscriptionId.toString(),
  };
  const out = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
  console.log(`wrote deployments/${network.name}.json`);

  console.log("\nNext steps:");
  if (subscriptionId > 0n) console.log(`  - add ${address} as a consumer of subscription ${subscriptionId} at https://functions.chain.link`);
  console.log(`  - frontend/.env.local: NEXT_PUBLIC_USE_MOCKS=false, NEXT_PUBLIC_ESCROW_ADDRESS=${address}`);
  if (relayer !== ethers.ZeroAddress) console.log(`  - oracle/.env: ESCROW_ADDRESS=${address}, FROM_BLOCK=${receipt.blockNumber}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
