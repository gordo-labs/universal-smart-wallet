// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {ERC7579CompatibilityHarness, ERC7579ReturningModule, ERC7579RevertingModule, ERC7579ReentrantModule} from '../src/ERC7579CompatibilityHarness.sol';

contract ERC7579CompatibilityTest {
    function test_module_lifecycle_preserves_account_boundary() public {
        ERC7579CompatibilityHarness account = new ERC7579CompatibilityHarness();
        ERC7579ReturningModule module = new ERC7579ReturningModule();
        account.pinModule(address(module), 2, '1.0.0', address(module).codehash);
        account.installModule(address(module));
        (bool ok, bytes memory result) = address(account).call(abi.encodeCall(account.useModule, (address(module), abi.encodeCall(module.ping, (bytes('ok'))))));
        require(ok && result.length > 0, 'module use failed');
        account.uninstallModule(address(module));
        require(!account.installed(address(module)), 'module remained installed');
    }

    function test_reverting_module_cannot_seize_control_and_recovery_is_fail_closed() public {
        ERC7579CompatibilityHarness account = new ERC7579CompatibilityHarness();
        ERC7579RevertingModule module = new ERC7579RevertingModule();
        account.pinModule(address(module), 2, '1.0.0', address(module).codehash);
        account.installModule(address(module));
        (bool ok,) = address(account).call(abi.encodeCall(account.useModule, (address(module), abi.encodeCall(module.ping, (bytes('x'))))));
        require(!ok && account.installed(address(module)), 'reverting module bypassed failure');
        account.recoverUninstall(address(module));
        require(!account.installed(address(module)), 'recovery did not remove module');
    }

    function test_reentrancy_and_code_hash_policy_fail_closed() public {
        ERC7579CompatibilityHarness account = new ERC7579CompatibilityHarness();
        ERC7579ReturningModule module = new ERC7579ReturningModule();
        ERC7579ReentrantModule attacker = new ERC7579ReentrantModule(account);
        (bool unpinned,) = address(account).call(abi.encodeCall(account.installModule, (address(module))));
        require(!unpinned, 'unpinned module accepted');
        account.pinModule(address(attacker), 2, '1.0.0', address(attacker).codehash);
        account.installModule(address(attacker));
        (bool ok,) = address(account).call(abi.encodeCall(account.useModule, (address(attacker), abi.encodeCall(attacker.attack, (address(attacker))))));
        require(!ok && account.installed(address(attacker)), 'reentrant module bypassed guard');
    }
}
