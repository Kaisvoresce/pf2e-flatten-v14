// This file has been modified from the original PF2e toolbox module.
// Modified 2026-10-11: unofficial Foundry v14 test candidate; see CHANGELOG.md.
const settingsKey = "pf2e-flatten";
const pf2eModifierName = 'Flattened Level Proficiency';
// In-memory only: no new actor flags or persistent data.
const updatingActors = new WeakSet();

const wordCharacter = String.raw`[\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`
	, nonWordCharacter = String.raw`[^\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]`
	, nonWordCharacterRE = new RegExp(nonWordCharacter, "gu")
	, nonWordBoundary = String.raw`(?:${wordCharacter})(?=${wordCharacter})`
	, lowerCaseLetter = String.raw`\p{Lowercase_Letter}`
	, upperCaseLetter = String.raw`\p{Uppercase_Letter}`
	, lowerCaseThenUpperCaseRE = new RegExp(`(${lowerCaseLetter})(${upperCaseLetter}${nonWordBoundary})`, "gu");

const RoundingModes = {
	CEIL: {
		ordinal: 0,
		func: Math.ceil
	},
	FLOOR: {
		ordinal: 1,
		func: Math.floor
	}
}
RoundingModes.properties = {
	0: "CEIL",
	1: "FLOOR"
}
RoundingModes.enumFromValue = function (ordinal) {
	return RoundingModes.properties[ordinal];
}

const Multipliers = {
	HALF: 0.5,
	NONE: 1
}

