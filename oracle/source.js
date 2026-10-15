// Chainlink Functions source: verifies a bounty submission against GitHub.
// Executed by the DON for every BountyEscrow.makeSubmission(); also run locally
// by relayer.js and simulate.js. Stored on-chain, so keep it self-contained.
//
// args:    [repo, issueNumber, prNumber, developer, bountyCreatedAt, submittedAt]
// secrets: githubToken (optional, raises the GitHub API rate limit)
// returns: uint256 bitmask of passed checks (see CHECK below / BountyEscrow.CHECK_*)

const CHECK = {
  prDate: 1, // PR opened inside the bounty window
  destRepo: 2, // PR targets the funded repo
  walletMatch: 4, // wallet in PR body == makeSubmission() msg.sender
  ciPassed: 8, // every required GitHub Actions job concluded "success"
  issueLinked: 16, // PR body closes the bounty's issue
  protectedPaths: 32, // PR does not touch tests/ or .github/
};
// Job names of .github/workflows/bounty-verification.yml in the target repo.
const REQUIRED_JOBS = ["protect-tests", "gitleaks", "trivy", "tests"];
const PROTECTED_PREFIXES = ["tests/", ".github/"];
const MAX_FILES = 100;

const [repo, issueNumber, prNumber, developer, bountyCreatedAt, submittedAt] = args;

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ci-gated-bounty-oracle", // GitHub rejects API requests without one
};
if (typeof secrets !== "undefined" && secrets.githubToken) {
  headers.Authorization = `Bearer ${secrets.githubToken}`;
}

async function gh(path) {
  const res = await Functions.makeHttpRequest({ url: `https://api.github.com/repos/${repo}${path}`, headers });
  if (res.error) throw Error(`GitHub ${path} failed: ${res.response ? res.response.status : res.message}`);
  return res.data;
}

const pr = await gh(`/pulls/${prNumber}`);
const body = pr.body || "";
let checks = 0;

const openedAt = Math.floor(Date.parse(pr.created_at) / 1000);
if (openedAt >= Number(bountyCreatedAt) && openedAt <= Number(submittedAt)) checks |= CHECK.prDate;

if (pr.base && pr.base.repo && pr.base.repo.full_name.toLowerCase() === repo.toLowerCase()) {
  checks |= CHECK.destRepo;
}

const wallet = body.match(/wallet:\s*`?(0x[0-9a-fA-F]{40})\b/i);
if (wallet && wallet[1].toLowerCase() === developer.toLowerCase()) checks |= CHECK.walletMatch;

if (new RegExp(`\\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\\s*:?\\s+#${issueNumber}\\b`, "i").test(body)) {
  checks |= CHECK.issueLinked;
}

const ci = await gh(`/commits/${pr.head.sha}/check-runs?per_page=100&filter=latest`);
const runs = (ci.check_runs || []).filter((r) => r.app && r.app.slug === "github-actions");
const jobsPassed = REQUIRED_JOBS.every((name) =>
  runs.some((r) => r.name === name && r.status === "completed" && r.conclusion === "success"),
);
const anyFailed = runs.some((r) => ["failure", "cancelled", "timed_out", "action_required"].includes(r.conclusion));
if (jobsPassed && !anyFailed) checks |= CHECK.ciPassed;

if (pr.changed_files <= MAX_FILES) {
  const files = await gh(`/pulls/${prNumber}/files?per_page=${MAX_FILES}`);
  const touchesProtected = files.some((f) =>
    [f.filename, f.previous_filename || ""].some((name) => PROTECTED_PREFIXES.some((p) => name.startsWith(p))),
  );
  if (!touchesProtected) checks |= CHECK.protectedPaths;
}

return Functions.encodeUint256(checks);
