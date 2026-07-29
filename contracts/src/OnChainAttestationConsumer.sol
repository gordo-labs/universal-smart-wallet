// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @notice Minimal consumer for short-lived, scoped attestor attestations.
/// @dev This contract verifies a result, not a credential. No credential data
/// or DID material is accepted or emitted.
contract OnChainAttestationConsumer {
    uint8 public constant VERSION = 1;
    bytes32 public constant TYPE_HASH = keccak256("SSWOnChainAttestation(uint8 version,uint256 chainId,address consumer,bytes32 policy,bytes32 subject,bytes32 nonce,uint64 issuedAt,uint64 expiresAt,address attestor,bytes32 attestorVersion)");
    bytes32 public constant DOMAIN_TYPE_HASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 public immutable DOMAIN_SEPARATOR;
    address public immutable owner;
    bytes32 public immutable policy;

    struct Attestation {
        uint8 version;
        uint256 chainId;
        address consumer;
        bytes32 policy;
        bytes32 subject;
        bytes32 nonce;
        uint64 issuedAt;
        uint64 expiresAt;
        address attestor;
        bytes32 attestorVersion;
        bytes signature;
    }
    mapping(address => bytes32) public attestorVersion;
    mapping(bytes32 => bool) public usedNonce;

    error Unauthorized();
    error InvalidVersion();
    error WrongChain();
    error WrongConsumer();
    error WrongPolicy();
    error InvalidLifetime();
    error Expired();
    error NotYetValid();
    error NonceUsed();
    error AttestorDenied();
    error InvalidSignature();

    event AttestorUpdated(address indexed attestor, bytes32 indexed version, bool active);
    event AccessGranted(bytes32 indexed subject, bytes32 indexed nonce, bytes32 indexed policy, bytes32 attestorVersion);

    constructor(bytes32 policy_, address attestor_, bytes32 attestorVersion_) {
        if (policy_ == bytes32(0) || attestor_ == address(0) || attestorVersion_ == bytes32(0)) revert AttestorDenied();
        owner = msg.sender;
        policy = policy_;
        attestorVersion[attestor_] = attestorVersion_;
        DOMAIN_SEPARATOR = keccak256(abi.encode(DOMAIN_TYPE_HASH, keccak256("SSW On-chain Attestation"), keccak256("1"), block.chainid, address(this)));
        emit AttestorUpdated(attestor_, attestorVersion_, true);
    }

    function setAttestor(address attestor, bytes32 version) external {
        if (msg.sender != owner || attestor == address(0)) revert Unauthorized();
        attestorVersion[attestor] = version;
        emit AttestorUpdated(attestor, version, version != bytes32(0));
    }

    function revokeAttestor(address attestor) external {
        if (msg.sender != owner) revert Unauthorized();
        attestorVersion[attestor] = bytes32(0);
        emit AttestorUpdated(attestor, bytes32(0), false);
    }

    function digest(Attestation calldata a) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("SSW_ONCHAIN_ATTESTATION_V1|", _structHash(a)));
    }

    function eip712Digest(Attestation calldata a) public view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, _structHash(a)));
    }

    function _structHash(Attestation calldata a) internal pure returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, a.version, a.chainId, a.consumer, a.policy, a.subject, a.nonce, a.issuedAt, a.expiresAt, a.attestor, a.attestorVersion));
    }

    function consume(Attestation calldata a) external returns (bytes32 subject) {
        if (a.version != VERSION) revert InvalidVersion();
        if (a.chainId != block.chainid) revert WrongChain();
        if (a.consumer != address(this)) revert WrongConsumer();
        if (a.policy != policy) revert WrongPolicy();
        if (a.expiresAt <= a.issuedAt) revert InvalidLifetime();
        if (block.timestamp < a.issuedAt) revert NotYetValid();
        if (block.timestamp >= a.expiresAt) revert Expired();
        if (usedNonce[a.nonce]) revert NonceUsed();
        if (attestorVersion[a.attestor] == bytes32(0) || attestorVersion[a.attestor] != a.attestorVersion) revert AttestorDenied();
        if (a.signature.length != 65) revert InvalidSignature();
        bytes32 signed = eip712Digest(a);
        (uint8 v, bytes32 r, bytes32 s) = _split(a.signature);
        address recovered = ecrecover(signed, v, r, s);
        if (recovered != a.attestor || recovered == address(0)) revert InvalidSignature();
        usedNonce[a.nonce] = true;
        emit AccessGranted(a.subject, a.nonce, a.policy, a.attestorVersion);
        return a.subject;
    }

    function _split(bytes calldata signature) private pure returns (uint8 v, bytes32 r, bytes32 s) {
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
    }
}
