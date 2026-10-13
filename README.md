# CI-Gated Trustless Open-Source Bounty Payout System

> An automated, trustless escrow that pays open-source contributors in ETH the moment their pull request passes a hardened CI/CD security pipeline — no manual approval, no centralized intermediary.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Status: Design Phase](https://img.shields.io/badge/status-design%20phase-blue)
![Solidity](https://img.shields.io/badge/Solidity-smart%20contracts-363636?logo=solidity)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD-2088FF?logo=githubactions&logoColor=white)
![Chainlink](https://img.shields.io/badge/Chainlink-Functions-375BD2?logo=chainlink&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)

> **Project status:** This repository is currently a **case study / design specification**. It holds the architecture, the threat model and the planned interfaces. The smart contracts, CI workflows, oracle scripts and frontend are not implemented yet (see [Roadmap](#roadmap)).

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
  - [Human Overhead & Delayed Settlement](#a-human-overhead--delayed-settlement)
  - [Security & Verification Vulnerabilities](#b-security--verification-vulnerabilities)
- [Key Goals & Success Criteria](#key-goals--success-criteria)
- [System Architecture](#system-architecture)
  - [Architecture Diagram](#architecture-diagram)
  - [Actors](#actors)
  - [Components](#components)
  - [End-to-End Workflow](#end-to-end-workflow)
  - [Sequence Diagram](#sequence-diagram)
- [Smart Contract Design](#smart-contract-design)
  - [Core Functions](#core-functions)
  - [Bounty & Submission Lifecycle](#bounty--submission-lifecycle)
  - [Proposed Interface](#proposed-interface)
  - [On-Chain Security Considerations](#on-chain-security-considerations)

---

## Overview

Traditional open-source bounty platforms and freelance development workflows depend on:

- **manual human verification** of submitted work,
- **subjective review processes** that can take weeks, and
- **centralized escrow intermediaries** that hold funds and decide on releases.

This adds administrative overhead, delays payment, creates security risks and causes trust friction between repository owners and external contributors.

This project proposes a **programmatic, trustless bounty escrow** that links **Ethereum smart contracts** to an **automated CI/CD security pipeline**:

1. A repository owner **locks ETH** for a GitHub issue in a smart contract.
2. A developer opens a **pull request** from their fork and includes their **wallet address** in it.
3. **GitHub Actions** runs the project's test suite plus secret-leak and vulnerability scans in an **isolated, network-restricted** environment. The `/tests` folder is protected so contributors can't change it.
4. A **Chainlink oracle / relayer** checks the PR metadata and the CI result. Then it reports back on-chain.
5. The contract **releases the bounty straight to the developer's wallet** within seconds of verification.

---

## Problem Statement

### A. Human Overhead & Delayed Settlement

| Problem | Impact |
|---|---|
| **Subjective & slow code reviews** | Maintainers are overloaded, so review queues stretch to several weeks before a bounty payout is approved and processed. |
| **Payment trust friction** | Developers risk late payment or none at all after delivering work. Repository owners risk paying for incomplete or low-quality code. |

### B. Security & Verification Vulnerabilities

Running and paying out automatically for PRs from **untrusted forks** opens several attack vectors:

| Threat | Description |
|---|---|
| **Secret & credential leakage** | Unvetted code in a PR may leak secrets, API keys or credentials into public repositories, by accident or on purpose. |
| **Malicious code injection** | Forked contributions may carry vulnerabilities, malicious dependencies or harmful payloads aimed at the project. |
| **Test suite tampering** | A contributor may alter, bypass or delete existing unit/integration tests so the build passes artificially. |
| **CI environment exploitation** | Unrestricted GitHub Actions workflows can be abused by malicious PR scripts to make outgoing network calls or exfiltrate environment secrets. |

---

## Key Goals & Success Criteria

| Goal | Success criterion |
|---|---|
| **100% automated execution** | Standard bounty payouts need no human approval once the tests and security checks pass (**exit code `0`**). |
| **Zero-trust code assurance** | Secret leaks, malicious code merges and test-tampering attempts are fully blocked *before* anything runs on-chain. |
| **Instant compensation** | Payout time drops from **weeks to seconds** after verification. |

---

## System Architecture

The system links four building blocks into one automated pipeline: a **Next.js 14 frontend**, **Solidity smart contracts**, a **GitHub Actions CI/CD verification engine** and a **Chainlink oracle / relayer bridge**.

### Architecture Diagram

![System architecture](assets/arch.jpeg)

The same flow, simplified:

```text
[Repo Owner] ---> Deposit Funds & Create Issue ---> [Smart Contract: makeBounty()]
                                                              |
[Developer]  ---> Submit PR with Wallet Address --------------+
                                                              |
                                                              v
                                          [GitHub Actions CI/CD Pipeline]
                                           ├─ Runs Test Suite (Folder Perms Protected)
                                           ├─ Gitleaks Scan (Secret Detection)
                                           └─ Trivy Scan (Vulnerability Scan)
                                                              |
                                                       (Exit Code 0)
                                                              |
                                                              v
 [Smart Contract: payout()] <--- Verified Event <--- [Chainlink Oracle / Relayer]
```

### Actors

| Actor | Owns | Responsibilities |
|---|---|---|
| **Repository Owner** | The original ("OG") repository | Opens a GitHub issue describing the task. Makes sure the repo **already has tests for the new issue** and a GitHub Actions workflow. Funds the bounty by calling `makeBounty()`. |
| **Developer** | A forked repository with their code | Implements the fix in the fork. Opens a PR against the original repo **with their wallet address in it**. Registers the work on-chain by calling `makeSubmission()`. |
| **Chainlink Oracle (Functions)** | Off-chain compute / relayer | Listens for submission events. Checks PR metadata and the GitHub Actions status. Reports the result back to the contract (`verifySubmission()`). |
| **Smart Contract** | Escrowed ETH | Holds the bounty funds, records submissions and releases funds through `payout()` once verification succeeds. |

### Components

| Component | Technology | Role |
|---|---|---|
| **Frontend dApp** | Next.js 14 + wallet connection (e.g. wagmi / ethers.js) | Lets owners create and fund bounties, lets developers submit PRs and wallet addresses, and shows bounty and payout status. |
| **Escrow contract** | Solidity on an EVM chain | Holds ETH per bounty and runs `makeBounty()`, `makeSubmission()`, `verifySubmission()` and `payout()`. |
| **Verification engine** | GitHub Actions | Runs the protected test suite, a **Gitleaks** secret scan and a **Trivy** vulnerability scan in an isolated runner with outbound network traffic blocked. |
| **Oracle / relayer bridge** | Chainlink Functions | Reads PR and CI data from the GitHub API, checks it against the on-chain submission and calls back into the contract. |

### End-to-End Workflow

1. **Issue creation:** The repo owner opens a GitHub issue that describes the task. The test cases that define "done" for this issue are already committed in the protected `/tests` directory.
2. **Bounty funding:** The owner calls `makeBounty()` with ETH attached. The funds are locked in escrow and tied to the repo and issue.
3. **Development:** The developer forks the repo and implements the change.
4. **Pull request:** The developer opens a PR against the original repo and **puts their wallet address in the PR**.
5. **On-chain submission:** The developer calls `makeSubmission()` with the bounty ID and the PR reference. The contract records the submission and **emits an event**.
6. **CI verification:** The PR triggers the GitHub Actions workflow on the **source repository**. It runs these checks:
   - every test case (with `/tests` protected against changes),
   - a **Gitleaks** scan for leaked credentials,
   - a **Trivy** scan for vulnerabilities and malicious packages,
   - all inside a runner with **outgoing network traffic blocked** and **no real API keys**.
7. **Oracle check:** The event triggers the Chainlink Functions oracle. It checks four things:
   - the **PR date** (submitted inside the bounty window),
   - the **PR destination repo** (it targets the funded repository),
   - the **wallet address in the PR** matches the `msg.sender` of `makeSubmission()`,
   - the **GitHub Action status** (every job passed with exit code `0`).
8. **Verification:** If every check passes, the oracle calls `verifySubmission()` on the contract.
9. **Payout:** `verifySubmission()` calls `payout()`, which sends the escrowed ETH **straight to the developer's wallet**.

### Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Repo Owner
    actor Dev as Developer
    participant SC as Bounty Escrow Contract
    participant GH as GitHub (Repo + Actions)
    participant OR as Chainlink Functions Oracle

    Owner->>GH: Create issue (tests already in /tests)
    Owner->>SC: makeBounty(repo, issue) + ETH
    SC-->>Owner: BountyCreated(bountyId)

    Dev->>GH: Fork repo, push fix, open PR (incl. wallet address)
    Dev->>SC: makeSubmission(bountyId, prRef)
    SC-->>OR: SubmissionCreated event

    GH->>GH: Run tests, Gitleaks and Trivy (network isolated)

    OR->>GH: Fetch PR metadata and Action status
    OR->>OR: Check date, destination repo, wallet == msg.sender, CI passed
    OR->>SC: verifySubmission(submissionId, result)
    SC->>SC: payout()
    SC-->>Dev: Transfer bounty ETH
```

---

## Smart Contract Design

The escrow contract is the **single source of truth** for bounty funds. It never trusts the developer's claims on their own: funds move only after the authorised oracle confirms them.

### Core Functions

| Function | Caller | Description |
|---|---|---|
| `makeBounty()` | Repo owner | Creates a bounty for a GitHub repo + issue and **locks the ETH sent** (`msg.value`) in escrow. Emits `BountyCreated`. |
| `makeSubmission()` | Developer | Registers a PR against an open bounty. The caller's address (`msg.sender`) is recorded as the payout address the oracle checks against. Emits `SubmissionCreated`, which triggers the oracle. |
| `verifySubmission()` | Chainlink oracle only | Receives the oracle's verdict. If the submission is valid, marks it verified and calls `payout()`; otherwise marks it rejected. |
| `payout()` | Internal (from `verifySubmission()`) | Transfers the escrowed ETH to the verified developer's wallet and closes the bounty. Emits `BountyPaid`. |

### Bounty & Submission Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Open: makeBounty() + ETH
    Open --> UnderVerification: makeSubmission()
    UnderVerification --> Open: verifySubmission() → rejected
    UnderVerification --> Paid: verifySubmission() → verified → payout()
    Paid --> [*]
```

| State | Meaning |
|---|---|
| **Open** | Funded and accepting submissions. |
| **UnderVerification** | A submission has been registered and the oracle is checking it. |
| **Paid** | A submission was verified and the ETH went to the developer. This state is final. |

### Proposed Interface

> Illustrative only. The final signatures may change during implementation.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBountyEscrow {
    enum BountyStatus { Open, UnderVerification, Paid }

    struct Bounty {
        address owner;          // repo owner who funded the bounty
        string  repo;           // e.g. "org/project"
        uint256 issueNumber;    // GitHub issue the bounty is attached to
        uint256 amount;         // escrowed wei
        BountyStatus status;
    }

    struct Submission {
        uint256 bountyId;
        address developer;      // msg.sender of makeSubmission(), the payout address
        uint256 prNumber;       // pull request against `repo`
        uint256 submittedAt;
        bool    verified;
    }

    event BountyCreated(uint256 indexed bountyId, address indexed owner, string repo, uint256 issueNumber, uint256 amount);
    event SubmissionCreated(uint256 indexed submissionId, uint256 indexed bountyId, address indexed developer, uint256 prNumber);
    event SubmissionVerified(uint256 indexed submissionId, bool success);
    event BountyPaid(uint256 indexed bountyId, address indexed developer, uint256 amount);

    /// Repo owner locks ETH for a GitHub issue.
    function makeBounty(string calldata repo, uint256 issueNumber) external payable returns (uint256 bountyId);

    /// Developer registers a PR; triggers the off-chain oracle request.
    function makeSubmission(uint256 bountyId, uint256 prNumber) external returns (uint256 submissionId);

    /// Oracle callback carrying the verification result. Restricted to the oracle.
    function verifySubmission(uint256 submissionId, bool success) external;
}
```

### On-Chain Security Considerations

| Concern | Mitigation |
|---|---|
| **Unauthorised verification** | `verifySubmission()` accepts calls **only from the configured Chainlink oracle / router address** (an `onlyOracle` check). |
| **Re-entrancy on payout** | Follow checks-effects-interactions: set the state to `Paid` **before** transferring ETH. Add a `nonReentrant` guard. |
| **Double payout** | A bounty in the `Paid` state can't be verified or paid again. |
| **Wallet spoofing** | The oracle checks that the wallet address written in the PR equals the `msg.sender` that called `makeSubmission()`. Nobody can claim someone else's PR. |
| **Stale or replayed submissions** | The oracle checks the PR date against when the bounty was created and when the submission was made. |
| **Failed ETH transfers** | Use `call{value: ...}` and check the return value, or a pull-payment withdrawal pattern as a fallback. |
