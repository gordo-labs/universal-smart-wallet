// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {RecoveryHarness} from '../src/RecoveryHarness.sol';

contract RecoveryHarnessTest {
    function test_threshold_timelock_and_stable_identity() public {
        address[] memory guardians = new address[](2);
        guardians[0] = address(0xA);
        guardians[1] = address(0xB);
        RecoveryHarness recovery = new RecoveryHarness(address(0xCAFE), address(0x1), guardians, 2, 3);
        bytes32 id = recovery.propose(address(0x2));
        (bool unauthorized,) = address(recovery).call(abi.encodeWithSelector(recovery.approve.selector, id));
        require(!unauthorized, 'unauthorized guardian bypass');
        (bool early,) = address(recovery).call(abi.encodeWithSelector(recovery.execute.selector, id));
        require(!early, 'threshold bypass');
        require(recovery.accountIdentity() == address(0xCAFE), 'stable identity changed');
    }
}
