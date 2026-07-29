# Contracts workspace

This Foundry workspace is intentionally limited to executable harness tests
until an account or attestation task defines a reviewed contract boundary.
Tests are local-only and do not connect to a chain or store credentials.

`ERC7579CompatibilityHarness` is a test-only Draft-pinned compatibility
boundary. It uses owner-gated `CALL`, code-hash policy, a reentrancy lock, and
a no-callback recovery uninstall path; it is not a smart-account base.
