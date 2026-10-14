// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IFunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/interfaces/IFunctionsClient.sol";

/// @notice Minimal stand-in for the Chainlink Functions router, for tests and local demos.
///         Records requests and lets the caller play the DON by fulfilling them.
contract MockFunctionsRouter {
    struct Request {
        address client;
        uint64 subscriptionId;
        uint32 callbackGasLimit;
        bytes32 donId;
        bytes data;
    }

    uint256 private _nonce;
    mapping(bytes32 requestId => Request) public requests;
    bytes32 public lastRequestId;

    event RequestSent(bytes32 indexed requestId, address indexed client);
    event RequestFulfilled(bytes32 indexed requestId, bool callbackSucceeded);

    function sendRequest(
        uint64 subscriptionId,
        bytes calldata data,
        uint16, /* dataVersion */
        uint32 callbackGasLimit,
        bytes32 donId
    ) external returns (bytes32 requestId) {
        requestId = keccak256(abi.encode(msg.sender, ++_nonce));
        requests[requestId] = Request(msg.sender, subscriptionId, callbackGasLimit, donId, data);
        lastRequestId = requestId;
        emit RequestSent(requestId, msg.sender);
    }

    /// @dev Like the real router: calls back with the requested gas limit and does not
    ///      bubble up a reverting callback.
    function fulfill(bytes32 requestId, bytes calldata response, bytes calldata err) external returns (bool ok) {
        Request memory r = requests[requestId];
        require(r.client != address(0), "unknown request");
        delete requests[requestId];
        (ok,) = r.client.call{gas: r.callbackGasLimit}(
            abi.encodeCall(IFunctionsClient.handleOracleFulfillment, (requestId, response, err))
        );
        emit RequestFulfilled(requestId, ok);
    }
}
