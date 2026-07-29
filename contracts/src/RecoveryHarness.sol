// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @dev Test-only recovery state machine; production control remains the pinned Safe boundary.
contract RecoveryHarness {
    address public immutable accountIdentity;
    address public signer;
    uint256 public immutable threshold;
    uint256 public immutable timelockBlocks;
    mapping(address => bool) public guardian;
    mapping(bytes32 => mapping(address => bool)) public approved;
    mapping(bytes32 => uint256) public approvalCount;
    mapping(bytes32 => uint256) public proposedAt;
    mapping(bytes32 => address) public proposedSigner;

    constructor(address account_, address signer_, address[] memory guardians_, uint256 threshold_, uint256 timelock_) {
        require(account_ != address(0) && signer_ != address(0), 'invalid identity');
        require(threshold_ > 0 && threshold_ <= guardians_.length, 'invalid threshold');
        accountIdentity = account_;
        signer = signer_;
        threshold = threshold_;
        timelockBlocks = timelock_;
        for (uint256 i; i < guardians_.length; i++) guardian[guardians_[i]] = true;
    }

    function propose(address nextSigner) external returns (bytes32 id) {
        id = keccak256(abi.encode(accountIdentity, nextSigner, block.number));
        proposedAt[id] = block.number;
        proposedSigner[id] = nextSigner;
    }

    function approve(bytes32 id) external {
        require(guardian[msg.sender] && !approved[id][msg.sender], 'guardian denied');
        approved[id][msg.sender] = true;
        approvalCount[id]++;
    }

    function execute(bytes32 id) external {
        require(approvalCount[id] >= threshold, 'threshold');
        require(block.number >= proposedAt[id] + timelockBlocks, 'timelock');
        signer = proposedSigner[id];
    }
}
