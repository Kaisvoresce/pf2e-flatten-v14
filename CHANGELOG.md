# Changes

## 0.6.5 - maintained v14 continuation

Released 2026-10-13 after successful live validation on Foundry VTT 14.369
and PF2e 8.6.0.

- Use the numeric module version 0.6.5 for Foundry update comparisons.
- Remove the test-candidate label from the current title and description.
- Identify David (Kaisvoresce) as current maintainer and Avery (velara) as
  original PF2e Flatten author; retain DJphoenix719/PF2e Toolbox attribution.
- Record the validated versions in compatibility metadata, retaining the
  existing Foundry v14 and PF2e 8.6.0 bounds.
- Publish matching manifest and ZIP assets under the v0.6.5 release tag;
  retain the stable main-branch installation/update manifest URL.

Runtime code, module ID, settings, actor flags and custom-modifier behavior
are unchanged from 0.6.2-v14.2. LICENSE and language strings are unchanged.
The earlier entries below describe the status at the time of those releases.

## 0.6.2-v14.2 - source publication correction

Preserve the original UTF-8 source text in GitHub uploads, including the curly
apostrophe in the existing slug-normalization expression. The modifier contract
and behavior are unchanged. The v14.1 installable ZIP already contained that
original text; this revision aligns the public source tag and release package.

## 0.6.2-v14.1 - unofficial test candidate

Modified 2026-10-11 from upstream V0.6.2. Runtime compatibility is unverified.

- Use the namespaced Foundry v14 ActorDirectory and current context-menu
  `label`, `visible` and `onClick(event, element)` fields.
- Preserve inherited directory menu entries and arguments; add header fallbacks
  and missing-actor checks.
- Skip existing modifiers and overlapping calls. Select the active GM for
  automatic creation/update work.
- Use an in-memory guard with cleanup after failed writes. Reconcile late
  level changes with removal-progress checks and a maximum of five cycles.
  Invalid computed levels cause no writes. Unflatten never re-adds a modifier.
- Retain module ID, setting namespace/defaults, exact custom-modifier contract,
  calculation, optional PCs, and remove/add reapplication.
- Target Foundry 14.369 and PF2e 8.6.0; omit a `verified` claim and use a stable
  candidate-channel manifest with an immutable versioned release download URL.

No actor flag migration is introduced. Inherited negative-level, PC/PWoL and
nontransactional reapplication limitations are documented in README.md.

The source bundle carries its modification notice. The manifest title and
description identify the modified unofficial candidate. The README is rewritten
to describe this candidate; upstream project and Toolbox attribution remain in
README.md and NOTICE. LICENSE and language strings are unchanged.
