// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {DeterministicDeploymentHarness, ExternalDeploymentFixture, ERC1271BoundaryFixture} from '../src/DeterministicDeploymentHarness.sol';

contract SmartAccountHarnessTest {
    bytes32 internal constant SALT = keccak256('universal-smart-wallet/SSW-015');
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

    function test_erc1271_accepts_only_the_expected_digest_and_signature() public {
        bytes32 digest = keccak256('local-passkey-operation');
        ERC1271BoundaryFixture account = new ERC1271BoundaryFixture(digest);
        bytes memory validSignature = abi.encode(digest);
        require(account.isValidSignature(digest, validSignature) == 0x1626ba7e, 'valid ERC-1271 signature rejected');
        require(account.isValidSignature(keccak256('wrong'), validSignature) == 0xffffffff, 'wrong digest accepted');
        require(account.isValidSignature(digest, abi.encode(keccak256('wrong'))) == 0xffffffff, 'wrong signature accepted');
    }

    function _create2Address(address deployer, bytes32 salt, bytes32 initHash) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initHash)))));
    }
}
