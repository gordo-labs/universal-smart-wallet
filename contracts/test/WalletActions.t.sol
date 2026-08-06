// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WalletActionsHarness {
    bool public executed;
    function executeBatch(bool[] calldata outcomes) external {
        for (uint256 i; i < outcomes.length; ++i) require(outcomes[i], "ACTION_REVERTED");
        executed = true;
    }
}

contract WalletActionsTest {
    WalletActionsHarness private harness;
    function setUp() public { harness = new WalletActionsHarness(); }
    function testBatchIsAtomicOnRevert() public {
        setUp();
        bool[] memory outcomes = new bool[](2); outcomes[0] = true; outcomes[1] = false;
        (bool ok,) = address(harness).call(abi.encodeCall(WalletActionsHarness.executeBatch, (outcomes)));
        require(!ok, "expected revert"); require(!harness.executed(), "partial batch executed");
    }
    function testBatchSucceedsWhenAllSimulate() public {
        setUp(); bool[] memory outcomes = new bool[](2); outcomes[0] = true; outcomes[1] = true;
        harness.executeBatch(outcomes); require(harness.executed(), "batch not executed");
    }
}
