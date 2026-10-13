import {
  mockSource,
  onchainSource,
  type ReadSource,
} from "./source";
import { USE_MOCKS } from "./config";

export const source: ReadSource = USE_MOCKS ? mockSource : onchainSource;

export * from "./types";
export * from "./config";
export { bountyEscrowAbi } from "./abi";
export { deriveVerification } from "./verification";
export { publicClient } from "./source";
export { mockStore } from "./mock-store";
