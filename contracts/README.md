# Contracts workspace

This Foundry workspace is intentionally limited to executable harness tests
until an account or attestation task defines a reviewed contract boundary.
Tests are local-only and do not connect to a chain or store credentials.

`ERC7579CompatibilityHarness` is a test-only Draft-pinned compatibility
boundary. It uses owner-gated `CALL`, code-hash policy, a reentrancy lock, and
a no-callback recovery uninstall path; it is not a smart-account base.

`OnChainAttestationConsumer` is a local/testnet-only access-gate harness. It
accepts only a versioned EIP-712 attestation scoped to this chain, consumer,
policy, nonce, lifetime, and active attestor key version. Its events expose
only opaque subject/nonce hashes; credential payloads and DID documents never
cross the contract boundary.
