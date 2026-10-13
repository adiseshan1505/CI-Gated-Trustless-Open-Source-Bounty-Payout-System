import { sepolia } from "wagmi/chains";

/**
 * The frontend is a pure chain client: it reads bounty state from the escrow
 * contract and never calls the GitHub API. GitHub links shown in the UI are
 * composed from the on-chain `repo` / `issueNumber` / `prNumber` fields.
 */

export const CHAIN = sepolia;
export const CHAIN_ID = sepolia.id;
export const EXPLORER_BASE = sepolia.blockExplorers?.default.url;

/** Flip to false once the escrow contract is deployed and an ABI is final. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

export const isContractConfigured =
  !USE_MOCKS && ESCROW_ADDRESS !== "0x0000000000000000000000000000000000000000";
