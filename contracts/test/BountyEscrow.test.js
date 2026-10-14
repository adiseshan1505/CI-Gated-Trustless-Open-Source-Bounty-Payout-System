const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const Status = { Open: 0n, UnderVerification: 1n, Paid: 2n };
const ALL_CHECKS = 0x3f;
const REPO = "adiseshan1505/demo-target";
const ISSUE = 12n;
const PR = 34n;
const BOUNTY = ethers.parseEther("0.5");
const DON_ID = ethers.encodeBytes32String("fun-ethereum-sepolia-1");
const SOURCE = "return Functions.encodeUint256(63);";

const encodeChecks = (mask) => ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [mask]);

async function deployFixture() {
  const [owner, repoOwner, dev, otherDev, relayer, stranger] = await ethers.getSigners();
  const router = await ethers.deployContract("MockFunctionsRouter");
  const escrow = await ethers.deployContract("BountyEscrow", [await router.getAddress(), relayer.address]);
  return { escrow, router, owner, repoOwner, dev, otherDev, relayer, stranger };
}

async function bountyFixture() {
  const ctx = await deployFixture();
  await ctx.escrow.connect(ctx.repoOwner).makeBounty(REPO, ISSUE, { value: BOUNTY });
  return ctx;
}

async function functionsFixture() {
  const ctx = await bountyFixture();
  await ctx.escrow.setFunctionsConfig(DON_ID, 42, 300_000, SOURCE);
  return ctx;
}

