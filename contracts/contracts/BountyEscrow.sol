// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {IBountyEscrow} from "./interfaces/IBountyEscrow.sol";

/// @title BountyEscrow
/// @notice Trustless escrow for open-source bounties. Repo owners lock ETH against a
///         GitHub issue; a developer registers their PR; a Chainlink Functions DON (or
///         an authorised relayer) checks the PR against GitHub and the CI result; when
///         every check passes the escrow pays the developer automatically.
/// @dev Two verification paths share the same settlement logic:
///      1. Chainlink Functions: `makeSubmission` sends a request running oracle/source.js
///         and `fulfillRequest` settles it with a bitmask of passed checks.
///      2. Relayer: an off-chain service (oracle/relayer.js) calls `verifySubmission`.
///      Whichever resolves a submission first wins; the other is ignored.
contract BountyEscrow is IBountyEscrow, FunctionsClient, Ownable, ReentrancyGuard {
    using FunctionsRequest for FunctionsRequest.Request;

    // ---------------------------------------------------------------------
    // Oracle check bits (must match CHECK in oracle/source.js)
    // ---------------------------------------------------------------------

    uint8 public constant CHECK_PR_DATE = 1 << 0; // PR opened inside the bounty window
    uint8 public constant CHECK_DEST_REPO = 1 << 1; // PR targets the funded repo
    uint8 public constant CHECK_WALLET_MATCH = 1 << 2; // wallet in PR body == submitter
    uint8 public constant CHECK_CI_PASSED = 1 << 3; // all required GitHub Actions jobs passed
    uint8 public constant CHECK_ISSUE_LINKED = 1 << 4; // PR closes the bounty's issue
    uint8 public constant CHECK_PROTECTED_PATHS = 1 << 5; // PR does not touch tests/ or .github/
    uint8 public constant ALL_CHECKS = 0x3f;

    /// Gas forwarded to the developer on payout. Bounded so a hostile receiver cannot
    /// exhaust the Chainlink callback gas; failed transfers fall back to `withdraw`.
    uint256 public constant PAYOUT_GAS = 50_000;

    uint256 public constant MAX_REPO_LENGTH = 140;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    Bounty[] private _bounties;
    Submission[] private _submissions;

    mapping(uint256 bountyId => uint256) public bountyCreatedAt;
    mapping(uint256 bountyId => uint256) public pendingSubmissions;
    mapping(uint256 bountyId => mapping(uint256 prNumber => bool)) public prUnderVerification;

    mapping(uint256 submissionId => bool) public isResolved;
    mapping(uint256 submissionId => uint8) public submissionChecks;
    mapping(uint256 submissionId => bytes32) public submissionRequestId;
    mapping(bytes32 requestId => uint256) private _requestToSubmission; // submissionId + 1

    mapping(address developer => uint256) public pendingWithdrawals;

    address public relayer;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit;
    uint8 public secretsSlotId;
    uint64 public secretsVersion;
    string public functionsSource;

    // ---------------------------------------------------------------------
    // Events & errors
    // ---------------------------------------------------------------------

    event VerificationRequested(uint256 indexed submissionId, bytes32 indexed requestId);
    event SubmissionChecks(uint256 indexed submissionId, uint8 checks);
    event OracleError(uint256 indexed submissionId, bytes err);
    event PayoutDeferred(uint256 indexed bountyId, address indexed developer, uint256 amount);
    event Withdrawn(address indexed developer, uint256 amount);
    event RelayerUpdated(address indexed relayer);
    event FunctionsConfigUpdated(bytes32 donId, uint64 subscriptionId, uint32 callbackGasLimit);
    event SecretsUpdated(uint8 slotId, uint64 version);

    error ZeroAmount();
    error InvalidRepo();
    error InvalidNumber();
    error BountyNotFound(uint256 bountyId);
    error SubmissionNotFound(uint256 submissionId);
    error BountyAlreadyPaid(uint256 bountyId);
    error PrAlreadyUnderVerification(uint256 bountyId, uint256 prNumber);
    error AlreadyResolved(uint256 submissionId);
    error NotRelayer();
    error NothingToWithdraw();
    error WithdrawFailed();

    modifier onlyRelayer() {
        if (msg.sender != relayer || relayer == address(0)) revert NotRelayer();
        _;
    }

    /// @param router Chainlink Functions router for the target chain.
    /// @param relayer_ Address allowed to call `verifySubmission` (zero to disable).
    constructor(address router, address relayer_) FunctionsClient(router) Ownable(msg.sender) {
        relayer = relayer_;
        emit RelayerUpdated(relayer_);
    }

    // ---------------------------------------------------------------------
    // Core flow
    // ---------------------------------------------------------------------

    /// @inheritdoc IBountyEscrow
    function makeBounty(string calldata repo, uint256 issueNumber) external payable returns (uint256 bountyId) {
        if (msg.value == 0) revert ZeroAmount();
        if (!_isValidRepo(bytes(repo))) revert InvalidRepo();
        if (issueNumber == 0) revert InvalidNumber();

        bountyId = _bounties.length;
        _bounties.push(
            Bounty({
                owner: msg.sender,
                repo: repo,
                issueNumber: issueNumber,
                amount: msg.value,
                status: BountyStatus.Open
            })
        );
        bountyCreatedAt[bountyId] = block.timestamp;

        emit BountyCreated(bountyId, msg.sender, repo, issueNumber, msg.value);
    }

    /// @inheritdoc IBountyEscrow
    /// @dev Submit only after CI on the PR has finished: the oracle reads the CI result
    ///      once, and a rejected submission can simply be resubmitted.
    function makeSubmission(uint256 bountyId, uint256 prNumber) external returns (uint256 submissionId) {
        if (bountyId >= _bounties.length) revert BountyNotFound(bountyId);
        if (prNumber == 0) revert InvalidNumber();
        Bounty storage bounty = _bounties[bountyId];
        if (bounty.status == BountyStatus.Paid) revert BountyAlreadyPaid(bountyId);
        if (prUnderVerification[bountyId][prNumber]) revert PrAlreadyUnderVerification(bountyId, prNumber);

        submissionId = _submissions.length;
        _submissions.push(
            Submission({
                bountyId: bountyId,
                developer: msg.sender,
                prNumber: prNumber,
                submittedAt: block.timestamp,
                verified: false
            })
        );
        prUnderVerification[bountyId][prNumber] = true;
        pendingSubmissions[bountyId] += 1;
        bounty.status = BountyStatus.UnderVerification;

        emit SubmissionCreated(submissionId, bountyId, msg.sender, prNumber);

        if (isFunctionsConfigured()) {
            bytes32 requestId = _sendVerificationRequest(bounty, submissionId);
            _requestToSubmission[requestId] = submissionId + 1;
            submissionRequestId[submissionId] = requestId;
            emit VerificationRequested(submissionId, requestId);
        }
    }

    /// @inheritdoc IBountyEscrow
    function verifySubmission(uint256 submissionId, bool success) external onlyRelayer {
        _relayerResolve(submissionId, success ? ALL_CHECKS : 0);
    }

    /// @notice Relayer verdict carrying the per-check bitmask from oracle/source.js, so a
    ///         rejection records which checks failed (as the Chainlink path does).
    function verifySubmissionChecks(uint256 submissionId, uint8 checks) external onlyRelayer {
        _relayerResolve(submissionId, checks & ALL_CHECKS);
    }

    /// @notice Claim a payout whose direct transfer failed (e.g. a contract wallet that
    ///         rejected ETH or needed more gas than `PAYOUT_GAS`).
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingWithdrawals[msg.sender] = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert WithdrawFailed();
        emit Withdrawn(msg.sender, amount);
    }

    // ---------------------------------------------------------------------
    // Chainlink Functions
    // ---------------------------------------------------------------------

    /// @dev Must never revert: a reverted fulfillment is lost and the submission
    ///      would stay pending forever.
    function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
        uint256 stored = _requestToSubmission[requestId];
        if (stored == 0) return;
        delete _requestToSubmission[requestId];

        uint256 submissionId = stored - 1;
        if (isResolved[submissionId]) return; // the relayer got there first

        uint8 checks;
        if (err.length > 0 || response.length != 32) {
            emit OracleError(submissionId, err);
        } else {
            checks = uint8(abi.decode(response, (uint256)) & ALL_CHECKS);
        }
        _resolve(submissionId, checks);
    }

    function _sendVerificationRequest(Bounty storage bounty, uint256 submissionId) private returns (bytes32) {
        Submission storage submission = _submissions[submissionId];

        string[] memory args = new string[](6);
        args[0] = bounty.repo;
        args[1] = Strings.toString(bounty.issueNumber);
        args[2] = Strings.toString(submission.prNumber);
        args[3] = Strings.toHexString(submission.developer);
        args[4] = Strings.toString(bountyCreatedAt[submission.bountyId]);
        args[5] = Strings.toString(submission.submittedAt);

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(functionsSource);
        req.setArgs(args);
        if (secretsVersion > 0) req.addDONHostedSecrets(secretsSlotId, secretsVersion);

        return _sendRequest(req.encodeCBOR(), subscriptionId, callbackGasLimit, donId);
    }

    // ---------------------------------------------------------------------
    // Settlement
    // ---------------------------------------------------------------------

    function _relayerResolve(uint256 submissionId, uint8 checks) private {
        if (submissionId >= _submissions.length) revert SubmissionNotFound(submissionId);
        if (isResolved[submissionId]) revert AlreadyResolved(submissionId);
        _resolve(submissionId, checks);
    }

    /// @dev Effects before interactions; the only external call is the payout in `payout`.
    function _resolve(uint256 submissionId, uint8 checks) private nonReentrant {
        Submission storage submission = _submissions[submissionId];
        uint256 bountyId = submission.bountyId;
        Bounty storage bounty = _bounties[bountyId];

        isResolved[submissionId] = true;
        submissionChecks[submissionId] = checks;
        prUnderVerification[bountyId][submission.prNumber] = false;
        pendingSubmissions[bountyId] -= 1;

        bool success = checks == ALL_CHECKS && bounty.status != BountyStatus.Paid;

        emit SubmissionChecks(submissionId, checks);
        emit SubmissionVerified(submissionId, success);

        if (success) {
            submission.verified = true;
            bounty.status = BountyStatus.Paid;
            payout(bountyId, submission.developer);
        } else if (bounty.status != BountyStatus.Paid && pendingSubmissions[bountyId] == 0) {
            bounty.status = BountyStatus.Open;
        }
    }

    /// @dev Push the bounty to the developer; if the transfer fails, credit it for `withdraw`.
    function payout(uint256 bountyId, address developer) private {
        uint256 amount = _bounties[bountyId].amount;

        (bool ok,) = payable(developer).call{value: amount, gas: PAYOUT_GAS}("");
        if (!ok) {
            pendingWithdrawals[developer] += amount;
            emit PayoutDeferred(bountyId, developer, amount);
        }
        emit BountyPaid(bountyId, developer, amount);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setRelayer(address relayer_) external onlyOwner {
        relayer = relayer_;
        emit RelayerUpdated(relayer_);
    }

    /// @param source JavaScript from oracle/source.js; an empty source disables Functions.
    function setFunctionsConfig(bytes32 donId_, uint64 subscriptionId_, uint32 callbackGasLimit_, string calldata source)
        external
        onlyOwner
    {
        donId = donId_;
        subscriptionId = subscriptionId_;
        callbackGasLimit = callbackGasLimit_;
        functionsSource = source;
        emit FunctionsConfigUpdated(donId_, subscriptionId_, callbackGasLimit_);
    }

    /// @notice Point requests at DON-hosted secrets (e.g. a GitHub token); version 0 disables.
    function setSecrets(uint8 slotId, uint64 version) external onlyOwner {
        secretsSlotId = slotId;
        secretsVersion = version;
        emit SecretsUpdated(slotId, version);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IBountyEscrow
    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        if (bountyId >= _bounties.length) revert BountyNotFound(bountyId);
        return _bounties[bountyId];
    }

    /// @inheritdoc IBountyEscrow
    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        if (submissionId >= _submissions.length) revert SubmissionNotFound(submissionId);
        return _submissions[submissionId];
    }

    /// @inheritdoc IBountyEscrow
    function bountyCount() external view returns (uint256) {
        return _bounties.length;
    }

    function submissionCount() external view returns (uint256) {
        return _submissions.length;
    }

    function isFunctionsConfigured() public view returns (bool) {
        return subscriptionId != 0 && bytes(functionsSource).length > 0;
    }

    /// @dev "owner/name": exactly one slash, non-empty halves, GitHub-safe characters only.
    ///      Keeps the repo string safe to splice into GitHub API URLs in the oracle.
    function _isValidRepo(bytes memory repo) private pure returns (bool) {
        uint256 len = repo.length;
        if (len < 3 || len > MAX_REPO_LENGTH) return false;
        uint256 slash = type(uint256).max;
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = repo[i];
            if (c == "/") {
                if (slash != type(uint256).max) return false;
                slash = i;
            } else if (
                !((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c == "-" || c == "_"
                    || c == ".")
            ) {
                return false;
            }
        }
        return slash != 0 && slash != type(uint256).max && slash != len - 1;
    }
}
