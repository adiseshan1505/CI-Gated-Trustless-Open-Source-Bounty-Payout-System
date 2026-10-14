// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IBountyEscrow} from "../interfaces/IBountyEscrow.sol";

interface IWithdraw {
    function withdraw() external;
}

/// @notice Test developer wallet that rejects or tries to re-enter on payout.
contract HostileReceiver {
    enum Mode {
        Accept,
        Reject,
        Reenter
    }

    IBountyEscrow public immutable escrow;
    Mode public mode;

    constructor(IBountyEscrow escrow_) {
        escrow = escrow_;
    }

    function setMode(Mode mode_) external {
        mode = mode_;
    }

    function submit(uint256 bountyId, uint256 prNumber) external returns (uint256) {
        return escrow.makeSubmission(bountyId, prNumber);
    }

    function withdrawFromEscrow() external {
        IWithdraw(address(escrow)).withdraw();
    }

    receive() external payable {
        if (mode == Mode.Reject) revert("no thanks");
        if (mode == Mode.Reenter) IWithdraw(address(escrow)).withdraw();
    }
}
