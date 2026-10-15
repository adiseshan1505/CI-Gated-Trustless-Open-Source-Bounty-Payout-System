const { test } = require("node:test");
const assert = require("node:assert/strict");
const { runSource, ALL_CHECKS } = require("../lib/run-source");

const REPO = "adiseshan1505/demo-target";
const DEV = "0xb0b0000000000000000000000000000000000002";
const BOUNTY_CREATED = Date.parse("2026-10-01T00:00:00Z") / 1000;
const SUBMITTED = Date.parse("2026-10-10T00:00:00Z") / 1000;
const ARGS = [REPO, 12, 34, DEV, BOUNTY_CREATED, SUBMITTED];

const passingRun = (name) => ({ name, status: "completed", conclusion: "success", app: { slug: "github-actions" } });

function github(overrides = {}) {
  const state = {
    pr: {
      created_at: "2026-10-05T12:00:00Z",
      body: `Fixes the parser.\n\nCloses #12\n\nWallet: ${DEV}`,
      base: { repo: { full_name: REPO } },
      head: { sha: "abc123" },
      changed_files: 2,
    },
    checkRuns: ["protect-tests", "gitleaks", "trivy", "tests"].map(passingRun),
    files: [{ filename: "src/parser.js" }, { filename: "README.md" }],
    status: {},
    ...overrides,
  };
  const calls = [];
  async function makeHttpRequest({ url, headers }) {
    calls.push({ url, headers });
    const path = url.replace(`https://api.github.com/repos/${REPO}`, "");
    const respond = (key, data) =>
      state.status[key] ? { error: true, message: "boom", response: { status: state.status[key] } } : { error: false, data };
    if (path === "/pulls/34") return respond("pr", state.pr);
    if (path.startsWith("/commits/abc123/check-runs")) return respond("checks", { check_runs: state.checkRuns });
    if (path.startsWith("/pulls/34/files")) return respond("files", state.files);
    return { error: true, message: "not found", response: { status: 404 } };
  }
  return { makeHttpRequest, calls, state };
}

const run = (gh, extra = {}) => runSource({ args: ARGS, makeHttpRequest: gh.makeHttpRequest, ...extra });

test("passes every check for a clean, linked, green PR", async () => {
  const result = await run(github());
  assert.equal(result.checks, ALL_CHECKS);
  assert.equal(result.passed, true);
});

test("only calls the GitHub API of the funded repo", async () => {
  const gh = github();
  await run(gh);
  assert.equal(gh.calls.length, 3);
  for (const { url } of gh.calls) assert.ok(url.startsWith(`https://api.github.com/repos/${REPO}/`), url);
});

test("sends the GitHub token only when a secret is provided", async () => {
  const anon = github();
  await run(anon);
  assert.equal(anon.calls[0].headers.Authorization, undefined);
  assert.ok(anon.calls[0].headers["User-Agent"], "GitHub requires a User-Agent");

  const authed = github();
  await run(authed, { secrets: { githubToken: "ghp_test" } });
  assert.equal(authed.calls[0].headers.Authorization, "Bearer ghp_test");
});

test("prDate: fails for a PR opened before the bounty", async () => {
  const gh = github();
  gh.state.pr.created_at = "2026-09-01T00:00:00Z";
  const { detail, passed } = await run(gh);
  assert.equal(detail.prDate, false);
  assert.equal(passed, false);
});

test("prDate: fails for a PR opened after the submission", async () => {
  const gh = github();
  gh.state.pr.created_at = "2026-10-11T00:00:00Z";
  assert.equal((await run(gh)).detail.prDate, false);
});

test("destRepo: fails when the PR base is a different repo", async () => {
  const gh = github();
  gh.state.pr.base.repo.full_name = "attacker/fork";
  assert.equal((await run(gh)).detail.destRepo, false);
});

test("destRepo: repo comparison is case-insensitive", async () => {
  const gh = github();
  gh.state.pr.base.repo.full_name = REPO.toUpperCase();
  assert.equal((await run(gh)).detail.destRepo, true);
});

