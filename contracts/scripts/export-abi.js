// Writes the compiled BountyEscrow ABI to abi/BountyEscrow.json for the relayer and frontend.
// Run after `hardhat compile` (npm run export-abi does both).
const fs = require("node:fs");
const path = require("node:path");

const artifact = path.join(__dirname, "..", "artifacts", "contracts", "BountyEscrow.sol", "BountyEscrow.json");
const out = path.join(__dirname, "..", "abi", "BountyEscrow.json");

const { contractName, abi } = JSON.parse(fs.readFileSync(artifact, "utf8"));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ contractName, abi }, null, 2) + "\n");
console.log(`wrote ${path.relative(process.cwd(), out)} (${abi.length} entries)`);
