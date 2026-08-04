# SSW-027 — Alpha release evidence

**Status:** `BLOCKED_RELEASE_APPROVAL`

This document records the reproducible preparation work for
`v0.1.0-alpha.1`. It is not a publication record. No tag, GitHub Release,
testnet deployment, package publication, or push was performed by SSW-027.

## Candidate and source integrity

The release checklist and changelog identify
`de994c6cf3db82158b3118e9c3f7cc1b501fda07` as the candidate source. The
integration branch currently contains the later local-network testnet gate
hardening commit `257af74` on top of that candidate. Therefore a final release
must either check out the exact documented candidate or deliberately re-cut a
new candidate and regenerate all evidence before a tag is created.

The following check was run from a clean worktree based on the current
integration branch:

```text
git diff --exit-code de994c6cf3db82158b3118e9c3f7cc1b501fda07
result: FAIL (current checkout is not the documented candidate commit)
```

This is an integrity warning, not a source modification. No tag was moved or
reused.

## Local verification

Command:

```text
pnpm verify:rc
```

Result: **PASS** with status `LOCAL_PASS_TESTNET_NOT_REQUESTED`.

The gate passed toolchain, build, local issuer/wallet/verifier flow, release
scenarios, adversarial/security checks, Foundry, SBOM/license/secret/
dependency/code-hash evidence. The opt-in testnet matrix was
`NOT_REQUESTED` because no disposable non-local testnet configuration was
provided. This result is not alpha-testnet approval.

## Reproducible archive

The documented candidate was archived twice with `git archive` and
`gzip -n`:

```text
release: v0.1.0-alpha.1
source: de994c6cf3db82158b3118e9c3f7cc1b501fda07
sha256: 670cd293704244b15a670a729745ed00c0503b619c876ebc76d2fd42012d54e6
repeat archive bytes: MATCH
```

The tracked archive path scan found only `.env.example`; no `.env`, private
key, PEM/P12/PFX material, credential JSON, or generated secret was present.
The archive is a source artifact, not a signed release asset.

## Acceptance status

| Criterion | Result | Evidence |
| --- | --- | --- |
| Release commit equals verified RC source | **BLOCKED** | Current integration checkout is `257af74`; exact candidate comparison fails until a final source commit is selected. |
| Published artifacts/checksums are reproducible | **PASS (prepared)** | Two candidate archives produced identical bytes and SHA-256 `670cd293…d54e6`. No artifact was published. |
| Warnings limit alpha to synthetic/local-testnet use | **PASS** | `CHANGELOG.md`, `README.md`, `SECURITY.md`, and `.github/RELEASE-CHECKLIST.md` prohibit mainnet, production identity, valuable assets, PII, audit/compliance claims, and unconfigured testnets. |

## Required owner actions before publication

1. Select or re-cut the final candidate commit after all approved changes.
2. Run `SSW_RC_TESTNET=1 pnpm verify:rc` against a disposable, explicitly
   named non-local EVM testnet with pinned addresses and code hashes.
3. Re-run the complete release checklist from that exact commit.
4. Explicitly authorize the maintainer to create a signed annotated tag, push
   it, and create the GitHub alpha Release.
5. Verify tag signature, links, checksums, and archive secret scans after
   publication.

Until these actions are complete, the repository must describe this as a
prepared release candidate only; it is not published, audited, or
production-ready.
