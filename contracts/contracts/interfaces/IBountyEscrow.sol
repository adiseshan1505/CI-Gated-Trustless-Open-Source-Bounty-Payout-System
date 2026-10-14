// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IBountyEscrow
/// @notice Public surface of the CI-gated bounty escrow. The struct layouts and
///         event signatures are consumed by the frontend (frontend/src/lib/contracts/abi.ts),
///         so changing them is a breaking change.
interface IBountyEscrow {
    enum BountyStatus {
        Open,
        UnderVerification,
        Paid
    }

    struct Bounty {
        address owner; // repo owner who funded the bounty
        string repo; // e.g. "org/project"
        uint256 issueNumber; // GitHub issue the bounty is attached to
        uint256 amount; // escrowed wei
        BountyStatus status;
    }

    struct Submission {
        uint256 bountyId;
        address developer; // msg.sender of makeSubmission(), the payout address
        uint256 prNumber; // pull request against `repo`
        uint256 submittedAt;
        bool verified;
    }

    event BountyCreated(
        uint256 indexed bountyId, address indexed owner, string repo, uint256 issueNumber, uint256 amount
    );
    event SubmissionCreated(
        uint256 indexed submissionId, uint256 indexed bountyId, address indexed developer, uint256 prNumber
    );
    event SubmissionVerified(uint256 indexed submissionId, bool success);
    event BountyPaid(uint256 indexed bountyId, address indexed developer, uint256 amount);

    /// Repo owner locks ETH for a GitHub issue.
    function makeBounty(string calldata repo, uint256 issueNumber) external payable returns (uint256 bountyId);

    /// Developer registers a PR; triggers the off-chain oracle request.
    function makeSubmission(uint256 bountyId, uint256 prNumber) external returns (uint256 submissionId);

    /// Relayer callback carrying the verification result. Restricted to the relayer.
    function verifySubmission(uint256 submissionId, bool success) external;

    function getBounty(uint256 bountyId) external view returns (Bounty memory);

    function getSubmission(uint256 submissionId) external view returns (Submission memory);

    function bountyCount() external view returns (uint256);
}
