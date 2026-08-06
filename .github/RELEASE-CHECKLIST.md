# Alpha release checklist

This checklist prepares `0.1.0-alpha.1` without publishing it. The candidate
source is the verified RC commit
`de994c6cf3db82158b3118e9c3f7cc1b501fda07`.

## Local gates (run from a clean clone)

```bash
git status --short --branch
git show --quiet --format='%H' de994c6cf3db82158b3118e9c3f7cc1b501fda07
pnpm install --frozen-lockfile
pnpm validate:toolchain
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e:local
pnpm test:security
pnpm verify:rc
```

`pnpm verify:rc` must report `LOCAL_PASS_TESTNET_NOT_REQUESTED` unless the
disposable testnet lane is explicitly configured. That status is a successful
local gate, never an alpha-testnet or production approval.

## Reproducible source archive and checksum

Run after checking out the exact release commit. The archive contains tracked
source only; `gzip -n` removes host-specific gzip metadata.

```bash
release_tag=v0.1.0-alpha.1
release_commit=de994c6cf3db82158b3118e9c3f7cc1b501fda07
git diff --exit-code "$release_commit"
git archive --format=tar --prefix="universal-smart-wallet-${release_tag#v}/" \
  "$release_commit" | gzip -n > "universal-smart-wallet-${release_tag}.tar.gz"
shasum -a 256 "universal-smart-wallet-${release_tag}.tar.gz" \
  | tee "universal-smart-wallet-${release_tag}.tar.gz.sha256"
```

Repeat on another clean clone and compare the checksum byte-for-byte. Generate
SBOM/license and contract-hash evidence with `node scripts/rc-evidence.mjs`;
do not include `.env`, `node_modules`, logs, temporary fixtures, or generated
secrets in an artifact.

## External actions (blocked pending explicit approval)

- Configure and run `SSW_RC_TESTNET=1 pnpm verify:rc` against a disposable,
  explicitly named EVM testnet with pinned addresses and code hashes.
- Reconfirm the release commit and all local gates on the final checkout.
- Create a signed annotated tag (`git tag -s v0.1.0-alpha.1 ...`) using the
  maintainer's signing key; never move or reuse a published tag.
- Push the tag and create the GitHub alpha Release with the changelog,
  checksum, evidence, and all synthetic/local-testnet/no-audit warnings.
- Verify tag signature, GitHub visibility, asset checksums, links, and archive
  secret scans after publication.

Until all items are approved and complete, this is a prepared release
candidate only and must not be described as published, audited, or
production-ready.
