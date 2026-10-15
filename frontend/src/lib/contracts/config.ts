import { hardhat, sepolia } from "wagmi/chains";
import type { Chain } from "viem";

/**
 * The frontend is a pure chain client: it reads bounty state from the escrow
 * contract and never calls the GitHub API. GitHub links shown in the UI are
 * composed from the on-chain `repo` / `issueNumber` / `prNumber` fields.
 */

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

/**
 * Chains we support, keyed by chain id. Add new deployments here.
 *
 * Note: viem's `hardhat` chain is chainId 31337 (RPC http://127.0.0.1:8545),
 * which is what `npx hardhat node` serves. viem's `localhost` chain is chainId
 * 1337 — a different network — so it must not be used for a Hardhat node.
 */
const SUPPORTED_CHAINS: Record<number, Chain> = {
  [sepolia.id]: sepolia,
  [hardhat.id]: hardhat,
};

/**
 * Which chain the app targets. Defaults to Sepolia; set
 * `NEXT_PUBLIC_CHAIN_ID=31337` to point at a local Hardhat node (see the
 * README's "Local End-to-End Run" section).
 */
const requestedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? sepolia.id);

export const CHAIN: Chain = SUPPORTED_CHAINS[requestedChainId] ?? sepolia;
export const CHAIN_ID = CHAIN.id;

/** Explorer base URL, or undefined on chains without one (e.g. Hardhat). */
export const EXPLORER_BASE: string | undefined =
  CHAIN.blockExplorers?.default?.url || undefined;

/** Optional custom RPC endpoint; falls back to the chain's public RPC. */
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || undefined;

/** Flip to false (with an address) once the escrow contract is deployed. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  ZERO_ADDRESS) as `0x${string}`;

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

/**
 * Block the escrow was deployed at. Event scans (submissions) start here so
 * they stay inside the range limits of public RPC providers. Leave 0 to scan
 * from genesis (fine for a fresh local Hardhat node).
 */
export const DEPLOY_BLOCK = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK ?? 0);

/**
 * - `mock`: no contract needed; reads/writes use the in-browser mock.
 * - `chain`: real mode with a deployed address; reads/writes hit the chain.
 * - `unconfigured`: real mode but no address set — the UI must not query 0x0.
 */
export const DATA_MODE: "mock" | "chain" | "unconfigured" = USE_MOCKS
  ? "mock"
  : ESCROW_ADDRESS === ZERO_ADDRESS
    ? "unconfigured"
    : "chain";

export const isContractConfigured = DATA_MODE === "chain";
