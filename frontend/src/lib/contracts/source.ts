import { createPublicClient, http, type Address as ViemAddress } from "viem";
import { bountyEscrowAbi } from "./abi";
import {
  CHAIN,
  DATA_MODE,
  DEPLOY_BLOCK,
  ESCROW_ADDRESS,
  RPC_URL,
} from "./config";
import { mockStore } from "./mock-store";
import {
  BountyStatus,
  type Address,
  type Bounty,
  type Submission,
} from "./types";

/**
 * Read-source abstraction. `mockSource` is used when NEXT_PUBLIC_USE_MOCKS is
 * not "false"; `onchainSource` reads directly from the deployed escrow contract.
 */
export interface ReadSource {
  listBounties(): Promise<Bounty[]>;
  getBounty(id: bigint): Promise<Bounty | null>;
  listSubmissions(bountyId: bigint): Promise<Submission[]>;
  getSubmission(id: bigint): Promise<Submission | null>;
  listSubmissionsByDeveloper(developer: Address): Promise<Submission[]>;
}

/** Thrown by on-chain reads when real mode is on but no address is configured. */
export class ContractNotConfiguredError extends Error {
  constructor() {
    super(
      "Escrow contract address is not configured. Set NEXT_PUBLIC_ESCROW_ADDRESS (and NEXT_PUBLIC_USE_MOCKS=false).",
    );
    this.name = "ContractNotConfiguredError";
  }
}

function assertConfigured() {
  if (DATA_MODE === "unconfigured") throw new ContractNotConfiguredError();
}

export const mockSource: ReadSource = {
  listBounties: () => mockStore.listBounties(),
  getBounty: (id) => mockStore.getBounty(id),
  listSubmissions: (bountyId) => mockStore.listSubmissions(bountyId),
  getSubmission: (id) => mockStore.getSubmission(id),
  listSubmissionsByDeveloper: (developer) =>
    mockStore.listSubmissionsByDeveloper(developer),
};

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

function statusFromNumber(value: number | bigint): BountyStatus {
  const n = Number(value);
  if (n === 1) return BountyStatus.UnderVerification;
  if (n === 2) return BountyStatus.Paid;
  return BountyStatus.Open;
}

type RawBounty = {
  owner: Address;
  repo: string;
  issueNumber: bigint;
  amount: bigint;
  status: number | bigint;
};

type RawSubmission = {
  bountyId: bigint;
  developer: Address;
  prNumber: bigint;
  submittedAt: bigint;
  verified: boolean;
};

export const onchainSource: ReadSource = {
  async listBounties() {
    assertConfigured();
    const count = (await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: bountyEscrowAbi,
      functionName: "bountyCount",
    })) as bigint;
    if (count === 0n) return [];

    const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));

    // Batch both reads into one JSON-RPC round trip each (EIP-5792 multicall).
    // `deployless: true` runs Multicall3 from embedded bytecode via an eth_call
    // state override, so it works even on chains where Multicall3 isn't deployed
    // (e.g. a fresh `npx hardhat node`) and viem's chain definition has no
    // multicall3 address.
    const [bountyResults, createdResults] = await Promise.all([
      publicClient.multicall({
        deployless: true,
        contracts: ids.map((id) => ({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          functionName: "getBounty" as const,
          args: [id] as const,
        })),
        allowFailure: true,
      }),
      publicClient.multicall({
        deployless: true,
        contracts: ids.map((id) => ({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          functionName: "bountyCreatedAt" as const,
          args: [id] as const,
        })),
        allowFailure: true,
      }),
    ]);

    const bounties: Bounty[] = [];
    for (let i = 0; i < ids.length; i++) {
      const br = bountyResults[i];
      if (br.status !== "success") continue;
      const r = br.result as unknown as RawBounty;
      const cr = createdResults[i];
      const createdAt =
        cr.status === "success" ? (cr.result as bigint) : 0n;
      bounties.push({
        id: ids[i],
        owner: r.owner,
        repo: r.repo,
        issueNumber: r.issueNumber,
        amountWei: r.amount,
        status: statusFromNumber(r.status),
        createdAt,
      });
    }

    return bounties.sort((a, b) => Number(b.createdAt - a.createdAt));
  },

  async getBounty(id) {
    assertConfigured();
    try {
      const [raw, createdAt] = await Promise.all([
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          functionName: "getBounty",
          args: [id],
        }),
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          functionName: "bountyCreatedAt",
          args: [id],
        }),
      ]);
      const r = raw as unknown as RawBounty;
      return {
        id,
        owner: r.owner,
        repo: r.repo,
        issueNumber: r.issueNumber,
        amountWei: r.amount,
        status: statusFromNumber(r.status),
        createdAt: createdAt as bigint,
      };
    } catch {
      return null;
    }
  },

  async listSubmissions(bountyId) {
    assertConfigured();
    const logs = await publicClient.getContractEvents({
      address: ESCROW_ADDRESS,
      abi: bountyEscrowAbi,
      eventName: "SubmissionCreated",
      args: { bountyId },
      fromBlock: DEPLOY_BLOCK,
    });
    const ids = logs
      .map((l) => (l.args as { submissionId?: bigint }).submissionId)
      .filter((v): v is bigint => v !== undefined);

    const submissions = await Promise.all(
      ids.map((id) => onchainSource.getSubmission(id)),
    );
    return submissions.filter((s): s is Submission => s !== null);
  },

  async getSubmission(id) {
    assertConfigured();
    try {
      const [raw, resolved, checksMask] = await Promise.all([
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          functionName: "getSubmission",
          args: [id],
        }),
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          functionName: "isResolved",
          args: [id],
        }),
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          functionName: "submissionChecks",
          args: [id],
        }),
      ]);
      const r = raw as unknown as RawSubmission;
      return {
        id,
        bountyId: r.bountyId,
        developer: r.developer,
        prNumber: r.prNumber,
        submittedAt: r.submittedAt,
        verified: resolved ? r.verified : null,
        resolved: Boolean(resolved),
        checks: Number(checksMask),
        paid: r.verified === true,
      };
    } catch {
      return null;
    }
  },

  async listSubmissionsByDeveloper(developer) {
    assertConfigured();
    const logs = await publicClient.getContractEvents({
      address: ESCROW_ADDRESS,
      abi: bountyEscrowAbi,
      eventName: "SubmissionCreated",
      args: { developer: developer as ViemAddress },
      fromBlock: DEPLOY_BLOCK,
    });
    const ids = logs
      .map((l) => (l.args as { submissionId?: bigint }).submissionId)
      .filter((v): v is bigint => v !== undefined);

    const submissions = await Promise.all(
      ids.map((id) => onchainSource.getSubmission(id)),
    );
    return submissions.filter((s): s is Submission => s !== null);
  },
};
