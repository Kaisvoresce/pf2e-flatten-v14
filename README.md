# PF2e Flatten - v14 continuation

Continuation of PF2e Flatten by Avery (velara), maintained by David
(Kaisvoresce). Version 0.6.5 derives from upstream V0.6.2 and the v14
continuation work. Live validation passed on Foundry VTT 14.369 with PF2e
8.6.0; the manifest records those verified versions. Compatibility beyond
the declared bounds has not been established.

The upstream module applies full or half-level proficiency reduction through
a PF2e custom modifier. This continuation updates directory integration for v14
and adds guards for duplicate calls and overlapping automatic writes while
retaining the original calculation, settings and actor-data contract.

## Behavior and settings

- NPCs are eligible. PCs require the `flattenPcs` option, off by default.
- Directory menus and GM bulk buttons flatten or unflatten eligible actors.
- `autoflatten` is off by default. When enabled, the createActor hook also covers
  scratch-created actors, not only compendium imports. Existing matching
  modifiers are skipped.
- Full reduction subtracts the prepared actor level. Half reduction subtracts
  rounded half of that level; rounding defaults to ceil, with floor available.
- Updates to flattened actors reapply a differing computed value. Changing
  settings alone does not refresh actors until an actor update or manual
  unflatten/flatten.

The unchanged formula preserves the level -1 quirk: full reduction adds +1.
The `all` selector is broader than trained proficiency alone. Built-in PF2e
PWoL already removes level from PC proficiency; combining it with this module's
PC option reduces it again. Keep PC flattening off for a normal built-in PWoL
setup. Disabling PC flattening also hides PC unflatten; reenable it to remove
an existing PC adjustment.

## Actor-data contract

Module ID and setting namespace remain `pf2e-flatten`.
No actor flags are written or migrated. The effect is stored in
`system.customModifiers.all` with exact label `Flattened Level Proficiency`,
slug `flattened-level-proficiency`, type `untyped`, and `custom: true`.
PF2e supplies additional serialized Modifier fields.

Addition uses `actor.addCustomModifier('all', label, value, 'untyped')`.
Unflatten uses `actor.removeCustomModifier('all', canonicalSlug)` and does not
reverse arithmetic against the actor's current level. Unrelated flags and
modifier entries are preserved by the module's update payloads.

Reapplication uses two writes, removal then addition. A failure between them
can leave an actor unflattened; manual flatten can retry it. In-memory guards
and one active GM prevent overlapping automatic work. They are not a
distributed transaction for simultaneous manual edits by multiple GMs.
Late level changes are reconciled with a five-cycle limit and a removal-progress
check. Unflatten remains removal-only.

PF2e Toolbox actors use a separate legacy format. Unflatten them with the
original Toolbox before switching; this continuation adds no guessed legacy
flag migration.

## Testing and installation

Use a disposable world and dedicated test data directory. Extract the release
ZIP so it contains `Data/modules/pf2e-flatten/module.json`. Enable only one copy
of this module. Disabling the module alone does not remove stored modifiers.
Backups in matching older runtime versions are needed to reverse system/world
migrations; unflatten only removes this module's adjustment.

Run the self-contained fixture suite with Node.js:

```sh
node --check bundle.js
node tests/regression.cjs
```

The repository suite contains 25 focused tests using authored API/DOM
simulations. It does not run Foundry, real prepared statistics, full PF2e
Modifier serialization, migration, compendium/token roundtrips or multiple
live clients. The owner separately completed live validation before the
0.6.5 release; the fixtures remain useful regression checks.

For direct installation, use the maintained manifest URL
in Foundry's Install Module dialog:

https://raw.githubusercontent.com/Kaisvoresce/pf2e-flatten-v14/main/module.json

The manifest points to a versioned release ZIP and serves as the update channel.
Use this continuation's manifest URL for updates. An installation still using
the League upstream manifest will continue checking the upstream channel;
changing the public repository cannot retarget that local installation.
GitHub source archives contain repository tooling and are not the installable
release ZIP. See PUBLICATION.md for the release process.

## License and attribution

Distributed under Apache License 2.0; see LICENSE and NOTICE. Original PF2e
Flatten author: Avery (GitHub velara). Current continuation maintainer: David
(GitHub Kaisvoresce). This work derives from the League of Foundry Developers'
PF2e Flatten project, whose history also includes shun17 and Cuingamehtar:
https://github.com/League-of-Foundry-Developers/pf2e-flatten/

The original module overhauled the NPC Flattening function from PF2e Toolbox
and credits DJphoenix719:
https://github.com/Djphoenix719/FVTT-PF2EToolbox/releases

Modified files are identified here, in CHANGELOG.md and in the module source
and manifest. Attribution describes origin and does not imply upstream endorsement.
