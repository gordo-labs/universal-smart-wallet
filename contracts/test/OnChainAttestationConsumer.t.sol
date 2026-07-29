// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {OnChainAttestationConsumer} from '../src/OnChainAttestationConsumer.sol';

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256 timestamp) external;
    function roll(uint256 blockNumber) external;
    function chainId(uint256 newChainId) external;
}

contract OnChainAttestationConsumerTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256('hevm cheat code')))));
    bytes32 private constant POLICY = keccak256('age-over-18');
    bytes32 private constant VERSION = keccak256('attestor-2026-07');
    uint256 private constant KEY = 0xA11CE;

    function _consumer() private returns (OnChainAttestationConsumer c, address attestor) {
        attestor = vm.addr(KEY);
        c = new OnChainAttestationConsumer(POLICY, attestor, VERSION);
    }

    function _signed(OnChainAttestationConsumer c, address attestor, bytes32 nonce) private returns (OnChainAttestationConsumer.Attestation memory a) {
        a = OnChainAttestationConsumer.Attestation({
            version: 1,
            chainId: block.chainid,
            consumer: address(c),
            policy: POLICY,
            subject: keccak256('synthetic-nullifier'),
            nonce: nonce,
            issuedAt: uint64(block.timestamp - 1),
            expiresAt: uint64(block.timestamp + 60),
            attestor: attestor,
            attestorVersion: VERSION,
            signature: ''
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KEY, c.eip712Digest(a));
        a.signature = abi.encodePacked(r, s, v);
    }

    function test_valid_attestation_and_one_shot_nonce() public {
        (OnChainAttestationConsumer c, address attestor) = _consumer();
        OnChainAttestationConsumer.Attestation memory a = _signed(c, attestor, keccak256('nonce-1'));
        require(c.consume(a) == a.subject, 'valid attestation rejected');
        (bool replay,) = address(c).call(abi.encodeCall(c.consume, (a)));
        require(!replay, 'nonce replay accepted');
    }

    function test_scope_and_rotation_reject() public {
        (OnChainAttestationConsumer c, address attestor) = _consumer();
        OnChainAttestationConsumer.Attestation memory a = _signed(c, attestor, keccak256('nonce-2'));
        a.policy = keccak256('wrong-policy');
        (bool wrongPolicy,) = address(c).call(abi.encodeCall(c.consume, (a)));
        require(!wrongPolicy, 'wrong policy accepted');
        a = _signed(c, attestor, keccak256('nonce-3'));
        c.revokeAttestor(attestor);
        (bool revoked,) = address(c).call(abi.encodeCall(c.consume, (a)));
        require(!revoked, 'revoked attestor accepted');
    }

    function test_expiry_chain_and_audience_reject() public {
        (OnChainAttestationConsumer c, address attestor) = _consumer();
        OnChainAttestationConsumer.Attestation memory a = _signed(c, attestor, keccak256('nonce-4'));
        vm.warp(block.timestamp + 61);
        (bool expired,) = address(c).call(abi.encodeCall(c.consume, (a)));
        require(!expired, 'expired attestation accepted');
        a = _signed(c, attestor, keccak256('nonce-5'));
        a.consumer = address(0xBEEF);
        (bool wrongConsumer,) = address(c).call(abi.encodeCall(c.consume, (a)));
        require(!wrongConsumer, 'wrong consumer accepted');
        a = _signed(c, attestor, keccak256('nonce-6'));
        vm.chainId(block.chainid + 1);
        (bool wrongChain,) = address(c).call(abi.encodeCall(c.consume, (a)));
        require(!wrongChain, 'wrong chain accepted');
    }

    function testFuzz_expiry_is_bounded(uint64 issued, uint64 ttl) public {
        (OnChainAttestationConsumer c, address attestor) = _consumer();
        issued = uint64(uint256(issued) % (type(uint64).max - 100));
        ttl = uint64(uint256(ttl) % 100);
        OnChainAttestationConsumer.Attestation memory a = OnChainAttestationConsumer.Attestation({
            version: 1, chainId: block.chainid, consumer: address(c), policy: POLICY,
            subject: bytes32(uint256(1)), nonce: keccak256(abi.encode(issued, ttl)),
            issuedAt: issued, expiresAt: issued + ttl, attestor: attestor,
            attestorVersion: VERSION, signature: ''
        });
        (bool ok,) = address(c).call(abi.encodeCall(c.consume, (a)));
        require(!ok, 'invalid short lifetime accepted');
    }

    function test_consume_gas_under_250k() public {
        (OnChainAttestationConsumer c, address attestor) = _consumer();
        OnChainAttestationConsumer.Attestation memory a = _signed(c, attestor, keccak256('gas'));
        uint256 beforeGas = gasleft();
        c.consume(a);
        require(beforeGas - gasleft() < 250_000, 'unexpected gas regression');
    }
}
