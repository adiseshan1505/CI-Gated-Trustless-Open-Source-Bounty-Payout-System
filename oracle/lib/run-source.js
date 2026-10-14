const fs = require("node:fs");
const path = require("node:path");

const SOURCE_PATH = path.join(__dirname, "..", "source.js");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const CHECK_NAMES = ["prDate", "destRepo", "walletMatch", "ciPassed", "issueLinked", "protectedPaths"];
const ALL_CHECKS = (1 << CHECK_NAMES.length) - 1;

/** Functions.makeHttpRequest backed by fetch, with the same result shape as the DON. */
async function fetchHttpRequest({ url, method = "GET", headers = {}, timeout = 9000 }) {
  try {
    const res = await fetch(url, { method, headers, signal: AbortSignal.timeout(timeout) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: true, message: res.statusText, response: { status: res.status, data } };
    return { error: false, status: res.status, data };
  } catch (e) {
    return { error: true, message: e.message };
  }
}

/** Mirror of the Chainlink Functions `encodeUint256` helper (32-byte big-endian). */
function encodeUint256(value) {
  const hex = BigInt(value).toString(16).padStart(64, "0");
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

/**
 * Executes oracle/source.js the way the Chainlink Functions DON does.
 * @returns {Promise<{checks: number, passed: boolean, detail: Record<string, boolean>}>}
 */
async function runSource({ args, secrets = {}, makeHttpRequest = fetchHttpRequest, source }) {
  const code = source ?? fs.readFileSync(SOURCE_PATH, "utf8");
  const Functions = { makeHttpRequest, encodeUint256 };
  const bytes = await new AsyncFunction("Functions", "args", "secrets", code)(Functions, args.map(String), secrets);
  const checks = Number(BigInt("0x" + Buffer.from(bytes).toString("hex")));
  return { checks, passed: checks === ALL_CHECKS, detail: describeChecks(checks) };
}

function describeChecks(checks) {
  return Object.fromEntries(CHECK_NAMES.map((name, i) => [name, Boolean(checks & (1 << i))]));
}

module.exports = { runSource, describeChecks, fetchHttpRequest, encodeUint256, SOURCE_PATH, ALL_CHECKS, CHECK_NAMES };
