// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @dev Test-only deployment primitive; the account implementation remains an
/// external Safe deployment selected by the ADR, never a local custom base.
contract DeterministicDeploymentHarness {
    error EmptyInitCode();

    function deploy(bytes memory initCode, bytes32 salt) external returns (address deployed) {
        if (initCode.length == 0) revert EmptyInitCode();
        assembly {
            deployed := create2(0, add(initCode, 0x20), mload(initCode), salt)
        }
        require(deployed != address(0), 'CREATE2 failed');
    }

    function codeHash(address target) external view returns (bytes32) {
        return target.codehash;
    }
}

/// @dev Represents a bytecode-pinned external deployment in local tests.
contract ExternalDeploymentFixture {
    bytes4 public constant ERC1271_MAGICVALUE = 0x1626ba7e;
}

/// @dev Test-only ERC-1271 boundary fixture. Production accounts remain the
/// upstream Safe deployment selected by SSW-015; this is not an account base.
contract ERC1271BoundaryFixture {
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;
    bytes4 internal constant INVALID = 0xffffffff;
    bytes32 public immutable approvedDigest;

    constructor(bytes32 digest) {
        approvedDigest = digest;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        if (hash == approvedDigest && keccak256(signature) == keccak256(abi.encode(approvedDigest))) {
            return MAGICVALUE;
        }
        return INVALID;
    }
}