describe("BountyEscrow", function () {
  describe("makeBounty", function () {
    it("locks ETH and records the bounty", async function () {
      const { escrow, repoOwner } = await loadFixture(deployFixture);

      const tx = escrow.connect(repoOwner).makeBounty(REPO, ISSUE, { value: BOUNTY });
      await expect(tx).to.emit(escrow, "BountyCreated").withArgs(0, repoOwner.address, REPO, ISSUE, BOUNTY);
      await expect(tx).to.changeEtherBalances([repoOwner, escrow], [-BOUNTY, BOUNTY]);

      const bounty = await escrow.getBounty(0);
      expect(bounty.owner).to.equal(repoOwner.address);
      expect(bounty.repo).to.equal(REPO);
      expect(bounty.issueNumber).to.equal(ISSUE);
      expect(bounty.amount).to.equal(BOUNTY);
      expect(bounty.status).to.equal(Status.Open);
      expect(await escrow.bountyCount()).to.equal(1);
      expect(await escrow.bountyCreatedAt(0)).to.be.greaterThan(0);
    });

    it("rejects a bounty without ETH", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await expect(escrow.makeBounty(REPO, ISSUE)).to.be.revertedWithCustomError(escrow, "ZeroAmount");
    });

    it("rejects issue number 0", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await expect(escrow.makeBounty(REPO, 0, { value: 1 })).to.be.revertedWithCustomError(escrow, "InvalidNumber");
    });

    for (const repo of ["", "noslash", "/repo", "owner/", "a/b/c", "owner/re po", "owner/repo?x=1", "../../x", "x".repeat(141)]) {
      it(`rejects malformed repo ${JSON.stringify(repo.length > 20 ? repo.slice(0, 20) + "…" : repo)}`, async function () {
        const { escrow } = await loadFixture(deployFixture);
        await expect(escrow.makeBounty(repo, ISSUE, { value: 1 })).to.be.revertedWithCustomError(escrow, "InvalidRepo");
      });
    }

    it("accepts GitHub-style names with dots, dashes and underscores", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await expect(escrow.makeBounty("my-org_1/repo.name-2", ISSUE, { value: 1 })).to.emit(escrow, "BountyCreated");
    });

    it("reverts reads of unknown bounties", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await expect(escrow.getBounty(0)).to.be.revertedWithCustomError(escrow, "BountyNotFound");
    });
  });

  describe("makeSubmission", function () {
    it("records the submission and moves the bounty under verification", async function () {
      const { escrow, dev } = await loadFixture(bountyFixture);

      await expect(escrow.connect(dev).makeSubmission(0, PR))
        .to.emit(escrow, "SubmissionCreated")
        .withArgs(0, 0, dev.address, PR);

      const sub = await escrow.getSubmission(0);
      expect(sub.bountyId).to.equal(0);
      expect(sub.developer).to.equal(dev.address);
      expect(sub.prNumber).to.equal(PR);
      expect(sub.submittedAt).to.be.greaterThan(0);
      expect(sub.verified).to.equal(false);
      expect((await escrow.getBounty(0)).status).to.equal(Status.UnderVerification);
      expect(await escrow.pendingSubmissions(0)).to.equal(1);
      expect(await escrow.submissionCount()).to.equal(1);
    });

    it("does not send a Chainlink request when Functions is not configured", async function () {
      const { escrow, dev } = await loadFixture(bountyFixture);
      expect(await escrow.isFunctionsConfigured()).to.equal(false);
      await expect(escrow.connect(dev).makeSubmission(0, PR)).not.to.emit(escrow, "VerificationRequested");
    });

    it("rejects unknown bounties and PR number 0", async function () {
      const { escrow, dev } = await loadFixture(bountyFixture);
      await expect(escrow.connect(dev).makeSubmission(7, PR)).to.be.revertedWithCustomError(escrow, "BountyNotFound");
      await expect(escrow.connect(dev).makeSubmission(0, 0)).to.be.revertedWithCustomError(escrow, "InvalidNumber");
    });

    it("blocks the same PR while it is under verification", async function () {
      const { escrow, dev, otherDev } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);
      await expect(escrow.connect(otherDev).makeSubmission(0, PR))
        .to.be.revertedWithCustomError(escrow, "PrAlreadyUnderVerification")
        .withArgs(0, PR);
      await expect(escrow.connect(otherDev).makeSubmission(0, PR + 1n)).to.emit(escrow, "SubmissionCreated");
    });

    it("reverts reads of unknown submissions", async function () {
      const { escrow } = await loadFixture(bountyFixture);
      await expect(escrow.getSubmission(0)).to.be.revertedWithCustomError(escrow, "SubmissionNotFound");
    });
  });

  describe("verifySubmission (relayer path)", function () {
    it("pays the developer when verification succeeds", async function () {
      const { escrow, dev, relayer } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);

      const tx = escrow.connect(relayer).verifySubmission(0, true);
      await expect(tx)
        .to.emit(escrow, "SubmissionVerified")
        .withArgs(0, true)
        .and.to.emit(escrow, "SubmissionChecks")
        .withArgs(0, ALL_CHECKS)
        .and.to.emit(escrow, "BountyPaid")
        .withArgs(0, dev.address, BOUNTY);
      await expect(tx).to.changeEtherBalances([escrow, dev], [-BOUNTY, BOUNTY]);

      expect((await escrow.getBounty(0)).status).to.equal(Status.Paid);
      expect((await escrow.getSubmission(0)).verified).to.equal(true);
      expect(await escrow.isResolved(0)).to.equal(true);
    });

    it("reopens the bounty when verification fails, and allows a resubmission", async function () {
      const { escrow, dev, relayer } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);

      await expect(escrow.connect(relayer).verifySubmission(0, false))
        .to.emit(escrow, "SubmissionVerified")
        .withArgs(0, false)
        .and.not.to.emit(escrow, "BountyPaid");

      expect((await escrow.getBounty(0)).status).to.equal(Status.Open);
      expect((await escrow.getSubmission(0)).verified).to.equal(false);
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(BOUNTY);

      await expect(escrow.connect(dev).makeSubmission(0, PR)).to.emit(escrow, "SubmissionCreated").withArgs(1, 0, dev.address, PR);
    });

    it("keeps the bounty under verification while other submissions are pending", async function () {
      const { escrow, dev, otherDev, relayer } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);
      await escrow.connect(otherDev).makeSubmission(0, PR + 1n);

      await escrow.connect(relayer).verifySubmission(0, false);
      expect((await escrow.getBounty(0)).status).to.equal(Status.UnderVerification);

      await escrow.connect(relayer).verifySubmission(1, false);
      expect((await escrow.getBounty(0)).status).to.equal(Status.Open);
    });

    it("pays only once when two submissions both pass", async function () {
      const { escrow, dev, otherDev, relayer } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);
      await escrow.connect(otherDev).makeSubmission(0, PR + 1n);

      await escrow.connect(relayer).verifySubmission(0, true);
      const tx = escrow.connect(relayer).verifySubmission(1, true);
      await expect(tx).to.emit(escrow, "SubmissionVerified").withArgs(1, false);
      await expect(tx).to.changeEtherBalances([escrow, otherDev], [0, 0]);

      expect((await escrow.getBounty(0)).status).to.equal(Status.Paid);
      expect((await escrow.getSubmission(1)).verified).to.equal(false);
    });

    it("refuses new submissions after payout", async function () {
      const { escrow, dev, otherDev, relayer } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);
      await escrow.connect(relayer).verifySubmission(0, true);
      await expect(escrow.connect(otherDev).makeSubmission(0, PR + 1n)).to.be.revertedWithCustomError(escrow, "BountyAlreadyPaid");
    });

    it("can only be called by the relayer", async function () {
      const { escrow, dev, stranger } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);
      await expect(escrow.connect(stranger).verifySubmission(0, true)).to.be.revertedWithCustomError(escrow, "NotRelayer");
      await expect(escrow.connect(dev).verifySubmission(0, true)).to.be.revertedWithCustomError(escrow, "NotRelayer");
    });

    it("is disabled entirely when the relayer is unset", async function () {
      const { escrow, dev, relayer } = await loadFixture(bountyFixture);
      await escrow.setRelayer(ethers.ZeroAddress);
      await escrow.connect(dev).makeSubmission(0, PR);
      await expect(escrow.connect(relayer).verifySubmission(0, true)).to.be.revertedWithCustomError(escrow, "NotRelayer");
    });

    it("rejects double resolution and unknown submissions", async function () {
      const { escrow, dev, relayer } = await loadFixture(bountyFixture);
      await escrow.connect(dev).makeSubmission(0, PR);
      await escrow.connect(relayer).verifySubmission(0, false);
      await expect(escrow.connect(relayer).verifySubmission(0, true)).to.be.revertedWithCustomError(escrow, "AlreadyResolved");
      await expect(escrow.connect(relayer).verifySubmission(9, true)).to.be.revertedWithCustomError(escrow, "SubmissionNotFound");
    });
  });

  describe("Chainlink Functions path", function () {
    async function submitWithRequest(ctx) {
      const tx = await ctx.escrow.connect(ctx.dev).makeSubmission(0, PR);
      const requestId = await ctx.router.lastRequestId();
      return { tx, requestId };
    }

    it("sends a request carrying the bounty and submission as args", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { tx, requestId } = await submitWithRequest(ctx);

      await expect(tx).to.emit(ctx.escrow, "VerificationRequested").withArgs(0, requestId);
      expect(await ctx.escrow.submissionRequestId(0)).to.equal(requestId);

      const req = await ctx.router.requests(requestId);
      expect(req.client).to.equal(await ctx.escrow.getAddress());
      expect(req.subscriptionId).to.equal(42);
      expect(req.callbackGasLimit).to.equal(300_000);
      expect(req.donId).to.equal(DON_ID);

      const data = req.data.toLowerCase();
      for (const s of [SOURCE, REPO, ISSUE.toString(), PR.toString(), ctx.dev.address.toLowerCase()]) {
        expect(data).to.include(ethers.hexlify(ethers.toUtf8Bytes(s)).slice(2));
      }
    });

    it("includes DON-hosted secrets once configured", async function () {
      const ctx = await loadFixture(functionsFixture);
      await ctx.escrow.setSecrets(0, 1_700_000_000);
      const { requestId } = await submitWithRequest(ctx);
      const data = (await ctx.router.requests(requestId)).data;
      expect(data).to.include(ethers.hexlify(ethers.toUtf8Bytes("secretsLocation")).slice(2));
    });

    it("pays out when the DON reports every check passed", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { requestId } = await submitWithRequest(ctx);

      const tx = ctx.router.fulfill(requestId, encodeChecks(ALL_CHECKS), "0x");
      await expect(tx)
        .to.emit(ctx.router, "RequestFulfilled")
        .withArgs(requestId, true)
        .and.to.emit(ctx.escrow, "BountyPaid")
        .withArgs(0, ctx.dev.address, BOUNTY);
      await expect(tx).to.changeEtherBalances([ctx.escrow, ctx.dev], [-BOUNTY, BOUNTY]);

      expect((await ctx.escrow.getBounty(0)).status).to.equal(Status.Paid);
      expect(await ctx.escrow.submissionChecks(0)).to.equal(ALL_CHECKS);
    });

    it("rejects when any single check fails", async function () {
      const ctx = await loadFixture(functionsFixture);
      for (let bit = 0; bit < 6; bit++) {
        const tx = await ctx.escrow.connect(ctx.dev).makeSubmission(0, PR);
        const requestId = await ctx.router.lastRequestId();
        const mask = ALL_CHECKS & ~(1 << bit);
        const submissionId = (await ctx.escrow.submissionCount()) - 1n;

        await expect(ctx.router.fulfill(requestId, encodeChecks(mask), "0x"))
          .to.emit(ctx.escrow, "SubmissionVerified")
          .withArgs(submissionId, false);
        expect(await ctx.escrow.submissionChecks(submissionId)).to.equal(mask);
        expect((await ctx.escrow.getBounty(0)).status).to.equal(Status.Open);
        await tx.wait();
      }
      expect(await ethers.provider.getBalance(await ctx.escrow.getAddress())).to.equal(BOUNTY);
    });

    it("ignores bits outside the known checks", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { requestId } = await submitWithRequest(ctx);
      await expect(ctx.router.fulfill(requestId, encodeChecks(0xff), "0x")).to.emit(ctx.escrow, "BountyPaid");
      expect(await ctx.escrow.submissionChecks(0)).to.equal(ALL_CHECKS);
    });

    it("treats a DON error as a rejection", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { requestId } = await submitWithRequest(ctx);
      const err = ethers.hexlify(ethers.toUtf8Bytes("GitHub PR request failed"));

      await expect(ctx.router.fulfill(requestId, "0x", err))
        .to.emit(ctx.escrow, "OracleError")
        .withArgs(0, err)
        .and.to.emit(ctx.escrow, "SubmissionVerified")
        .withArgs(0, false);
      expect((await ctx.escrow.getBounty(0)).status).to.equal(Status.Open);
    });

    it("treats a malformed response as a rejection", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { requestId } = await submitWithRequest(ctx);
      await expect(ctx.router.fulfill(requestId, "0x3f", "0x")).to.emit(ctx.escrow, "SubmissionVerified").withArgs(0, false);
    });

    it("ignores a late fulfillment once the relayer has resolved the submission", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { requestId } = await submitWithRequest(ctx);
      await ctx.escrow.connect(ctx.relayer).verifySubmission(0, false);

      await expect(ctx.router.fulfill(requestId, encodeChecks(ALL_CHECKS), "0x"))
        .to.emit(ctx.router, "RequestFulfilled")
        .withArgs(requestId, true)
        .and.not.to.emit(ctx.escrow, "BountyPaid");
    });

    it("only accepts fulfillments from the router", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { requestId } = await submitWithRequest(ctx);
      await expect(
        ctx.escrow.connect(ctx.stranger).handleOracleFulfillment(requestId, encodeChecks(ALL_CHECKS), "0x"),
      ).to.be.revertedWithCustomError(ctx.escrow, "OnlyRouterCanFulfill");
    });

    it("settles a payout well within the callback gas limit", async function () {
      const ctx = await loadFixture(functionsFixture);
      const { requestId } = await submitWithRequest(ctx);
      const tx = await ctx.router.fulfill(requestId, encodeChecks(ALL_CHECKS), "0x");
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lessThan(300_000n);
    });
  });

  describe("payout safety", function () {
    async function hostileFixture() {
      const ctx = await bountyFixture();
      const receiver = await ethers.deployContract("HostileReceiver", [await ctx.escrow.getAddress()]);
      return { ...ctx, receiver };
    }

    it("defers payment to a wallet that rejects ETH, then lets it withdraw", async function () {
      const { escrow, receiver, relayer } = await loadFixture(hostileFixture);
      await receiver.setMode(1); // Reject
      await receiver.submit(0, PR);

      await expect(escrow.connect(relayer).verifySubmission(0, true))
        .to.emit(escrow, "PayoutDeferred")
        .withArgs(0, await receiver.getAddress(), BOUNTY)
        .and.to.emit(escrow, "BountyPaid");
      expect(await escrow.pendingWithdrawals(await receiver.getAddress())).to.equal(BOUNTY);
      expect((await escrow.getBounty(0)).status).to.equal(Status.Paid);

      await receiver.setMode(0); // Accept
      await expect(receiver.withdrawFromEscrow()).to.changeEtherBalances([escrow, receiver], [-BOUNTY, BOUNTY]);
      expect(await escrow.pendingWithdrawals(await receiver.getAddress())).to.equal(0);
    });

    it("blocks re-entrancy from the payout receiver", async function () {
      const { escrow, receiver, relayer } = await loadFixture(hostileFixture);
      await receiver.setMode(2); // Reenter
      await receiver.submit(0, PR);

      // The re-entrant withdraw() hits the guard, the transfer fails and is deferred.
      await expect(escrow.connect(relayer).verifySubmission(0, true)).to.emit(escrow, "PayoutDeferred");
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(BOUNTY);

      await receiver.setMode(0);
      await receiver.withdrawFromEscrow();
      expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0);
    });

    it("does not let the Chainlink callback revert on a hostile receiver", async function () {
      const ctx = await loadFixture(hostileFixture);
      await ctx.escrow.setFunctionsConfig(DON_ID, 42, 300_000, SOURCE);
      await ctx.receiver.setMode(1);
      await ctx.receiver.submit(0, PR);
      const requestId = await ctx.router.lastRequestId();

      await expect(ctx.router.fulfill(requestId, encodeChecks(ALL_CHECKS), "0x"))
        .to.emit(ctx.router, "RequestFulfilled")
        .withArgs(requestId, true);
      expect(await ctx.escrow.pendingWithdrawals(await ctx.receiver.getAddress())).to.equal(BOUNTY);
    });

    it("reverts withdraw with nothing owed", async function () {
      const { escrow, stranger } = await loadFixture(bountyFixture);
      await expect(escrow.connect(stranger).withdraw()).to.be.revertedWithCustomError(escrow, "NothingToWithdraw");
    });
  });

  describe("admin", function () {
    it("restricts configuration to the owner", async function () {
      const { escrow, stranger } = await loadFixture(deployFixture);
      await expect(escrow.connect(stranger).setRelayer(stranger.address)).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
      await expect(escrow.connect(stranger).setFunctionsConfig(DON_ID, 1, 1, SOURCE)).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
      await expect(escrow.connect(stranger).setSecrets(0, 1)).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("enables Functions only with both a subscription and a source", async function () {
      const { escrow } = await loadFixture(deployFixture);
      await escrow.setFunctionsConfig(DON_ID, 0, 300_000, SOURCE);
      expect(await escrow.isFunctionsConfigured()).to.equal(false);
      await escrow.setFunctionsConfig(DON_ID, 1, 300_000, "");
      expect(await escrow.isFunctionsConfigured()).to.equal(false);
      await expect(escrow.setFunctionsConfig(DON_ID, 1, 300_000, SOURCE))
        .to.emit(escrow, "FunctionsConfigUpdated")
        .withArgs(DON_ID, 1, 300_000);
      expect(await escrow.isFunctionsConfigured()).to.equal(true);
      expect(await escrow.functionsSource()).to.equal(SOURCE);
    });

    it("updates the relayer", async function () {
      const { escrow, stranger } = await loadFixture(deployFixture);
      await expect(escrow.setRelayer(stranger.address)).to.emit(escrow, "RelayerUpdated").withArgs(stranger.address);
      expect(await escrow.relayer()).to.equal(stranger.address);
    });
  });
});
