// Authored isolated regression fixtures. Licensed under Apache-2.0.
// Simulated Foundry/PF2e APIs only; no runtime, networking, or real data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'bundle.js'), 'utf8');
const LABEL = 'Flattened Level Proficiency';
const SLUG = 'flattened-level-proficiency';
const clone = value => JSON.parse(JSON.stringify(value));
const cases = [];
function test(name, run) { cases.push({ name, run }); }
// Authored API model: label-unique addition, canonical-slug removal, and
// document update payloads. Full PF2e Modifier serialization is not simulated.
class FixtureAPI {
  async addCustomModifier(stat, label, value, type) {
    if (!this.isOfType('character', 'npc')) return;
    const modifiers = this.toObject().system.customModifiers[stat] ?? [];
    if (modifiers.some(m => m.label === label)) return;
    await this.update({ [`system.customModifiers.${stat}`]: [...modifiers,
      {label, modifier:value, type, custom:true, slug:SLUG}] });
  }
  async removeCustomModifier(stat, slug) {
    const modifiers = this.toObject().system.customModifiers[stat] ?? [];
    if (!modifiers.length) return;
    await this.update({ [`system.customModifiers.${stat}`]: modifiers.filter(m => m.slug !== slug) });
  }
}
function setup() {
  const hooks = new Map(), settings = new Map(), records = new Map(), notices = [];
  const game = {
    user: { id: 'gm1', isGM: true }, users: { activeGM: { id: 'gm1' } },
    release: { generation: 14 }, i18n: { localize: x => x },
    settings: {
      register(ns, key, data) { assert.equal(ns, 'pf2e-flatten'); settings.set(key, data.default); },
      get(ns, key) { assert.equal(ns, 'pf2e-flatten'); return settings.get(key); },
    },
    actors: { get: id => records.get(id), filter: fn => [...records.values()].filter(fn) },
  };
  class Directory { _getEntryContextOptions(...args) { this.args = args; return [{label:'Original'}]; } }
  const document = { createElement: tag => ({ tag, classList: {add(){}}, dataset: {}, children: [],
    listeners: {}, append(...items) {this.children.push(...items);}, addEventListener(k,f){this.listeners[k]=f;} }) };
  const context = vm.createContext({ game, document, foundry: { applications: {sidebar: {tabs: {ActorDirectory: Directory}}} },
    ui: {notifications: {info: msg => notices.push(msg)}},
    Hooks: {once: addHook, on: addHook} });
  function addHook(name, fn) { const list = hooks.get(name) ?? []; list.push(fn); hooks.set(name, list); }
  vm.runInContext(source + '\n globalThis.api = {flattenActor, unflattenActor, computeFlatteningValue, hasModifier, isUpdatable};', context, {timeout:1000});
  async function fire(name, ...args) { for (const fn of hooks.get(name) ?? []) await fn(...args); }
  function actor(level = 5, type = 'npc', custom = {}) {
    const a = new FixtureAPI();
    a.id = `a${records.size}`; a.name = 'Fixture'; a.type = type;
    a.system = { details: {level: {value: level}}, customModifiers: clone(custom), baseStats: {ac:22, save:13} };
    a.flags = { pf2e: { fixture: true }, 'pf2e-flatten': { legacy: 'preserve verbatim' }, arbitrary: {value: 17} };
    a.writes = []; a.isOfType = (...types) => types.includes(a.type);
    a.toObject = () => clone({system: a.system, flags: a.flags});
    a.update = async changes => {
      a.writes.push(clone(changes));
      if (a.beforeWrite) await a.beforeWrite();
      for (const [key,value] of Object.entries(changes)) {
        assert.equal(key, 'system.customModifiers.all');
        a.system.customModifiers.all = clone(value);
      }
      await fire('updateActor', a);
    };
    records.set(a.id, a); return a;
  }
  return {game,settings,records,notices,Directory,fire,actor,api:context.api};
}
async function initialized() { const env = setup(); await env.fire('init'); return env; }
test('all settings keys and defaults retained', async () => {
  const e=await initialized(); assert.deepEqual(Object.fromEntries(e.settings), {autoflatten:false,flattenPcs:false,multiplier:1,roundingMode:0});
});
test('exact calculation across negative, zero, odd and high levels, both modes and roundings', async () => {
  const e=await initialized();
  for (const m of [1,0.5]) for (const r of [0,1]) for (const l of [-1,0,1,3,5,20,100,'5']) {
    e.settings.set('multiplier',m); e.settings.set('roundingMode',r);
    assert.equal(e.api.computeFlatteningValue(e.actor(l)), -(r===0?Math.ceil:Math.floor)(parseInt(l)*m));
  }
});
test('NPC flatten/unflatten preserves all flags, source stats and unrelated modifiers', async () => {
  const e=await initialized(), other={label:'Bless',slug:'bless',modifier:1,type:'status'};
  const a=e.actor(5,'npc',{all:[other],fortitude:[other]}), flags=clone(a.flags), stats=clone(a.system.baseStats);
  await e.api.flattenActor(a);
  assert.deepEqual(a.system.customModifiers.all[1], {label:LABEL,modifier:-5,type:'untyped',custom:true,slug:SLUG});
  await e.api.unflattenActor(a);
  assert.deepEqual(a.system.customModifiers,{all:[other],fortitude:[other]});
  assert.deepEqual(a.flags,flags); assert.deepEqual(a.system.baseStats,stats);
  assert.equal(a.writes.length,2);
});
test('sequential and overlapping flatten calls write once', async () => {
  const e=await initialized(),a=e.actor();
  await Promise.all([e.api.flattenActor(a),e.api.flattenActor(a)]); await e.api.flattenActor(a);
  assert.equal(a.writes.length,1); assert.equal(a.system.customModifiers.all.length,1);
});
test('imported flattened actor is skipped without altering its existing value', async () => {
  const e=await initialized();e.settings.set('autoflatten',true);
  const a=e.actor(9,'npc',{all:[{label:LABEL,slug:SLUG,modifier:-5,type:'untyped',custom:true}]});
  await e.fire('createActor',a);assert.equal(a.writes.length,0);assert.equal(e.api.hasModifier(a),true);
});
test('autoflatten affects scratch creation too, preserving actual upstream hook behavior', async () => {
  const e=await initialized(),a=e.actor();e.settings.set('autoflatten',true);
  await e.fire('createActor',a);assert.equal(a.writes.length,1);
});
test('autoflatten default off', async () => {
  const e=await initialized(),a=e.actor();await e.fire('createActor',a);assert.equal(a.writes.length,0);
});
test('PC opt-in and unsupported actors', async () => {
  const e=await initialized(),pc=e.actor(5,'character'),hazard=e.actor(5,'hazard');
  await e.api.flattenActor(pc);await e.api.flattenActor(hazard);assert.equal(pc.writes.length,0);assert.equal(hazard.writes.length,0);
  e.settings.set('flattenPcs',true);await e.api.flattenActor(pc);assert.equal(pc.writes.length,1);
});
test('level change reconciles once without recursive update hooks', async () => {
  const e=await initialized(),a=e.actor();await e.api.flattenActor(a);a.system.details.level.value=9;
  await Promise.all([e.fire('updateActor',a),e.fire('updateActor',a)]);
  assert.equal(a.writes.length,3);assert.equal(a.system.customModifiers.all.length,1);assert.equal(a.system.customModifiers.all[0].modifier,-9);
  await e.fire('updateActor',a);assert.equal(a.writes.length,3);
});
test('changed settings apply on next actor update as upstream', async () => {
  const e=await initialized(),a=e.actor();await e.api.flattenActor(a);e.settings.set('multiplier',0.5);
  await e.fire('updateActor',a);assert.equal(a.system.customModifiers.all[0].modifier,-3);
});
test('non-authority GM and players never execute automatic writes', async () => {
  const e=await initialized();e.settings.set('autoflatten',true);
  e.game.user.id='gm2';const a=e.actor();await e.fire('createActor',a);assert.equal(a.writes.length,0);
  e.game.user.isGM=false;e.game.user.id='gm1';await e.fire('createActor',a);assert.equal(a.writes.length,0);
  e.game.user.isGM=true;e.game.users.activeGM=null;await e.fire('createActor',a);assert.equal(a.writes.length,0);
});
test('non-authority client does not reapply on update', async () => {
  const e=await initialized(),a=e.actor();await e.api.flattenActor(a);e.game.user.id='gm2';a.system.details.level.value=9;
  await e.fire('updateActor',a);assert.equal(a.writes.length,1);
});
test('unflatten uses exact canonical slug, independent of current level/settings', async () => {
  const e=await initialized(),a=e.actor();await e.api.flattenActor(a);a.system.details.level.value=99;
  e.game.user.id='gm2';e.settings.set('multiplier',0.5);await e.api.unflattenActor(a);
  assert.deepEqual(a.system.customModifiers.all,[]);assert.equal(a.writes.length,2);
});
test('zero level stores a recognized zero-valued modifier', async () => {
  const e=await initialized(),a=e.actor(0);await e.api.flattenActor(a);assert.equal(e.api.hasModifier(a),true);
  await e.api.flattenActor(a);assert.equal(a.writes.length,1);await e.api.unflattenActor(a);assert.deepEqual(a.system.customModifiers.all,[]);
});
test('invalid levels cause no new writes or removal', async () => {
  const e=await initialized(),a=e.actor('invalid');await e.api.flattenActor(a);assert.equal(a.writes.length,0);
  a.system.customModifiers.all=[{label:LABEL,slug:SLUG,modifier:-5}];await e.fire('updateActor',a);assert.equal(a.writes.length,0);
});
test('operation lock releases after write failure', async () => {
  const e=await initialized(),a=e.actor();a.beforeWrite=()=>{throw Error('fixture failure');};
  await assert.rejects(e.api.flattenActor(a),/fixture failure/);a.beforeWrite=null;await e.api.flattenActor(a);assert.equal(e.api.hasModifier(a),true);
});
test('level change during a pending flatten write is reconciled before unlocking', async () => {
  const e=await initialized(),a=e.actor();let changed=false;
  a.beforeWrite=async()=>{if(!changed){changed=true;a.system.details.level.value=9;await e.fire('updateActor',a);}};
  await e.api.flattenActor(a);
  assert.equal(a.system.customModifiers.all.length,1);assert.equal(a.system.customModifiers.all[0].modifier,-9);
  assert.equal(a.writes.length,3);
});
test('level change during a pending reapply write converges on latest value', async () => {
  const e=await initialized(),a=e.actor();await e.api.flattenActor(a);a.system.details.level.value=7;
  let writes=0;a.beforeWrite=async()=>{if(++writes===2){a.system.details.level.value=9;await e.fire('updateActor',a);}};
  await e.fire('updateActor',a);
  assert.equal(a.system.customModifiers.all.length,1);assert.equal(a.system.customModifiers.all[0].modifier,-9);
  assert.equal(a.writes.length,5);
});
test('level change during unflatten never re-adds the modifier', async () => {
  const e=await initialized(),a=e.actor();await e.api.flattenActor(a);
  a.beforeWrite=async()=>{a.system.details.level.value=9;await e.fire('updateActor',a);};
  await e.api.unflattenActor(a);assert.deepEqual(a.system.customModifiers.all,[]);assert.equal(a.writes.length,2);
});
test('resolved but canceled removal stops reconciliation and releases the lock', async () => {
  const e=await initialized(),a=e.actor();await e.api.flattenActor(a);a.system.details.level.value=9;
  const update=a.update;let canceled=0;a.update=async()=>{canceled++;};
  await assert.rejects(e.fire('updateActor',a),/modifier removal did not persist/);
  assert.equal(canceled,1);assert.equal(a.system.customModifiers.all[0].modifier,-5);
  assert.equal(e.notices.length,0);
  a.update=update;await e.fire('updateActor',a);assert.equal(a.system.customModifiers.all[0].modifier,-9);
});
test('perpetually changing actor has bounded reconciliation and a released lock', async () => {
  const e=await initialized(),a=e.actor();a.beforeWrite=async()=>{a.system.details.level.value++;await e.fire('updateActor',a);};
  await assert.rejects(e.api.flattenActor(a),/changed repeatedly during reconciliation/);
  assert.equal(a.writes.length,11);
  a.beforeWrite=null;await e.fire('updateActor',a);
  assert.equal(a.system.customModifiers.all[0].modifier,-a.system.details.level.value);
});
test('v14 context schema, base entries, args and missing actor safety', async () => {
  const e=await initialized(),a=e.actor(),d=new e.Directory(),entries=d._getEntryContextOptions('argument');
  assert.deepEqual(d.args,['argument']);assert.equal(entries.length,3);assert.equal(entries[2].label,'Original');
  const f=entries.find(x=>x.label==='PF2e Flatten NPC'),u=entries.find(x=>x.label==='PF2e Unflatten NPC'),li={dataset:{entryId:a.id}};
  assert.equal(f.visible(li),true);assert.equal(u.visible(li),false);assert.equal(f.visible({dataset:{entryId:'missing'}}),false);
  assert.equal('name' in f,false);assert.equal('callback' in f,false);assert.equal('condition' in f,false);
  await f.onClick({},li);assert.equal(u.visible(li),true);await u.onClick({},li);assert.equal(f.visible(li),true);
});
test('directory button insertion, repeated render, missing header, and GM gate', async () => {
  const e=await initialized(),rows=[],anchor={after:x=>rows.push(x)},header={append:x=>rows.push(x)};
  const html={querySelector:s=>s==='[data-ref=flatten-row]'?rows[0]??null:s.includes('.action-buttons')?anchor:header};
  await e.fire('renderActorDirectory',{},html,{});assert.equal(rows.length,1);assert.equal(rows[0].children.length,2);
  const a=e.actor(),ev={preventDefault(){},stopPropagation(){}};
  await rows[0].children[0].listeners.click(ev);assert.equal(e.api.hasModifier(a),true);
  await rows[0].children[1].listeners.click(ev);assert.equal(e.api.hasModifier(a),false);
  await e.fire('renderActorDirectory',{},html,{});assert.equal(rows.length,1);
  await e.fire('renderActorDirectory',{}, {querySelector:()=>null}, {});
  e.game.user.isGM=false;await e.fire('renderActorDirectory',{}, {querySelector:()=>{throw Error('should skip');}}, {});
});
test('v14 header-part fallback inserts buttons', async () => {
  const e=await initialized(),rows=[];
  await e.fire('renderActorDirectory',{}, {querySelector:s=>s.includes('data-application-part')?{append:x=>rows.push(x)}:null}, {});
  assert.equal(rows.length,1);
});
test('manifest retains namespace and serves the matching maintained release', () => {
  const m=JSON.parse(fs.readFileSync(path.join(root,'module.json'),'utf8'));
  assert.equal(m.id,'pf2e-flatten');assert.equal(m.compatibility.maximum,'14');assert.equal(m.compatibility.verified,'14.369');
  assert.equal(m.version,'0.6.5');
  assert.equal(m.relationships.systems[0].compatibility.verified,'8.6.0');
  assert.equal(m.url,'https://github.com/Kaisvoresce/pf2e-flatten-v14');
  assert.equal(m.manifest,'https://raw.githubusercontent.com/Kaisvoresce/pf2e-flatten-v14/main/module.json');
  assert.equal(m.download,'https://github.com/Kaisvoresce/pf2e-flatten-v14/releases/download/v0.6.5/pf2e-flatten-0.6.5.zip');
  assert.ok(!/setFlag|unsetFlag|flags\./.test(source));
});
(async()=>{
  let failed=0;
  for(const {name,run} of cases){try{await run();console.log(`PASS ${name}`);}catch(error){failed++;console.error(`FAIL ${name}\n${error.stack}`);}}
  console.log(`${cases.length-failed}/${cases.length} tests passed`);process.exitCode=failed?1:0;
})();
