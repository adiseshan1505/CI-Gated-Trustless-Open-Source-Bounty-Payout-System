import {
  Boxes,
  CheckCircle2,
  FileLock2,
  GitPullRequest,
  Network,
  ScanEye,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "How it works" };

const FLOW = [
  {
    title: "Owner funds an issue",
    body: "The owner commits tests that define \u201cdone\u201d under /tests, then calls makeBounty() with ETH. Funds are locked in escrow, tied to the repo and issue.",
  },
  {
    title: "Developer opens a PR",
    body: "The developer forks the repo, implements the fix, and opens a pull request \u2014 putting their wallet address in the PR body.",
  },
  {
    title: "Submission registered on-chain",
    body: "The developer calls makeSubmission() with the bounty ID and PR number. The contract records msg.sender as the payout address and emits an event.",
  },
  {
    title: "CI runs, isolated",
    body: "GitHub Actions runs the protected test suite, Gitleaks and Trivy with no outbound network and no production secrets. Payout requires exit code 0 on every job.",
  },
  {
    title: "Oracle verifies",
    body: "Chainlink Functions checks six things \u2014 the PR date, the destination repo, the PR wallet vs msg.sender, the CI result, that the PR closes the issue, and that tests/ and .github/ are untouched \u2014 then reports a 6-bit verdict back on-chain.",
  },
  {
    title: "Automatic payout",
    body: "If valid, verifySubmission() marks the submission and payout() sends the escrowed ETH straight to the developer. Otherwise the bounty reopens.",
  },
];

const CHECKS = [
  { title: "PR opened inside the bounty window", body: "Stops reuse of old or unrelated pull requests." },
  { title: "PR targets the funded repo", body: "Stops pointing the bounty at a repo the attacker controls." },
  { title: "PR wallet equals msg.sender", body: "Ties the PR author to the payout address; blocks claiming someone else's PR." },
  { title: "Every CI job succeeded", body: "protect-tests, gitleaks, trivy and tests all concluded success on the PR's head commit." },
  { title: "PR closes the bounty issue", body: "Stops a PR fixing a different issue from claiming this bounty." },
  { title: "Protected paths untouched", body: "tests/ and .github/ are unchanged, and PRs over 100 files fail closed." },
];

const PIPELINE = [
  { icon: FileLock2, title: "Protected /tests", body: "The workflow fails if a PR adds, modifies or deletes anything under /tests. CODEOWNERS adds a second layer." },
  { icon: ScanEye, title: "Gitleaks", body: "Scans the diff and history for API keys, tokens and credentials. Any finding fails the job." },
  { icon: ShieldCheck, title: "Trivy", body: "Scans the filesystem and dependencies for CVEs, misconfigurations and malicious packages." },
  { icon: Network, title: "Network isolation", body: "Untrusted code runs with egress blocked and a least-privilege, secret-free runner." },
];

const ROLES = [
  { icon: Wallet, role: "Repository owner", body: "Opens the issue, ensures tests exist, funds the escrow with makeBounty().", tone: "text-escrow" },
  { icon: GitPullRequest, role: "Developer", body: "Fixes the issue in a fork, opens a PR with their wallet, registers with makeSubmission().", tone: "text-verify" },
  { icon: Zap, role: "Oracle", body: "Reads PR and CI data, then reports the verdict through verifySubmission().", tone: "text-action" },
];

export default function HowItWorksPage() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl">
        <Badge tone="verify" className="mb-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          Trustless by construction
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          From pull request to payout, with no human in the loop
        </h1>
        <p className="mt-4 text-pretty text-muted">
          A repository owner locks ETH for a GitHub issue. A developer submits a
          pull request. An isolated CI pipeline and an on-chain oracle decide
          the outcome. The contract releases the funds the moment verification
          succeeds.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">
          End-to-end flow
        </h2>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardContent className="space-y-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-sunken text-sm font-semibold text-verify">
                    {i + 1}
                  </span>
                  <h3 className="font-medium text-content">{step.title}</h3>
                  <p className="text-sm text-muted">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-action" />
              What the oracle checks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHECKS.map((c) => (
              <div key={c.title} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verify" />
                <div>
                  <p className="text-sm font-medium text-content">{c.title}</p>
                  <p className="text-sm text-muted">{c.body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileLock2 className="h-4 w-4 text-verify" />
              The security pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {PIPELINE.map((p) => (
              <div key={p.title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neu-sm border border-hairline bg-sunken">
                  <p.icon className="h-4 w-4 text-verify" />
                </span>
                <div>
                  <p className="text-sm font-medium text-content">{p.title}</p>
                  <p className="text-sm text-muted">{p.body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">
          Who does what
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {ROLES.map((r) => (
            <Card key={r.role}>
              <CardContent className="space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-neu-sm border border-hairline bg-sunken">
                  <r.icon className={`h-5 w-5 ${r.tone}`} />
                </span>
                <h3 className="font-medium text-content">{r.role}</h3>
                <p className="text-sm text-muted">{r.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-action" />
              Bounty lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="neu-well p-4">
                <p className="text-sm font-medium text-verify">Open</p>
                <p className="mt-1 text-sm text-muted">
                  Funded and accepting submissions.
                </p>
              </div>
              <div className="neu-well p-4">
                <p className="text-sm font-medium text-escrow">
                  Under verification
                </p>
                <p className="mt-1 text-sm text-muted">
                  A submission is registered and the oracle is checking it.
                </p>
              </div>
              <div className="neu-well p-4">
                <p className="text-sm font-medium text-success">Paid</p>
                <p className="mt-1 text-sm text-muted">
                  Verified and paid out. Final — no double payout.
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-faint">
              A rejected submission returns the bounty to the Open state so it
              can be attempted again.
            </p>
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}
