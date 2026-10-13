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
