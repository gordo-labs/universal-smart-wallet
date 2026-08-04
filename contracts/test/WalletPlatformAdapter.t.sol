// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @dev Provider boundary fixture only. It deliberately does not implement a
/// smart-account base, signatures, bundler, or paymaster.
contract WalletPlatformAdapterFixture {
    error NotVerified();
    error SimulationRequired();
    error AlreadySubmitted();
    error DeploymentMismatch();

    uint256 public immutable chainId;
    address public immutable entryPoint;
    bytes32 public immutable entryPointCodeHash;
    address public immutable factory;
    bytes32 public immutable factoryCodeHash;
    bool public verified;
    bool public simulated;
    bool public submitted;

    constructor(uint256 chainId_, address entryPoint_, bytes32 entryPointHash_, address factory_, bytes32 factoryHash_) {
        if (chainId_ == 0 || entryPoint_ == address(0) || factory_ == address(0) || entryPointHash_ == bytes32(0) || factoryHash_ == bytes32(0)) revert DeploymentMismatch();
        chainId = chainId_;
        entryPoint = entryPoint_;
        entryPointCodeHash = entryPointHash_;
        factory = factory_;
        factoryCodeHash = factoryHash_;
    }

    function verify(uint256 observedChainId, bytes32 observedEntryPointHash, bytes32 observedFactoryHash) external {
        if (observedChainId != chainId || observedEntryPointHash != entryPointCodeHash || observedFactoryHash != factoryCodeHash) revert DeploymentMismatch();
        verified = true;
    }

    function prepareCall(address target, uint256 value, bytes calldata data) external view returns (address, uint256, bytes calldata) {
        if (!verified) revert NotVerified();
        return (target, value, data);
    }

    function simulate(bool success) external {
        if (!verified) revert NotVerified();
        if (!success) revert SimulationRequired();
        simulated = true;
    }

    function submit() external returns (bytes32) {
        if (!verified) revert NotVerified();
        if (!simulated) revert SimulationRequired();
        if (submitted) revert AlreadySubmitted();
        submitted = true;
        return keccak256(abi.encode(address(this), block.number));
    }
}

contract WalletPlatformAdapterTest {
    bytes20 internal constant ENTRY_POINT_V08 = bytes20(0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108);
    bytes32 internal constant ENTRY_HASH = keccak256('entrypoint-runtime');
    bytes32 internal constant FACTORY_HASH = keccak256('safe-factory-runtime');

    function test_base_profile_lifecycle_prepare_simulate_and_submit() public {
        WalletPlatformAdapterFixture fixture = new WalletPlatformAdapterFixture(84532, address(ENTRY_POINT_V08), ENTRY_HASH, address(0x1234), FACTORY_HASH);
        fixture.verify(84532, ENTRY_HASH, FACTORY_HASH);
        (address target, uint256 value, bytes memory data) = fixture.prepareCall(address(0xBEEF), 0, hex'1234');
        require(target == address(0xBEEF) && value == 0 && keccak256(data) == keccak256(hex'1234'), 'call preparation mismatch');
        fixture.simulate(true);
        fixture.submit();
    }

    function test_scroll_profile_does_not_reuse_base_chain_metadata() public {
        WalletPlatformAdapterFixture fixture = new WalletPlatformAdapterFixture(534351, address(ENTRY_POINT_V08), ENTRY_HASH, address(0x1234), FACTORY_HASH);
        (bool ok,) = address(fixture).call(abi.encodeWithSelector(fixture.verify.selector, 84532, ENTRY_HASH, FACTORY_HASH));
        require(!ok, 'Base chain metadata accepted by Scroll profile');
        fixture.verify(534351, ENTRY_HASH, FACTORY_HASH);
    }

    function test_simulation_failure_blocks_submission_and_repeat_is_rejected() public {
        WalletPlatformAdapterFixture fixture = new WalletPlatformAdapterFixture(84532, address(ENTRY_POINT_V08), ENTRY_HASH, address(0x1234), FACTORY_HASH);
        fixture.verify(84532, ENTRY_HASH, FACTORY_HASH);
        (bool failed,) = address(fixture).call(abi.encodeWithSelector(fixture.simulate.selector, false));
        require(!failed, 'failed simulation accepted');
        (failed,) = address(fixture).call(abi.encodeWithSelector(fixture.submit.selector));
        require(!failed, 'submission without simulation accepted');
        fixture.simulate(true);
        fixture.submit();
        (failed,) = address(fixture).call(abi.encodeWithSelector(fixture.submit.selector));
        require(!failed, 'blind duplicate submission accepted');
    }
}
