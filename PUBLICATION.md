# Release process

This repository distributes an unofficial v14 test candidate under Apache-2.0.
Live Foundry/PF2e runtime compatibility remains unverified. The public raw
module.json on the main branch serves as the candidate installation/update
channel; its download field points to a versioned release ZIP.

## Maintained manifest fields

| Field | Purpose |
| --- | --- |
| url | Canonical repository URL |
| manifest | Stable raw main-branch module.json installation/update endpoint |
| download | Immutable release-asset URL of the ZIP matching the manifest version |

A candidate may be marked as a GitHub prerelease. The raw manifest channel does
not depend on GitHub's latest-release route, which may omit prereleases.
Do not claim verified compatibility until live validation supports it.

## Preparing a later release

1. Update version and intended tag/asset URL together. Preserve module ID
   pf2e-flatten and the original actor-data contract. Adjust compatibility
   bounds only with appropriate source/runtime validation.
2. Run node --check bundle.js and node tests/regression.cjs.
3. Package only the explicit runtime/documentation/license allowlist with
   scripts/package.ps1. Keep private data, logs and task evidence out.
4. Upload a matching versioned ZIP and module.json release asset. Ensure the
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
included; modified runtime files identify this candidate; README.md and NOTICE
retain upstream and Toolbox attribution. Upstream V0.6.2 has no NOTICE file.
No endorsement or additional trademark permission is claimed.

Reference: https://www.apache.org/licenses/LICENSE-2.0
