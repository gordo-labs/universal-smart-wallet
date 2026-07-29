// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

contract MonorepoFoundationTest {
    function test_local_harness_is_available() public {
        require(uint256(1) == uint256(1), 'foundation harness failed');
    }
}
