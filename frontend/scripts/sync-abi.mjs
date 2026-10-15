// Regenerates src/lib/contracts/abi.ts from the compiled Hardhat artifact in
// ../contracts/abi/BountyEscrow.json. Run with `npm run sync-abi` from the
// frontend package (or `npm run export-abi` in contracts first to refresh it).
//
// Keeping the ABI generated means the frontend can never drift from the
// deployed contract: the checked-in TypeScript keeps literal types (via
// `as const`) so wagmi/viem still autocomplete function and event names.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "../../contracts/abi/BountyEscrow.json");
const target = resolve(here, "../src/lib/contracts/abi.ts");

const { contractName, abi } = JSON.parse(readFileSync(source, "utf8"));
if (!Array.isArray(abi)) throw new Error(`${source} has no "abi" array`);

const banner = [
  "// AUTO-GENERATED FILE — do not edit by hand.",
  "// Source: contracts/abi/BountyEscrow.json",
  "// Regenerate with `npm run sync-abi` (from frontend/) after",
  "// `npm run export-abi` (from contracts/).",
  "import type { Abi } from \"viem\";",
  "",
  `/** ${contractName} ABI — mirrors contracts/contracts/interfaces/IBountyEscrow.sol. */`,
].join("\n");

const body = JSON.stringify(abi, null, 2);
const output = `${banner}\nexport const bountyEscrowAbi = ${body} as const satisfies Abi;\n`;

writeFileSync(target, output);
console.log(`wrote ${target} (${abi.length} entries from ${contractName})`);
