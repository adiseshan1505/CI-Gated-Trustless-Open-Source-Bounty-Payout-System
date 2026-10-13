import {
  BountyStatus,
  type Address,
  type Bounty,
  type NewBountyInput,
  type NewSubmissionInput,
  type Submission,
} from "./types";

/**
 * In-memory + localStorage mock of the escrow contract so the whole UI is
 * usable before the Solidity contract is deployed. Swapped out by
 * `source.ts` when NEXT_PUBLIC_USE_MOCKS=false.
 */

const STORAGE_KEY = "bounty-escrow-mock-v1";

const DEMO_OWNER = "0xa11ce00000000000000000000000000000000001" as Address;
const DEMO_DEV = "0xb0b0000000000000000000000000000000000002" as Address;
const DEMO_DEV_2 = "0xc0ffee0000000000000000000000000000000003" as Address;

const now = () => Math.floor(Date.now() / 1000);

const ETH = 1_000_000_000_000_000_000n;

function seed(): { bounties: Bounty[]; submissions: Submission[] } {
  const t = now();
  const bounties: Bounty[] = [
    {
      id: 0n,
      owner: DEMO_OWNER,
      repo: "adiseshan1505/ci-bounty-escrow",
      issueNumber: 12n,
      amountWei: ETH / 2n,
      status: BountyStatus.Open,
      createdAt: BigInt(t - 60 * 60 * 24 * 3),
    },
    {
      id: 1n,
      owner: DEMO_OWNER,
      repo: "vercel/next.js",
      issueNumber: 4321n,
      amountWei: (ETH * 12n) / 10n,
      status: BountyStatus.UnderVerification,
      createdAt: BigInt(t - 60 * 60 * 26),
    },
    {
      id: 2n,
      owner: DEMO_OWNER,
      repo: "ethereum/go-ethereum",
      issueNumber: 999n,
      amountWei: ETH * 2n,
      status: BountyStatus.Paid,
      createdAt: BigInt(t - 60 * 60 * 24 * 9),
    },
    {
      id: 3n,
      owner: DEMO_OWNER,
      repo: "opencode-ai/opencode",
      issueNumber: 7n,
      amountWei: ETH / 4n,
      status: BountyStatus.Open,
      createdAt: BigInt(t - 60 * 60 * 8),
    },
    {
      id: 4n,
      owner: DEMO_OWNER,
      repo: "gitleaks/gitleaks",
      issueNumber: 55n,
      amountWei: (ETH * 8n) / 10n,
      status: BountyStatus.Open,
      createdAt: BigInt(t - 60 * 60 * 40),
    },
  ];
  const submissions: Submission[] = [
    {
      id: 0n,
      bountyId: 1n,
      developer: DEMO_DEV,
      prNumber: 4330n,
      submittedAt: BigInt(t - 60 * 45),
      verified: null,
      paid: false,
    },
    {
      id: 1n,
      bountyId: 2n,
      developer: DEMO_DEV_2,
      prNumber: 1001n,
      submittedAt: BigInt(t - 60 * 60 * 24 * 8),
      verified: true,
      paid: true,
    },
  ];
  return { bounties, submissions };
}

type Db = { bounties: Bounty[]; submissions: Submission[] };

const g = globalThis as unknown as { __bountyMockDb?: Db };

function serialise(db: Db) {
  return {
    bounties: db.bounties.map((b) => ({
      ...b,
      id: b.id.toString(),
      issueNumber: b.issueNumber.toString(),
      amountWei: b.amountWei.toString(),
      createdAt: b.createdAt.toString(),
    })),
    submissions: db.submissions.map((s) => ({
      ...s,
      id: s.id.toString(),
      bountyId: s.bountyId.toString(),
      prNumber: s.prNumber.toString(),
      submittedAt: s.submittedAt.toString(),
    })),
  };
}

function deserialise(raw: string): Db | null {
  try {
    const parsed = JSON.parse(raw);
    return {
      bounties: parsed.bounties.map((b: Record<string, string>) => ({
        ...b,
        id: BigInt(b.id),
        issueNumber: BigInt(b.issueNumber),
        amountWei: BigInt(b.amountWei),
        createdAt: BigInt(b.createdAt),
      })),
      submissions: parsed.submissions.map((s: Record<string, string>) => ({
        ...s,
        id: BigInt(s.id),
        bountyId: BigInt(s.bountyId),
        prNumber: BigInt(s.prNumber),
        submittedAt: BigInt(s.submittedAt),
      })),
    };
  } catch {
    return null;
  }
}

function load(): Db {
  if (g.__bountyMockDb) return g.__bountyMockDb;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const db = deserialise(raw);
      if (db) {
        g.__bountyMockDb = db;
        return db;
      }
    }
  }
  g.__bountyMockDb = seed();
  return g.__bountyMockDb;
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialise(g.__bountyMockDb!)));
}

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export const mockStore = {
  async listBounties(): Promise<Bounty[]> {
    await delay(250);
    return [...load().bounties].sort((a, b) => Number(b.createdAt - a.createdAt));
  },

  async getBounty(id: bigint): Promise<Bounty | null> {
    await delay(150);
    return load().bounties.find((b) => b.id === id) ?? null;
  },

  async listSubmissions(bountyId: bigint): Promise<Submission[]> {
    await delay(150);
    return load().submissions.filter((s) => s.bountyId === bountyId);
  },

  async getSubmission(id: bigint): Promise<Submission | null> {
    await delay(150);
    return load().submissions.find((s) => s.id === id) ?? null;
  },

  async listSubmissionsByDeveloper(developer: Address): Promise<Submission[]> {
    await delay(200);
    return load().submissions.filter(
      (s) => s.developer.toLowerCase() === developer.toLowerCase(),
    );
  },

  async createBounty(input: NewBountyInput, owner: Address): Promise<{ bountyId: bigint; hash: string }> {
    await delay(700);
    const db = load();
    const id = BigInt(db.bounties.length);
    db.bounties.push({
      id,
      owner,
      repo: input.repo,
      issueNumber: input.issueNumber,
      amountWei: input.amountWei,
      status: BountyStatus.Open,
      createdAt: BigInt(now()),
    });
    persist();
    return { bountyId: id, hash: fakeHash() };
  },

  async createSubmission(
    input: NewSubmissionInput,
    developer: Address,
  ): Promise<{ submissionId: bigint; hash: string }> {
    await delay(700);
    const db = load();
    const id = BigInt(db.submissions.length);
    db.submissions.push({
      id,
      bountyId: input.bountyId,
      developer,
      prNumber: input.prNumber,
      submittedAt: BigInt(now()),
      verified: null,
      paid: false,
    });
    const bounty = db.bounties.find((b) => b.id === input.bountyId);
    if (bounty) bounty.status = BountyStatus.UnderVerification;
    persist();
    return { submissionId: id, hash: fakeHash() };
  },

  async reset() {
    g.__bountyMockDb = seed();
    persist();
  },
};

function fakeHash(): string {
  const hex = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 64; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}
