import { createPublicClient, http, type Address as ViemAddress } from "viem";
import { bountyEscrowAbi } from "./abi";
import { CHAIN, ESCROW_ADDRESS } from "./config";
import { mockStore } from "./mock-store";
import {
  BountyStatus,
  type Address,
  type Bounty,
  type Submission,
} from "./types";

/**
 * Read-source abstraction. `mockSource` is active until the contract is
 * deployed; `onchainSource` reads directly from the escrow contract and
 * derives timestamps from event logs.
 */
export interface ReadSource {
  listBounties(): Promise<Bounty[]>;
  getBounty(id: bigint): Promise<Bounty | null>;
  listSubmissions(bountyId: bigint): Promise<Submission[]>;
  getSubmission(id: bigint): Promise<Submission | null>;
  listSubmissionsByDeveloper(developer: Address): Promise<Submission[]>;
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
  transport: http(),
});

function statusFromNumber(value: number | bigint): BountyStatus {
  const n = Number(value);
  if (n === 1) return BountyStatus.UnderVerification;
  if (n === 2) return BountyStatus.Paid;
  return BountyStatus.Open;
}

/** Fetches block timestamps for a set of unique block numbers. */
async function timestampsFor(blockNumbers: bigint[]): Promise<Map<bigint, bigint>> {
  const unique = [...new Set(blockNumbers.map((b) => b.toString()))].map(BigInt);
  const map = new Map<bigint, bigint>();
  await Promise.all(
    unique.map(async (bn) => {
      try {
        const block = await publicClient.getBlock({ blockNumber: bn });
        map.set(bn, block.timestamp);
      } catch {
        map.set(bn, 0n);
      }
    }),
  );
  return map;
}

