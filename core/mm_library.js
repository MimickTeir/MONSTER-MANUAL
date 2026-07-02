// ═══════════════════════════════════════════════════════════════
//  MONSTER MAKER — Global Component Library + Legacy Ingestion
//  Categories: traits (traits & standard actions), legendary, spells
//  Stored in localStorage 'mm_library_v1' (auto-namespaced per file).
// ═══════════════════════════════════════════════════════════════

var MM_LIB_KEY = 'mm_library_v1';
var _mmLibCache = null;

function mmLib() {
  if (_mmLibCache) return _mmLibCache;
  try { _mmLibCache = JSON.parse(localStorage.getItem(MM_LIB_KEY)) || null; } catch(e) { _mmLibCache = null; }
  if (!_mmLibCache || typeof _mmLibCache !== 'object') _mmLibCache = { traits: [], legendary: [], spells: [], scanned: false };
  ['traits','legendary','spells'].forEach(function(k){ if (!Array.isArray(_mmLibCache[k])) _mmLibCache[k] = []; });
  return _mmLibCache;
}
function mmLibSave() {
  try { localStorage.setItem(MM_LIB_KEY, JSON.stringify(mmLib())); } catch(e) { console.error('mmLibSave', e); }
}

// ── Normalization & dedup ────────────────────────────────────────
function _mmNorm(s) { return String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }

// Strip variable numbers so "DC 14 ... 2d8+5" and "DC 16 ... 3d8+6" hash the same
function _mmParamNorm(s) {
  return _mmNorm(String(s||'')
    .replace(/\{[^}]*\}/g,'#')
    .replace(/\d+\s*\(\d+d\d+(\s*[+\-]\s*\d+)?\)/g,'#')
    .replace(/\d+d\d+(\s*[+\-]\s*\d+)?/g,'#')
    .replace(/DC\s*\d+/gi,'#')
    .replace(/[+\-]\d+\s+to\s+hit/gi,'#')
    .replace(/\d+/g,'#'));
}
function _mmHash(name, desc) { return _mmNorm(name) + '\u0001' + _mmParamNorm(desc); }

// ── Tokenization (legacy text → bracket tokens) ──────────────────
var _MM_SAVE_ABIL = { strength:'STR', dexterity:'DEX', constitution:'CON', intelligence:'INT', wisdom:'WIS', charisma:'CHA' };

