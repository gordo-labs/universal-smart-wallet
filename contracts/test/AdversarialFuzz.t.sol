// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {OnChainAttestationConsumer} from '../src/OnChainAttestationConsumer.sol';
import {RecoveryHarness} from '../src/RecoveryHarness.sol';

interface VmAdversarial {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
}

/// @notice Reproducible fuzz evidence for the two stateful security boundaries.
/// Foundry records a failing calldata seed in the test output; no external RPC
/// or production keys are used.
contract AdversarialFuzzTest {
    VmAdversarial private constant vm = VmAdversarial(address(uint160(uint256(keccak256('hevm cheat code')))));
    bytes32 private constant POLICY = keccak256('age-over-18');
    bytes32 private constant VERSION = keccak256('attestor-2026-07');
    uint256 private constant KEY = 0xA11CE;

    function _signed(OnChainAttestationConsumer consumer, bytes32 nonce)
        private
        returns (OnChainAttestationConsumer.Attestation memory attestation)
    {
        address attestor = vm.addr(KEY);
        attestation = OnChainAttestationConsumer.Attestation({
            version: 1,
            chainId: block.chainid,
            consumer: address(consumer),
            policy: POLICY,
            subject: keccak256(abi.encode('synthetic-subject', nonce)),
            nonce: nonce,
            issuedAt: uint64(block.timestamp),
            expiresAt: uint64(block.timestamp + 300),
            attestor: attestor,
            attestorVersion: VERSION,
            signature: ''
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, consumer.eip712Digest(attestation));
        attestation.signature = abi.encodePacked(r, s, v);
    }

    function testFuzz_attestation_nonce_is_one_shot(bytes32 nonce) public {
        address attestor = vm.addr(KEY);
        OnChainAttestationConsumer consumer = new OnChainAttestationConsumer(POLICY, attestor, VERSION);
        OnChainAttestationConsumer.Attestation memory attestation = _signed(consumer, nonce);
        consumer.consume(attestation);
        (bool replay,) = address(consumer).call(abi.encodeCall(consumer.consume, (attestation)));
        require(!replay, 'fuzzed nonce replay accepted');
    }

    function testFuzz_attestation_signature_scope_is_bound(bytes32 nonce, bytes32 subject) public {
        address attestor = vm.addr(KEY);
        OnChainAttestationConsumer consumer = new OnChainAttestationConsumer(POLICY, attestor, VERSION);
        OnChainAttestationConsumer.Attestation memory attestation = _signed(consumer, nonce);
        attestation.subject = subject == attestation.subject ? subject ^ bytes32(uint256(1)) : subject;
        (bool accepted,) = address(consumer).call(abi.encodeCall(consumer.consume, (attestation)));
        require(!accepted, 'subject mutation bypassed signature');
    }
}

contract RecoveryInvariantTest {
    RecoveryHarness private immutable recovery;
    address private constant ACCOUNT = address(0xCAFE);
    address private constant INITIAL_SIGNER = address(0x1);

    constructor() {
        address[] memory guardians = new address[](2);
        guardians[0] = address(0xA);
        guardians[1] = address(0xB);
        recovery = new RecoveryHarness(ACCOUNT, INITIAL_SIGNER, guardians, 2, 3);
    }

    function invariant_recovery_preserves_stable_account_identity() public view {
        require(recovery.accountIdentity() == ACCOUNT, 'recovery changed account identity');
    }

    function invariant_recovery_does_not_change_signer_without_execution() public view {
        require(recovery.signer() == INITIAL_SIGNER, 'unexpected signer mutation');
    }
}