Hooks.once("init", () => {
	game.settings.register(settingsKey, "autoflatten", {
		name: `${settingsKey}.settings.autoflatten.name`,
		hint: `${settingsKey}.settings.autoflatten.hint`,
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register(settingsKey, "flattenPcs", {
		name: `${settingsKey}.settings.flattenPcs.name`,
		hint: `${settingsKey}.settings.flattenPcs.hint`,
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});
	game.settings.register(settingsKey, "multiplier", {
		name: `${settingsKey}.settings.multiplier.name`,
		hint: `${settingsKey}.settings.multiplier.hint`,
		scope: "world",
		config: true,
		type: Number,
		default: Multipliers.NONE,
		choices: {
			[Multipliers.HALF]: game.i18n.localize(`${settingsKey}.settings.multiplier.half`),
			[Multipliers.NONE]: game.i18n.localize(`${settingsKey}.settings.multiplier.none`),
		}
	});
	game.settings.register(settingsKey, "roundingMode", {
		name: `${settingsKey}.settings.roundingMode.name`,
		hint: `${settingsKey}.settings.roundingMode.hint`,
		scope: "world",
		config: true,
		type: Number,
		default: RoundingModes.CEIL.ordinal,
		choices: {
			[RoundingModes.CEIL.ordinal]: game.i18n.localize(`${settingsKey}.settings.roundingMode.ceil`),
			[RoundingModes.FLOOR.ordinal]: game.i18n.localize(`${settingsKey}.settings.roundingMode.floor`),
		}
	});
});

Hooks.on('renderActorDirectory', async (cc, html, opts) => {
	if (!game.user.isGM) {
		return;
	}
	if (html.querySelector('[data-ref=flatten-row]')){
		return;
	}

	const buttons = html.querySelector('header .action-buttons, header .header-actions');
	const header = html.querySelector('[data-application-part="header"], header.directory-header');
	if (!buttons && !header) return;
	const flattenRow = document.createElement('div');
	flattenRow.classList.add("header-actions");
	flattenRow.classList.add("action-buttons")
	flattenRow.classList.add("flexrow");
	flattenRow.dataset.ref = "flatten-row"

	const flattenButton = document.createElement('button');
	const unflattenButton = document.createElement('button');

	if (game.release.generation >= 11) {
		flattenButton.classList.add('ic-wide')
		unflattenButton.classList.add('ic-wide')
	}

	flattenButton.classList.add('flatten-actors');
	flattenButton.type = 'button';
	flattenButton.innerHTML = `<i class="fa-solid fa-level-down-alt"></i> Flatten All`;

	unflattenButton.classList.add('flatten-actors');
	unflattenButton.type = 'button';
	unflattenButton.innerHTML = `<i class="fa-solid fa-level-up-alt"></i> Unflatten All`;

	
	flattenRow.append(flattenButton);
	flattenRow.append(unflattenButton);
	if (buttons) buttons.after(flattenRow);
	else header.append(flattenRow);

	flattenButton.addEventListener('click', async (ev) => {
		ev.preventDefault();
		ev.stopPropagation();

		let actors = game.actors.filter(actor => isUpdatable(actor) && !hasModifier(actor))
		ui.notifications.info(`Flattening ${actors.length} actors`);
		for (let a of actors) {
			await flattenActor(a);
		}
		ui.notifications.info(`Finished flattening ${actors.length} actors`);
	});

	unflattenButton.addEventListener('click', async (ev) => {
		ev.preventDefault();
		ev.stopPropagation();

		let actors = game.actors.filter(actor => isUpdatable(actor) && hasModifier(actor));
		ui.notifications.info(`Un-flattening ${actors.length} actors`);
		for (let a of actors) {
			await unflattenActor(a);
		}
		ui.notifications.info(`Finished un-flattening ${actors.length} actors`);
	});
});

Hooks.on('createActor', async (actor) => {
	if (isAutomationAuthority() && isUpdatable(actor) && !hasModifier(actor) && game.settings.get(settingsKey, "autoflatten") === true) {
		await flattenActor(actor);
	}
});

Hooks.on('updateActor', async (actor) => {
	if (isAutomationAuthority() && isUpdatable(actor) && !updatingActors.has(actor) && hasModifier(actor) && Number.isFinite(computeFlatteningValue(actor)) && getFlatteningValue(actor) !== computeFlatteningValue(actor)) {
		updatingActors.add(actor);
		try {
			await reconcileFlatteningModifier(actor);
			if (hasModifier(actor) && getFlatteningValue(actor) === computeFlatteningValue(actor)) {
				ui.notifications.info(`Re applied flattening for actor ${actor?.name} (${actor?.id})`);
			}
		} finally {
			updatingActors.delete(actor);
		}
	}
});

Hooks.on("init", () => {
	const directory = foundry.applications.sidebar.tabs.ActorDirectory;
	const f = directory.prototype._getEntryContextOptions;
	directory.prototype._getEntryContextOptions = function(...args){
		const entries = f.apply(this, args);
		entries.unshift({
			label: 'PF2e Flatten NPC',
			icon: '<i class="fas fa-level-down-alt"></i>',
			visible: ($li) => {
				const id = $li.dataset.entryId;
				const actor = game.actors.get(id);
				return isUpdatable(actor) && !hasModifier(actor);
			},
			onClick: async (_event, $li) => {
				const id = $li.dataset.entryId;
				const actor = game.actors.get(id);
				await flattenActor(actor);
			}
		});
		entries.unshift({
			label: 'PF2e Unflatten NPC',
			icon: '<i class="fas fa-level-up-alt"></i>',
			visible: ($li) => {
				const id = $li.dataset.entryId;
				const actor = game.actors.get(id);
				return isUpdatable(actor) && hasModifier(actor);
			},
			onClick: async (_event, $li) => {
				const id = $li.dataset.entryId;
				const actor = game.actors.get(id);
				await unflattenActor(actor);
			},
		});
		return entries;
	}
});

function isUpdatable(actor) {
	return actor?.type === 'npc' || (game.settings.get(settingsKey, "flattenPcs") && actor?.type === 'character');
}

function isAutomationAuthority() {
	return game.user.isGM && game.users.activeGM?.id === game.user.id;
}

function hasModifier(actor) {
	const data = actor.system;
	if (data.customModifiers && data.customModifiers.all) {
		const all = data.customModifiers.all;
		for (const modifier of all) {
			if (modifier.label === pf2eModifierName) {
				return true;
			}
		}
	}
	return false;
};

function getFlatteningValue(actor) {
	const data = actor.system;
	if (data.customModifiers && data.customModifiers.all) {
		const all = data.customModifiers.all;
		for (const modifier of all) {
			if (modifier.label === pf2eModifierName) {
				return modifier.modifier;
			}
		}
	}
	return undefined;
};

async function flattenActor(actor) {
	if (!isUpdatable(actor) || hasModifier(actor) || updatingActors.has(actor)) return;
	updatingActors.add(actor);
	try {
		await addFlatteningModifier(actor);
		await reconcileFlatteningModifier(actor);
	} finally {
		updatingActors.delete(actor);
	}
}

async function addFlatteningModifier(actor) {
	const modifierValue = computeFlatteningValue(actor);
	if (!Number.isFinite(modifierValue)) return;
	await actor.addCustomModifier('all', pf2eModifierName, modifierValue, 'untyped');
}

async function unflattenActor(actor) {
	if (!isUpdatable(actor) || !hasModifier(actor) || updatingActors.has(actor)) return;
	updatingActors.add(actor);
	try {
		await removeFlatteningModifier(actor);
	} finally {
		updatingActors.delete(actor);
	}
}

async function removeFlatteningModifier(actor) {
	const slug = pf2eModifierName.replace(lowerCaseThenUpperCaseRE, "$1-$2").toLowerCase().replace(/['’]/g, "").replace(nonWordCharacterRE, " ").trim().replace(/[-\s]+/g, "-")
	await actor.removeCustomModifier('all', slug);
}

// An external level/settings change can arrive while our writes are pending.
// Check again before releasing the lock; unflatten deliberately never calls this.
async function reconcileFlatteningModifier(actor) {
	for (let attempt = 0; attempt < 5; attempt++) {
		if (!isUpdatable(actor) || !hasModifier(actor) || !Number.isFinite(computeFlatteningValue(actor)) || getFlatteningValue(actor) === computeFlatteningValue(actor)) return;
		await removeFlatteningModifier(actor);
		if (hasModifier(actor)) {
			throw new Error('PF2e Flatten: modifier removal did not persist. Inspect the actor modifier before retrying.');
		}
		await addFlatteningModifier(actor);
	}
	if (hasModifier(actor) && Number.isFinite(computeFlatteningValue(actor)) && getFlatteningValue(actor) !== computeFlatteningValue(actor)) {
		throw new Error('PF2e Flatten: actor changed repeatedly during reconciliation. Retry after the other updates finish.');
	}
}

function computeFlatteningValue(actor) {
	const multiplier = game.settings.get(settingsKey, "multiplier");
	const roundingMode = RoundingModes[RoundingModes.enumFromValue(game.settings.get(settingsKey, "roundingMode"))]
	return -1 * Math.max(roundingMode.func(parseInt(actor?.system['details'].level.value) * multiplier, 0));
}