export const onchainSource: ReadSource = {
  async listBounties() {
    const count = (await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: bountyEscrowAbi,
      functionName: "bountyCount",
    })) as bigint;

    const logs = await publicClient.getContractEvents({
      address: ESCROW_ADDRESS,
      abi: bountyEscrowAbi,
      eventName: "BountyCreated",
      fromBlock: 0n,
    });
    const createdByBounty = new Map<string, { owner: Address; repo: string; issueNumber: bigint; amount: bigint; blockNumber: bigint }>();
    for (const log of logs) {
      const a = log.args as {
        bountyId?: bigint;
        owner?: Address;
        repo?: string;
        issueNumber?: bigint;
        amount?: bigint;
      };
      if (a.bountyId === undefined) continue;
      createdByBounty.set(a.bountyId.toString(), {
        owner: (a.owner ?? "0x0") as Address,
        repo: a.repo ?? "",
        issueNumber: a.issueNumber ?? 0n,
        amount: a.amount ?? 0n,
        blockNumber: (log.blockNumber ?? 0n) as bigint,
      });
    }
    const ts = await timestampsFor([...createdByBounty.values()].map((v) => v.blockNumber));

    const total = Number(count);
    const bounties: Bounty[] = [];
    for (let i = 0; i < total; i++) {
      const id = BigInt(i);
      const cached = createdByBounty.get(id.toString());
      if (cached) {
        bounties.push({
          id,
          owner: cached.owner,
          repo: cached.repo,
          issueNumber: cached.issueNumber,
          amountWei: cached.amount,
          status: BountyStatus.Open,
          createdAt: ts.get(cached.blockNumber) ?? 0n,
        });
        continue;
      }
      const b = await onchainSource.getBounty(id);
      if (b) bounties.push(b);
    }
    // Overlay live status from the contract.
    const withStatus = await Promise.all(
      bounties.map(async (b) => {
        try {
          const raw = await publicClient.readContract({
            address: ESCROW_ADDRESS,
            abi: bountyEscrowAbi,
            functionName: "getBounty",
            args: [b.id],
          });
          const r = raw as unknown as {
            owner: Address;
            repo: string;
            issueNumber: bigint;
            amount: bigint;
            status: number | bigint;
          };
          return {
            ...b,
            status: statusFromNumber(r.status),
            amountWei: r.amount,
            repo: r.repo,
            issueNumber: r.issueNumber,
          };
        } catch {
          return b;
        }
      }),
    );
    return withStatus.sort((a, b) => Number(b.createdAt - a.createdAt));
  },

  async getBounty(id) {
    try {
      const raw = await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: bountyEscrowAbi,
        functionName: "getBounty",
        args: [id],
      });
      const r = raw as unknown as {
        owner: Address;
        repo: string;
        issueNumber: bigint;
        amount: bigint;
        status: number | bigint;
      };
      const logs = await publicClient.getContractEvents({
        address: ESCROW_ADDRESS,
        abi: bountyEscrowAbi,
        eventName: "BountyCreated",
        args: { bountyId: id },
        fromBlock: 0n,
      });
      const blockNumber = (logs[0]?.blockNumber ?? 0n) as bigint;
      const ts = await timestampsFor([blockNumber]);
      return {
        id,
        owner: r.owner,
        repo: r.repo,
        issueNumber: r.issueNumber,
        amountWei: r.amount,
        status: statusFromNumber(r.status),
        createdAt: ts.get(blockNumber) ?? 0n,
      };
    } catch {
      return null;
    }
  },

  async listSubmissions(bountyId) {
    const logs = await publicClient.getContractEvents({
      address: ESCROW_ADDRESS,
      abi: bountyEscrowAbi,
      eventName: "SubmissionCreated",
      args: { bountyId },
      fromBlock: 0n,
    });
    const ts = await timestampsFor(logs.map((l) => (l.blockNumber ?? 0n) as bigint));
    const submissions: Submission[] = [];
    for (const log of logs) {
      const a = log.args as { submissionId?: bigint; developer?: Address; prNumber?: bigint };
      if (a.submissionId === undefined) continue;
      const verified = await onchainSource.getSubmission(a.submissionId);
      submissions.push(
        verified ?? {
          id: a.submissionId,
          bountyId,
          developer: (a.developer ?? "0x0") as Address,
          prNumber: a.prNumber ?? 0n,
          submittedAt: ts.get((log.blockNumber ?? 0n) as bigint) ?? 0n,
          verified: null,
          paid: false,
        },
      );
    }
    return submissions;
  },

  async getSubmission(id) {
    try {
      const raw = await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: bountyEscrowAbi,
        functionName: "getSubmission",
        args: [id],
      });
      const r = raw as unknown as {
        bountyId: bigint;
        developer: Address;
        prNumber: bigint;
        submittedAt: bigint;
        verified: boolean;
      };
      const [verifiedLogs, paidLogs] = await Promise.all([
        publicClient.getContractEvents({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          eventName: "SubmissionVerified",
          args: { submissionId: id },
          fromBlock: 0n,
        }),
        publicClient.getContractEvents({
          address: ESCROW_ADDRESS,
          abi: bountyEscrowAbi,
          eventName: "BountyPaid",
          args: {},
          fromBlock: 0n,
        }),
      ]);
      const lastVerified = verifiedLogs.at(-1)?.args as { success?: boolean } | undefined;
      const paid = paidLogs.some(
        (l) => (l.args as { bountyId?: bigint }).bountyId === r.bountyId,
      );
      return {
        id,
        bountyId: r.bountyId,
        developer: r.developer,
        prNumber: r.prNumber,
        submittedAt: r.submittedAt,
        verified: lastVerified ? Boolean(lastVerified.success) : null,
        paid,
      };
    } catch {
      return null;
    }
  },

  async listSubmissionsByDeveloper(developer) {
    const logs = await publicClient.getContractEvents({
      address: ESCROW_ADDRESS,
      abi: bountyEscrowAbi,
      eventName: "SubmissionCreated",
      args: { developer: developer as ViemAddress },
      fromBlock: 0n,
    });
    const ts = await timestampsFor(logs.map((l) => (l.blockNumber ?? 0n) as bigint));
    const submissions: Submission[] = [];
    for (const log of logs) {
      const a = log.args as { submissionId?: bigint; bountyId?: bigint; developer?: Address; prNumber?: bigint };
      if (a.submissionId === undefined) continue;
      submissions.push({
        id: a.submissionId,
        bountyId: a.bountyId ?? 0n,
        developer: developer,
        prNumber: a.prNumber ?? 0n,
        submittedAt: ts.get((log.blockNumber ?? 0n) as bigint) ?? 0n,
        verified: null,
        paid: false,
      });
    }
    // Enrich with verified/paid status.
    return Promise.all(
      submissions.map(async (s) => (await onchainSource.getSubmission(s.id)) ?? s),
    );
  },
};
