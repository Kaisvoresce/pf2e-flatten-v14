# Release process

This repository distributes the v14 continuation under Apache-2.0, maintained
by David (Kaisvoresce) and credited to original author Avery (velara).
Version 0.6.5 follows successful owner live validation on Foundry 14.369 /
PF2e 8.6.0. The public raw module.json on the main branch serves as the installation/update
channel; its download field points to a versioned release ZIP.

## Maintained manifest fields

| Field | Purpose |
| --- | --- |
| url | Canonical repository URL |
| manifest | Stable raw main-branch module.json installation/update endpoint |
| download | Immutable release-asset URL of the ZIP matching the manifest version |

Version 0.6.5 is a regular GitHub release. The raw manifest channel does not
depend on GitHub's latest-release route, which may omit prereleases.
Record verified compatibility only for versions supported by live validation.
Keep the numeric manifest version, tag and asset filename aligned: 0.6.5,
v0.6.5 and pf2e-flatten-0.6.5.zip for this release.

An installation using the original upstream manifest continues checking that
channel. Users must adopt the continuation manifest to receive these updates.
Foundry v14 and PF2e 8.6.0 compatibility bounds remain enforced; the numeric
version does not establish compatibility with newer runtime/system releases.

## Preparing a later release

1. Update version and intended tag/asset URL together. Preserve module ID
   pf2e-flatten and the original actor-data contract. Adjust compatibility
   bounds only with appropriate source/runtime validation.
2. Run node --check bundle.js and node tests/regression.cjs.
3. Package only the explicit runtime/documentation/license allowlist with
   scripts/package.ps1. Keep private data, logs and task evidence out.
4. Prepare the release on a staging branch, upload a matching versioned ZIP
   and module.json release asset, and publish before advancing main. Ensure the
   served manifest and ZIP manifest agree on ID, version and download URL.
5. Independently fetch both public endpoints without authentication. Compare
   the downloaded ZIP hash and every entry to the locally reviewed package.

The release ZIP contains the module files, generic README/changelog and the
required license/attribution. Repository-only tests use authored simulations;
they do not prove actual Foundry rendering, preparation or world migration.

## Redistribution check

Apache License 2.0 section 4 permits modified redistribution subject to retaining
the license, prominent modification notices and relevant source attribution,
plus upstream NOTICE attribution when one exists. The full unchanged LICENSE is
included; modified runtime files carry their modification notice; README.md and NOTICE
retain upstream and Toolbox attribution. Upstream V0.6.2 has no NOTICE file.
No endorsement or additional trademark permission is claimed.

Reference: https://www.apache.org/licenses/LICENSE-2.0
