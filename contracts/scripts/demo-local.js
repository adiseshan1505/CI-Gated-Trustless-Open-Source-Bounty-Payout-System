// End-to-end walkthrough on the in-process Hardhat network, with a mock Chainlink router
// playing the DON. Shows a rejected submission followed by a verified one and the payout.
//
//   npx hardhat run scripts/demo-local.js
const { ethers } = require("hardhat");

const fmt = (wei) => `${ethers.formatEther(wei)} ETH`;
const encode = (checks) => ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [checks]);
const STATUS = ["Open", "UnderVerification", "Paid"];

async function main() {
  const [admin, repoOwner, dev] = await ethers.getSigners();
  const router = await ethers.deployContract("MockFunctionsRouter");
  const escrow = await ethers.deployContract("BountyEscrow", [await router.getAddress(), ethers.ZeroAddress]);
  await escrow.connect(admin).setFunctionsConfig(ethers.encodeBytes32String("local"), 1, 300_000, "/* oracle/source.js */");
  const status = async () => STATUS[Number((await escrow.getBounty(0)).status)];

  console.log("1. Repo owner funds a bounty for adiseshan1505/demo-target#12");
  await escrow.connect(repoOwner).makeBounty("adiseshan1505/demo-target", 12, { value: ethers.parseEther("1") });
  console.log(`   escrow balance ${fmt(await ethers.provider.getBalance(await escrow.getAddress()))}, status ${await status()}`);

  console.log("2. Developer submits PR #34 before CI is green");
  await escrow.connect(dev).makeSubmission(0, 34);
  console.log(`   status ${await status()}, Chainlink request ${(await router.lastRequestId()).slice(0, 18)}…`);

  console.log("3. DON reports: every check except ciPassed (0x37)");
  await router.fulfill(await router.lastRequestId(), encode(0x37), "0x");
  console.log(`   submission 0 verified=${(await escrow.getSubmission(0)).verified}, status ${await status()}`);

  console.log("4. CI goes green; developer resubmits");
  const before = await ethers.provider.getBalance(dev.address);
  await escrow.connect(dev).makeSubmission(0, 34);

  console.log("5. DON reports: all six checks passed (0x3f)");
  await router.fulfill(await router.lastRequestId(), encode(0x3f), "0x");
  const gained = (await ethers.provider.getBalance(dev.address)) - before;
  console.log(`   submission 1 verified=${(await escrow.getSubmission(1)).verified}, status ${await status()}`);
  console.log(`   developer received ~${fmt(gained)} (minus gas for the resubmission)`);
  console.log(`   escrow balance ${fmt(await ethers.provider.getBalance(await escrow.getAddress()))}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
