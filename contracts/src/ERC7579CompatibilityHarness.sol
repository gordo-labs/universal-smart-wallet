// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @dev Test-only ERC-7579 compatibility boundary. It intentionally uses CALL
/// and a pinned registry; it is not an account implementation or a standard.
contract ERC7579CompatibilityHarness {
    string public constant ERC7579_DRAFT = 'erc-7579-draft-2024-03';
    string public constant ADAPTER_VERSION = 'ssw-erc7579-adapter-v1';
    address public immutable owner;
    bool private entered;

    struct Policy { bytes32 codeHash; uint8 moduleType; string version; }
    mapping(address => Policy) public policy;
    mapping(address => bool) public installed;

    error Unauthorized();
    error UnpinnedModule();
    error AlreadyInstalled();
    error NotInstalled();
    error Reentrant();
    error ModuleCallFailed();

    constructor() { owner = msg.sender; }

    function pinModule(address module, uint8 moduleType, string calldata version, bytes32 codeHash) external {
        if (msg.sender != owner || module.code.length == 0 || codeHash == bytes32(0) || moduleType == 0 || bytes(version).length == 0) revert Unauthorized();
        policy[module] = Policy(codeHash, moduleType, version);
    }

    function installModule(address module) external {
        if (msg.sender != owner) revert Unauthorized();
        if (installed[module]) revert AlreadyInstalled();
        Policy memory p = policy[module];
        if (p.codeHash == bytes32(0) || module.codehash != p.codeHash) revert UnpinnedModule();
        installed[module] = true;
    }

    function useModule(address module, bytes calldata input) external returns (bytes memory output) {
        if (msg.sender != owner) revert Unauthorized();
        if (!installed[module]) revert NotInstalled();
        if (entered) revert Reentrant();
        entered = true;
        (bool ok, bytes memory result) = module.call(input);
        entered = false;
        if (!ok) revert ModuleCallFailed();
        return result;
    }

    function uninstallModule(address module) external {
        if (msg.sender != owner) revert Unauthorized();
        if (!installed[module]) revert NotInstalled();
        installed[module] = false;
    }

    /// @dev Recovery path is owner-controlled and does not invoke module code.
    function recoverUninstall(address module) external {
        if (msg.sender != owner) revert Unauthorized();
        installed[module] = false;
    }
}

contract ERC7579ReturningModule {
    uint256 public calls;
    function ping(bytes calldata input) external returns (bytes memory) { calls++; return input; }
}

contract ERC7579RevertingModule { function ping(bytes calldata) external pure { revert('module revert'); } }

contract ERC7579ReentrantModule {
    ERC7579CompatibilityHarness immutable account;
    constructor(ERC7579CompatibilityHarness target) { account = target; }
    function attack(address module) external { account.useModule(module, abi.encodeCall(this.attack, (module))); }
}