test("walletMatch: fails when the PR names another wallet", async () => {
  const gh = github();
  gh.state.pr.body = "Closes #12\nWallet: 0xc0ffee0000000000000000000000000000000003";
  assert.equal((await run(gh)).detail.walletMatch, false);
});

test("walletMatch: fails when the PR has no wallet line", async () => {
  const gh = github();
  gh.state.pr.body = "Closes #12";
  assert.equal((await run(gh)).detail.walletMatch, false);
});

test("walletMatch: accepts a checksummed address in backticks", async () => {
  const gh = github();
  gh.state.pr.body = "Closes #12\nWallet: `0xB0B0000000000000000000000000000000000002`";
  assert.equal((await run(gh)).detail.walletMatch, true);
});

test("walletMatch: tolerates a null PR body", async () => {
  const gh = github();
  gh.state.pr.body = null;
  const { detail } = await run(gh);
  assert.equal(detail.walletMatch, false);
  assert.equal(detail.issueLinked, false);
});

test("issueLinked: accepts GitHub closing keywords", async () => {
  for (const phrase of ["closes #12", "Fixes #12", "resolved #12", "Fix: #12"]) {
    const gh = github();
    gh.state.pr.body = `${phrase}\nWallet: ${DEV}`;
    assert.equal((await run(gh)).detail.issueLinked, true, phrase);
  }
});

test("issueLinked: rejects other issues and bare mentions", async () => {
  for (const phrase of ["Closes #123", "Closes #1", "see #12", "related to #12"]) {
    const gh = github();
    gh.state.pr.body = `${phrase}\nWallet: ${DEV}`;
    assert.equal((await run(gh)).detail.issueLinked, false, phrase);
  }
});

test("ciPassed: fails when a required job is missing", async () => {
  const gh = github();
  gh.state.checkRuns = gh.state.checkRuns.filter((r) => r.name !== "trivy");
  assert.equal((await run(gh)).detail.ciPassed, false);
});

test("ciPassed: fails when a required job failed or is still running", async () => {
  const failed = github();
  failed.state.checkRuns[1] = { ...failed.state.checkRuns[1], conclusion: "failure" };
  assert.equal((await run(failed)).detail.ciPassed, false);

  const running = github();
  running.state.checkRuns[3] = { ...running.state.checkRuns[3], status: "in_progress", conclusion: null };
  assert.equal((await run(running)).detail.ciPassed, false);
});

test("ciPassed: fails when any extra Actions job failed", async () => {
  const gh = github();
  gh.state.checkRuns.push({ ...passingRun("lint"), conclusion: "failure" });
  assert.equal((await run(gh)).detail.ciPassed, false);
});

test("ciPassed: ignores look-alike check runs from other apps", async () => {
  const gh = github();
  gh.state.checkRuns = gh.state.checkRuns.map((r) => ({ ...r, app: { slug: "some-other-app" } }));
  assert.equal((await run(gh)).detail.ciPassed, false);
});

test("protectedPaths: fails when the PR touches tests/", async () => {
  const gh = github();
  gh.state.files.push({ filename: "tests/parser.test.js" });
  assert.equal((await run(gh)).detail.protectedPaths, false);
});

test("protectedPaths: fails when the PR touches the workflows", async () => {
  const gh = github();
  gh.state.files.push({ filename: ".github/workflows/bounty-verification.yml" });
  assert.equal((await run(gh)).detail.protectedPaths, false);
});

test("protectedPaths: fails when a file is renamed out of tests/", async () => {
  const gh = github();
  gh.state.files.push({ filename: "old/parser.test.js", previous_filename: "tests/parser.test.js" });
  assert.equal((await run(gh)).detail.protectedPaths, false);
});

test("protectedPaths: fails closed for PRs too large to inspect", async () => {
  const gh = github();
  gh.state.pr.changed_files = 101;
  const { detail } = await run(gh);
  assert.equal(detail.protectedPaths, false);
  assert.equal(gh.calls.length, 2);
});

test("throws (so the contract rejects) when GitHub errors", async () => {
  for (const key of ["pr", "checks", "files"]) {
    const gh = github({ status: { [key]: 404 } });
    await assert.rejects(run(gh), /GitHub .* failed: 404/, key);
  }
});