function mmTokenizeText(text, creatureName) {
  var t = String(text||'');
  // Creature name → {NAME} (case-insensitive, word-boundary)
  if (creatureName && creatureName.length > 2) {
    var esc = creatureName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    t = t.replace(new RegExp('\\b' + esc + '\\b','gi'), '{NAME}');
  }
  // "DC 15 Strength saving throw" → "{DC:STR} Strength saving throw"
  t = t.replace(/DC\s*\d+\s+(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/gi, function(_, abil){
    return '{DC:' + _MM_SAVE_ABIL[abil.toLowerCase()] + '} ' + abil;
  });
  // "14 (2d8 + 5)" → "{2d8+5}"
  t = t.replace(/\d+\s*\((\d+d\d+)(\s*[+\-]\s*\d+)?\)/g, function(_, dice, mod){
    return '{' + dice + (mod ? mod.replace(/\s+/g,'') : '') + '}';
  });
  return t;
}

// ── Tag inference ────────────────────────────────────────────────
var _MM_TAG_RULES = [
  [/fire damage/i,'Fire'],[/cold damage/i,'Cold'],[/lightning damage/i,'Lightning'],
  [/poison(ed)? /i,'Poison'],[/acid damage/i,'Acid'],[/necrotic/i,'Necrotic'],
  [/radiant/i,'Radiant'],[/psychic/i,'Psychic'],[/thunder damage/i,'Thunder'],
  [/melee (weapon |attack )?(attack|roll)/i,'Melee'],[/ranged (weapon |attack )?(attack|roll)/i,'Ranged'],
  [/recharge/i,'Recharge'],[/saving throw/i,'Save'],[/each creature (in|within)/i,'AoE'],
  [/grappled?/i,'Grapple'],[/prone/i,'Knockdown'],[/frightened/i,'Fear'],
  [/regain(s)? .*hit points|heal/i,'Healing'],[/swallow/i,'Swallow'],[/breath/i,'Breath'],
  [/legendary resistance/i,'Legendary Resistance'],[/magic resistance/i,'Magic Resistance'],
  [/multiattack/i,'Multiattack'],[/spellcasting/i,'Spellcasting']
];
function mmInferTags(name, desc) {
  var s = name + ' ' + desc, tags = [];
  _MM_TAG_RULES.forEach(function(r){ if (r[0].test(s) && tags.indexOf(r[1]) === -1) tags.push(r[1]); });
  return tags.slice(0, 5);
}

// ── Add / update / remove ────────────────────────────────────────
var _mmLibIdC = 0;
function _mmLibId() { return 'lib_' + Date.now().toString(36) + '_' + (++_mmLibIdC); }

// Returns: 'added' | 'dup' | 'variant'
function mmLibAdd(cat, item, opts) {
  opts = opts || {};
  var lib = mmLib();
  var arr = lib[cat]; if (!arr) return 'bad-cat';
  var name = String(item.name||'').trim();
  var desc = String(item.desc||'').trim();
  if (!name || !desc) return 'empty';
  var hash = _mmHash(name, desc);
  var exactN = _mmNorm(name), exactD = _mmNorm(desc);

  for (var i = 0; i < arr.length; i++) {
    var e = arr[i];
    if (_mmNorm(e.name) === exactN) {
      if (_mmNorm(e.desc) === exactD) {                       // exact duplicate
        if (item.origin && (e.origins||[]).indexOf(item.origin) === -1) { e.origins = e.origins||[]; e.origins.push(item.origin); }
        return 'dup';
      }
      if (e.hash === hash) {                                   // same once parameterized
        if (!e.tokenized && opts.tokenize !== false) { e.desc = mmTokenizeText(e.desc, e.sourceCreature); e.tokenized = true; }
        if (item.origin && (e.origins||[]).indexOf(item.origin) === -1) { e.origins = e.origins||[]; e.origins.push(item.origin); }
        return 'variant';
      }
    }
  }
  arr.push({
    id: _mmLibId(), name: name,
    desc: opts.tokenize === false ? desc : mmTokenizeText(desc, item.sourceCreature),
    kind: item.kind || (cat === 'legendary' ? 'legendary' : 'action'),
    tags: item.tags && item.tags.length ? item.tags : mmInferTags(name, desc),
    origins: item.origin ? [item.origin] : [],
    sourceCreature: item.sourceCreature || '',
    hash: hash, tokenized: opts.tokenize !== false,
    custom: !!item.custom, meta: item.meta || null
  });
  return 'added';
}

function mmLibRemove(cat, id) {
  var lib = mmLib();
  lib[cat] = (lib[cat]||[]).filter(function(e){ return e.id !== id; });
  mmLibSave();
}
function mmLibUpdate(cat, id, patch) {
  var e = (mmLib()[cat]||[]).find(function(x){ return x.id === id; });
  if (!e) return;
  Object.assign(e, patch);
  e.hash = _mmHash(e.name, e.desc);
  mmLibSave();
}
function mmLibSearch(cat, q, tag, kind) {
  q = _mmNorm(q);
  return (mmLib()[cat]||[]).filter(function(e){
    if (tag && (e.tags||[]).indexOf(tag) === -1) return false;
    if (kind && e.kind !== kind) return false;
    return !q || _mmNorm(e.name).indexOf(q) !== -1 || _mmNorm(e.desc).indexOf(q) !== -1;
  });
}
function mmLibTags(cat) {
  var t = {};
  (mmLib()[cat]||[]).forEach(function(e){ (e.tags||[]).forEach(function(x){ t[x] = (t[x]||0)+1; }); });
  return Object.keys(t).sort(function(a,b){ return t[b]-t[a]; });
}

// ═══════════════════════════════════════════════════════════════
//  LEGACY INGESTION — "Pool Scan"
//  Parses MHMM_LIBRARY + custom variants + divine beasts.
// ═══════════════════════════════════════════════════════════════

var _MM_SECTION_RX = /^(Actions|Bonus Actions|Reactions|Legendary Actions|Mythic Actions|Lair Actions|Villain Actions)$/i;
var _MM_ENTRY_RX = /^([A-Z][A-Za-z'’\- ,]{1,44}?(?:\s*\((?:Recharge[^)]*|\d+\/(?:Day|Turn|Round)[^)]*|Costs \d+ Actions?[^)]*)\))?)\.\s+(\S.*)/;
var _MM_JUNK_NAME_RX = /(armor material|material effects|carve|capture|challenge rating|hit points|speed|languages|senses|saving throws|skills|damage (resist|immun)|condition immun|str$|dex$|con$|int$|wis$|cha$)/i;

// Parse one raw statblock text → { traits:[], actions:[], bonus:[], reactions:[], legendary:[] }
function mmParseStatblockText(raw, creatureName) {
  var out = { traits: [], actions: [], bonus: [], reactions: [], legendary: [] };
  if (!raw) return out;
  var lines = String(raw).split('\n');
  var section = 'traits';
  var cur = null;
  var started = false; // skip header until past "Challenge X" line

  function commit() {
    if (!cur) return;
    var d = cur.desc.join(' ').replace(/\s+/g,' ').trim();
    if (d.length >= 25 && !_MM_JUNK_NAME_RX.test(cur.name)) {
      out[cur.section].push({ name: cur.name, desc: d });
    }
    cur = null;
  }

  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i].replace(/\f/g,'').trim();
    if (!ln) continue;
    if (!started) { if (/^Challenge\s/i.test(ln)) started = true; continue; }

    var secM = ln.match(_MM_SECTION_RX);
    if (secM) {
      commit();
      var s = secM[1].toLowerCase();
      section = s.indexOf('legendary') !== -1 || s.indexOf('mythic') !== -1 || s.indexOf('lair') !== -1 || s.indexOf('villain') !== -1 ? 'legendary'
             : s.indexOf('bonus') !== -1 ? 'bonus'
             : s.indexOf('reaction') !== -1 ? 'reactions'
             : 'actions';
      continue;
    }
    // Stop at flavor/loot footer markers
    if (/^(ARMOR MATERIAL|OTHER MATERIAL|WEAPON MATERIAL|Challenge Rating \d)/i.test(ln)) { commit(); break; }

    var m = ln.match(_MM_ENTRY_RX);
    if (m && m[1].split(' ').length <= 7) {
      commit();
      cur = { name: m[1].trim(), desc: [m[2]], section: section };
    } else if (cur) {
      // Continuation line — but a duplicated creature-name line ends the block
      if (creatureName && _mmNorm(ln) === _mmNorm(creatureName)) { commit(); continue; }
      cur.desc.push(ln);
    }
  }
  commit();
  return out;
}

// Full scan across all sources. Returns summary counts.
function mmLibScan(force) {
  var lib = mmLib();
  if (lib.scanned && !force) return null;
  var stats = { added: 0, dups: 0, variants: 0, creatures: 0 };

  function ingest(parsed, origin) {
    ['traits','actions','bonus','reactions'].forEach(function(sec){
      (parsed[sec]||[]).forEach(function(e){
        var kind = sec === 'traits' ? 'trait' : sec === 'bonus' ? 'bonus' : sec === 'reactions' ? 'reaction' : 'action';
        var r = mmLibAdd('traits', { name: e.name, desc: e.desc, kind: kind, origin: origin, sourceCreature: origin });
        if (r === 'added') stats.added++; else if (r === 'dup') stats.dups++; else if (r === 'variant') stats.variants++;
      });
    });
    (parsed.legendary||[]).forEach(function(e){
      var r = mmLibAdd('legendary', { name: e.name, desc: e.desc, kind: 'legendary', origin: origin, sourceCreature: origin });
      if (r === 'added') stats.added++; else if (r === 'dup') stats.dups++; else if (r === 'variant') stats.variants++;
    });
  }

  // 1. MHMM library
  if (typeof MHMM_LIBRARY !== 'undefined') {
    MHMM_LIBRARY.forEach(function(m){
      if (!m.statblock || !m.name || m.name.length > 45) return;
      stats.creatures++;
      ingest(mmParseStatblockText(m.statblock, m.name), m.name);
    });
  }
  // 2. Custom MHMM variants
  if (typeof state !== 'undefined' && Array.isArray(state.mhmmCustom)) {
    state.mhmmCustom.forEach(function(m){
      stats.creatures++;
      if (Array.isArray(m.traits) || Array.isArray(m.actions)) {
        ingest({ traits: m.traits||[], actions: m.actions||[], bonus: m.bonusActions||[], reactions: m.reactions||[], legendary: m.legendaryActions||m.legendary||[] }, m.name);
      } else if (m.statblock) {
        ingest(mmParseStatblockText(m.statblock, m.name), m.name);
      }
    });
  }
  // 3. Divine beasts
  if (typeof state !== 'undefined' && Array.isArray(state.divineBeasts)) {
    state.divineBeasts.forEach(function(b){
      if (!b || !b.name) return;
      var has = false;
      var parsed = { traits: [], actions: [], bonus: [], reactions: [], legendary: [] };
      ['traits','actions','legendary','legendaryActions'].forEach(function(k){
        if (Array.isArray(b[k]) && b[k].length) {
          has = true;
          var dest = k.indexOf('legendary') === 0 ? 'legendary' : k;
          b[k].forEach(function(e){
            if (typeof e === 'string') parsed[dest === 'legendaryActions' ? 'legendary' : dest].push({ name: b.name + ' ability', desc: e });
            else if (e && e.name && (e.desc||e.description)) parsed[dest === 'legendaryActions' ? 'legendary' : dest].push({ name: e.name, desc: e.desc||e.description });
          });
        }
      });
      if (b.statblock && typeof b.statblock === 'string' && b.statblock.length > 100) {
        has = true;
        var p2 = mmParseStatblockText(b.statblock, b.name);
        ['traits','actions','bonus','reactions','legendary'].forEach(function(k){ parsed[k] = parsed[k].concat(p2[k]); });
      }
      if (has) { stats.creatures++; ingest(parsed, b.name + ' (Divine)'); }
    });
  }

  lib.scanned = true;
  lib.scanStats = stats;
  lib.scanDate = Date.now();
  mmLibSave();
  return stats;
}
