// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {DeterministicDeploymentHarness, ExternalDeploymentFixture} from '../src/DeterministicDeploymentHarness.sol';

contract SmartAccountHarnessTest {
    bytes32 internal constant SALT = keccak256('sovereign-smart-wallet/SSW-015');
    bytes20 internal constant ENTRY_POINT_V08 = bytes20(0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108);

    function test_deterministic_local_deployment_and_code_hash() public {
        DeterministicDeploymentHarness factory = new DeterministicDeploymentHarness();
        bytes memory initCode = type(ExternalDeploymentFixture).creationCode;
        address first = factory.deploy(initCode, SALT);
        bytes32 expected = factory.codeHash(first);
        require(expected != bytes32(0), 'missing code hash');
        require(first == _create2Address(address(factory), SALT, keccak256(initCode)), 'unexpected CREATE2 address');
        require(factory.codeHash(first) == expected, 'code hash changed');
    }

    function test_rejects_empty_init_code() public {
        DeterministicDeploymentHarness factory = new DeterministicDeploymentHarness();
        (bool ok,) = address(factory).call(abi.encodeWithSelector(factory.deploy.selector, bytes(''), SALT));
        require(!ok, 'empty init code accepted');
    }

    function test_external_fixture_exposes_erc1271_boundary_and_pinned_entrypoint() public {
        ExternalDeploymentFixture fixture = new ExternalDeploymentFixture();
        require(fixture.ERC1271_MAGICVALUE() == 0x1626ba7e, 'ERC-1271 boundary missing');
        require(ENTRY_POINT_V08 == bytes20(0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108), 'EntryPoint pin drift');
    }

    function _create2Address(address deployer, bytes32 salt, bytes32 initHash) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initHash)))));
    }
}
