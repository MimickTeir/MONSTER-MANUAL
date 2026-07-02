// ═══════════════════════════════════════════════════════════════
//  MONSTER MAKER — 2024 (5.5) Stat Block Renderer + Exports
//  Classic 5e parchment style, 2024 ordering & terminology.
//  Token engine: {NAME} {2d8+5} {DC:STR} {ATK:DEX} {MOD:WIS} {PB}
// ═══════════════════════════════════════════════════════════════

var MM_ABILS = ['str','dex','con','int','wis','cha'];
var MM_ABIL_LABEL = { str:'Str', dex:'Dex', con:'Con', int:'Int', wis:'Wis', cha:'Cha' };

function mmMod(score) { return Math.floor((Number(score||10) - 10) / 2); }
function mmSigned(n) { return (n >= 0 ? '+' : '') + n; }
function mmPB(cr) {
  var r = (typeof mmCrRow === 'function') ? mmCrRow(cr) : null;
  if (r) return r.pb;
  var n = (typeof mmCrNum === 'function') ? mmCrNum(cr) : parseFloat(cr)||0;
  return Math.max(2, Math.ceil(n / 4) + 1);
}
function mmDiceAvg(x, y, z) { return Math.floor(x * (y + 1) / 2) + (z||0); }

// ── Token engine ─────────────────────────────────────────────────
function mmTokens(text, mon) {
  if (!text) return '';
  var pb = mmPB(mon.cr);
  return String(text)
    .replace(/\{NAME\}/g, (mon.name||'the creature'))
    .replace(/\{PB\}/g, mmSigned(pb))
    .replace(/\{DC:(STR|DEX|CON|INT|WIS|CHA)\}/gi, function(_, a){
      return 'DC ' + (8 + pb + mmMod(mon.abil[a.toLowerCase()]));
    })
    .replace(/\{ATK:(STR|DEX|CON|INT|WIS|CHA)\}/gi, function(_, a){
      return mmSigned(pb + mmMod(mon.abil[a.toLowerCase()]));
    })
    .replace(/\{MOD:(STR|DEX|CON|INT|WIS|CHA)\}/gi, function(_, a){
      return mmSigned(mmMod(mon.abil[a.toLowerCase()]));
    })
    .replace(/\{(\d+)d(\d+)([+\-]\d+)?\}/g, function(_, x, y, z){
      x = +x; y = +y; z = z ? +z : 0;
      return mmDiceAvg(x, y, z) + ' (' + x + 'd' + y + (z ? (z > 0 ? ' + ' + z : ' − ' + (-z)) : '') + ')';
    });
}

function _mmEsc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Empty monster factory ────────────────────────────────────────
function mmNewMonster() {
  return {
    name: 'New Creature', size: 'Medium', type: 'Monstrosity', subtype: '', alignment: 'Unaligned',
    cr: '1', ac: 13, acNote: '', hp: 25, hpFormula: '', speed: '30 ft.', initOverride: null,
    abil: { str: 14, dex: 14, con: 12, int: 6, wis: 10, cha: 8 },
    saves: [], skills: '', vuln: '', resist: '', immune: '', condImmune: '',
    senses: '', languages: '—',
    traits: [], actions: [], bonus: [], reactions: [], legendary: [],
    loot: [],
    legCount: 3, lairDesc: '',
    spellAbil: 'cha', spells: { slots: {}, list: [] },
    god: '', biome: '', divine: false, img: '',
    overrides: {}
  };
}

// ── HP formula derivation ────────────────────────────────────────
var MM_HIT_DIE = { Tiny: 4, Small: 6, Medium: 8, Large: 10, Huge: 12, Gargantuan: 20 };
function mmDeriveHpFormula(hp, size, conMod) {
  var die = MM_HIT_DIE[size] || 8;
  var per = (die + 1) / 2 + conMod;
  var n = Math.max(1, Math.round(hp / Math.max(1, per)));
  var avg = Math.floor(n * (die + 1) / 2) + n * conMod;
  return n + 'd' + die + (n * conMod ? (conMod > 0 ? ' + ' + n * conMod : ' − ' + (-n * conMod)) : '') + '|' + avg;
}

// ── Stat block renderer (2024 layout, parchment) ─────────────────
function mmStatblockCSS() {
  return '\n.mm-sb { font-family: "Noto Serif","Bookman Old Style",Georgia,serif; background:#fdf1dc; background-image:radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.35), transparent 70%); color:#1a1208; padding:14px 16px 10px; border-top:4px solid #58180d; border-bottom:4px solid #58180d; box-shadow:0 0 14px rgba(0,0,0,.45); position:relative; font-size:14.5px; line-height:1.35; column-fill:balance }\n.mm-sb.mm-two { column-count:2; column-gap:24px }\n.mm-sb h1 { font-family:"Mr Eaves Small Caps","Noto Serif",Georgia,serif; font-variant:small-caps; font-size:1.55em; color:#58180d; margin:0 0 1px; letter-spacing:.4px; font-weight:700; column-span:all }\n.mm-sb .mm-meta { font-style:italic; font-size:.88em; margin-bottom:6px; column-span:all }\n.mm-sb hr.mm-rule { border:none; height:5px; margin:5px 0; background:#9c2b1b; clip-path:polygon(0 50%, 1.5% 0, 98.5% 0, 100% 50%, 98.5% 100%, 1.5% 100%) }\n.mm-sb .mm-attr { color:#58180d; font-size:.92em; margin:1.5px 0 }\n.mm-sb .mm-attr b { font-weight:700 }\n.mm-sb .mm-flag { display:inline-block; font-size:.7em; background:#b3592b22; color:#9c4511; border:1px solid #9c451166; border-radius:3px; padding:0 4px; margin-left:5px; vertical-align:1px; font-style:italic }\n.mm-sb table.mm-abil { width:100%; border-collapse:collapse; margin:6px 0; font-size:.82em; text-align:center; color:#58180d; break-inside:avoid }\n.mm-sb table.mm-abil th { font-weight:700; border-bottom:1px solid #9c2b1b88; padding:1px 2px }\n.mm-sb table.mm-abil td { padding:1.5px 2px }\n.mm-sb table.mm-abil .mm-ab-name { font-weight:700; text-align:left }\n.mm-sb table.mm-abil tr.mm-ab-row:nth-child(odd) td { background:#9c2b1b12 }\n.mm-sb .mm-sec { font-family:"Mr Eaves Small Caps","Noto Serif",Georgia,serif; font-variant:small-caps; color:#58180d; font-size:1.18em; border-bottom:1.5px solid #58180d; margin:9px 0 4px; padding-bottom:1px; font-weight:700; break-after:avoid }\n.mm-sb .mm-entry { margin:0 0 5.5px; text-align:justify; text-justify:inter-word }\n.mm-sb .mm-entry > i > b, .mm-sb .mm-entry b i { font-style:italic; font-weight:700 }\n.mm-sb .mm-entry .mm-ename { font-weight:700; font-style:italic }\n.mm-sb .mm-flavor { font-style:italic; color:#4a3520; font-size:.9em; margin-top:7px; border-top:1px dashed #9c2b1b55; padding-top:5px }\n.mm-sb .mm-homebrew { font-size:.78em; color:#6a5040; margin-top:6px; font-style:italic }\n';
}

function _mmEntryHTML(e, mon) {
  return '<p class="mm-entry"><span class="mm-ename">' + _mmEsc(e.name) + '.</span> ' + _mmEsc(mmTokens(e.desc, mon)) + '</p>';
}

function mmRenderStatblock(mon, opts) {
  opts = opts || {};
  var pb = mmPB(mon.cr);
  var row = (typeof mmCrRow === 'function') ? mmCrRow(mon.cr) : null;
  var xp = row ? row.xp : 0;
  var dexMod = mmMod(mon.abil.dex);
  var init = (mon.initOverride !== null && mon.initOverride !== undefined && mon.initOverride !== '') ? Number(mon.initOverride) : dexMod;
  var hpF = mon.hpFormula || mmDeriveHpFormula(mon.hp, mon.size, mmMod(mon.abil.con)).split('|')[0];

  var dev = function(field){ return opts.flags && mon.overrides && mon.overrides[field] ? '<span class="mm-flag" title="Deviates from CR ' + mon.cr + ' baseline">⚠ ' + mon.overrides[field] + '</span>' : ''; };

  var h = '<div class="mm-sb' + (opts.two ? ' mm-two' : '') + '">';
  if (mon.img) h += '<div style="margin:-14px -16px 9px;column-span:all"><img src="' + _mmEsc(mon.img) + '" style="width:100%;max-height:300px;object-fit:cover;display:block"></div>';
  h += '<h1>' + _mmEsc(mon.name) + '</h1>';
  h += '<div class="mm-meta">' + _mmEsc(mon.size) + ' ' + _mmEsc(mon.type) + (mon.subtype ? ' (' + _mmEsc(mon.subtype) + ')' : '') + ', ' + _mmEsc(mon.alignment) + '</div>';
  h += '<hr class="mm-rule">';
  h += '<div class="mm-attr"><b>AC</b> ' + _mmEsc(String(mon.ac)) + (mon.acNote ? ' (' + _mmEsc(mon.acNote) + ')' : '') + dev('ac') + ' &nbsp;&nbsp; <b>Initiative</b> ' + mmSigned(init) + ' (' + (10 + init) + ')</div>';
  h += '<div class="mm-attr"><b>HP</b> ' + _mmEsc(String(mon.hp)) + ' (' + _mmEsc(hpF) + ')' + dev('hp') + '</div>';
  h += '<div class="mm-attr"><b>Speed</b> ' + _mmEsc(mon.speed) + '</div>';

  // 2024 ability table: ability | score | mod | save
  h += '<table class="mm-abil"><tr><th></th><th></th><th>Mod</th><th>Save</th><th></th><th></th><th>Mod</th><th>Save</th></tr>';
  var pairs = [['str','int'],['dex','wis'],['con','cha']];
  pairs.forEach(function(p){
    h += '<tr class="mm-ab-row">';
    p.forEach(function(a){
      var sc = mon.abil[a], mo = mmMod(sc);
      var sv = (mon.saves||[]).indexOf(a) !== -1 ? mo + pb : mo;
      h += '<td class="mm-ab-name">' + MM_ABIL_LABEL[a] + '</td><td>' + sc + '</td><td>' + mmSigned(mo) + '</td><td>' + mmSigned(sv) + '</td>';
    });
    h += '</tr>';
  });
  h += '</table>';

  var line = function(label, val){ if (val) h += '<div class="mm-attr"><b>' + label + '</b> ' + _mmEsc(val) + '</div>'; };
  line('Skills', mon.skills);
  line('Vulnerabilities', mon.vuln);
  line('Resistances', mon.resist);
  // 2024 merges damage + condition immunities into one line
  var imm = [mon.immune, mon.condImmune].filter(Boolean).join('; ');
  line('Immunities', imm);
  line('Senses', (mon.senses ? mon.senses + '; ' : '') + 'Passive Perception ' + (10 + mmMod(mon.abil.wis) + ((mon.skills||'').toLowerCase().indexOf('perception') !== -1 ? pb : 0)));
  line('Languages', mon.languages || '—');
  h += '<div class="mm-attr"><b>CR</b> ' + _mmEsc(String(mon.cr)) + ' (XP ' + xp.toLocaleString() + '; PB ' + mmSigned(pb) + ')</div>';

  var section = function(title, arr) {
    if (!arr || !arr.length) return;
    h += '<div class="mm-sec">' + title + '</div>';
    arr.forEach(function(e){ h += _mmEntryHTML(e, mon); });
  };
  if (mon.traits.length) { h += '<hr class="mm-rule">'; mon.traits.forEach(function(e){ h += _mmEntryHTML(e, mon); }); }

  // Spellcasting → rendered at top of Actions (2024 convention)
  var spellBlock = '';
  var sp = (typeof mmNormSpells === 'function') ? mmNormSpells(mon) : (mon.spells || {});
  if ((sp.list || []).length) {
    var dc = 8 + pb + mmMod(mon.abil[mon.spellAbil||'cha']);
    var abilName = ({str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'})[mon.spellAbil||'cha'];
    spellBlock = '<p class="mm-entry"><span class="mm-ename">Spellcasting.</span> ' + _mmEsc(mon.name) + ' casts one of the following spells, using ' +
      abilName + ' as the spellcasting ability (spell save DC ' + dc + '):</p>';
    var byLvl = {};
    sp.list.forEach(function(s){ var l = s.level||0; (byLvl[l] = byLvl[l] || []).push(s.name); });
    Object.keys(byLvl).map(Number).sort(function(a,b){ return a-b; }).forEach(function(l){
      var label;
      if (l === 0) { label = '<b>At Will:</b>'; }
      else { var k = sp.slots[l] || 0; label = '<b>' + mmSpellLevelLabel(l) + '-level (' + k + ' slot' + (k===1?'':'s') + '):</b>'; }
      spellBlock += '<p class="mm-entry" style="margin-left:1em">' + label + ' <i>' + _mmEsc(byLvl[l].join(', ')) + '</i></p>';
    });
    // Homebrew custom spells with their own write-up
    sp.list.filter(function(s){ return s.custom && s.desc; }).forEach(function(s){
      spellBlock += '<p class="mm-entry" style="margin-left:1em;font-size:.92em"><i>' + _mmEsc(s.name) + ' (' + (s.level===0?'cantrip':mmSpellLevelLabel(s.level)+'-level') + ').</i> ' + _mmEsc(mmTokens(s.desc, mon)) + '</p>';
    });
  }
  if (mon.actions.length || spellBlock) {
    h += '<div class="mm-sec">Actions</div>' + spellBlock;
    mon.actions.forEach(function(e){ h += _mmEntryHTML(e, mon); });
  }
  section('Bonus Actions', mon.bonus);
  section('Reactions', mon.reactions);
  if (mon.legendary.length) {
    h += '<div class="mm-sec">Legendary Actions</div>';
    h += '<p class="mm-entry" style="font-style:italic;font-size:.9em">Legendary Action Uses: ' + (mon.legCount||3) + '. Immediately after another creature\u2019s turn, ' + _mmEsc(mon.name) + ' can expend a use to take one of the following actions. It regains all expended uses at the start of each of its turns.</p>';
    mon.legendary.forEach(function(e){ h += _mmEntryHTML(e, mon); });
  }
  if ((mon.loot||[]).length) {
    h += '<div class="mm-sec">Loot</div>';
    mon.loot.forEach(function(e){ h += _mmEntryHTML(e, mon); });
  }
  if (mon.god || mon.biome || mon.divine) {
    h += '<div class="mm-homebrew">⛰ Shattered Isles: ' + [mon.divine ? 'Divine Beast' : '', mon.god ? 'God: ' + _mmEsc(mon.god) : '', mon.biome ? 'Biome: ' + _mmEsc(mon.biome) : ''].filter(Boolean).join(' · ') + '</div>';
  }
  h += '</div>';
  return h;
}

// ── Plain-text statblock (for combat tab / MHMM compat) ──────────
function mmStatblockPlainText(mon) {
  var pb = mmPB(mon.cr);
  var row = (typeof mmCrRow === 'function') ? mmCrRow(mon.cr) : null;
  var t = [];
  t.push(mon.name);
  t.push('');
  t.push(mon.size + ' ' + mon.type + (mon.subtype ? ' (' + mon.subtype + ')' : '') + ', ' + mon.alignment);
  t.push('');
  t.push('Armor Class ' + mon.ac + (mon.acNote ? ' (' + mon.acNote + ')' : ''));
  t.push('Hit Points ' + mon.hp + ' (' + (mon.hpFormula || mmDeriveHpFormula(mon.hp, mon.size, mmMod(mon.abil.con)).split('|')[0]) + ')');
  t.push('Speed ' + mon.speed);
  t.push('');
  t.push('STR DEX CON INT WIS CHA');
  t.push(MM_ABILS.map(function(a){ return mon.abil[a] + ' (' + mmSigned(mmMod(mon.abil[a])) + ')'; }).join(' '));
  t.push('');
  if ((mon.saves||[]).length) t.push('Saving Throws ' + mon.saves.map(function(a){ return MM_ABIL_LABEL[a] + ' ' + mmSigned(mmMod(mon.abil[a]) + pb); }).join(', '));
  if (mon.skills) t.push('Skills ' + mon.skills);
  if (mon.vuln) t.push('Damage Vulnerabilities ' + mon.vuln);
  if (mon.resist) t.push('Damage Resistances ' + mon.resist);
  if (mon.immune) t.push('Damage Immunities ' + mon.immune);
  if (mon.condImmune) t.push('Condition Immunities ' + mon.condImmune);
  t.push('Senses ' + (mon.senses ? mon.senses + ', ' : '') + 'passive Perception ' + (10 + mmMod(mon.abil.wis)));
  t.push('Languages ' + (mon.languages || '—'));
  t.push('Challenge ' + mon.cr + ' (' + (row ? row.xp.toLocaleString() : '?') + ' XP) Proficiency ' + mmSigned(pb));
  t.push('');
  mon.traits.forEach(function(e){ t.push(e.name + '. ' + mmTokens(e.desc, mon)); t.push(''); });
  var sec = function(title, arr){ if (!arr.length) return; t.push(title); t.push(title); arr.forEach(function(e){ t.push(e.name + '. ' + mmTokens(e.desc, mon)); t.push(''); }); };
  sec('Actions', mon.actions);
  sec('Bonus Actions', mon.bonus);
  sec('Reactions', mon.reactions);
  sec('Legendary Actions', mon.legendary);
  if ((mon.loot||[]).length) {
    t.push('Loot');
    mon.loot.forEach(function(e){ t.push(e.name + (e.desc ? '. ' + mmTokens(e.desc, mon) : '')); });
    t.push('');
  }
  return t.join('\n');
}

// ── Exports ──────────────────────────────────────────────────────
function mmExportJSON(mon) {
  var blob = new Blob([JSON.stringify(mon, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (mon.name||'monster').replace(/[^\w\- ]/g,'') + '.json';
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
}

function mmExportMarkdown(mon) {
  var pb = mmPB(mon.cr);
  var row = (typeof mmCrRow === 'function') ? mmCrRow(mon.cr) : null;
  var L = [];
  L.push('{{monster,frame');
  L.push('## ' + mon.name);
  L.push('*' + mon.size + ' ' + mon.type + (mon.subtype ? ' (' + mon.subtype + ')' : '') + ', ' + mon.alignment + '*');
  L.push('___');
  L.push('**Armor Class** :: ' + mon.ac + (mon.acNote ? ' (' + mon.acNote + ')' : ''));
  L.push('**Hit Points** :: ' + mon.hp + ' (' + (mon.hpFormula || mmDeriveHpFormula(mon.hp, mon.size, mmMod(mon.abil.con)).split('|')[0]) + ')');
  L.push('**Speed** :: ' + mon.speed);
  L.push('___');
  L.push('|STR|DEX|CON|INT|WIS|CHA|');
  L.push('|:---:|:---:|:---:|:---:|:---:|:---:|');
  L.push('|' + MM_ABILS.map(function(a){ return mon.abil[a] + ' (' + mmSigned(mmMod(mon.abil[a])) + ')'; }).join('|') + '|');
  L.push('___');
  if ((mon.saves||[]).length) L.push('**Saving Throws** :: ' + mon.saves.map(function(a){ return MM_ABIL_LABEL[a] + ' ' + mmSigned(mmMod(mon.abil[a]) + pb); }).join(', '));
  if (mon.skills) L.push('**Skills** :: ' + mon.skills);
  if (mon.vuln) L.push('**Damage Vulnerabilities** :: ' + mon.vuln);
  if (mon.resist) L.push('**Damage Resistances** :: ' + mon.resist);
  var imm = [mon.immune, mon.condImmune].filter(Boolean).join('; ');
  if (imm) L.push('**Immunities** :: ' + imm);
  L.push('**Senses** :: ' + (mon.senses ? mon.senses + ', ' : '') + 'passive Perception ' + (10 + mmMod(mon.abil.wis)));
  L.push('**Languages** :: ' + (mon.languages || '—'));
  L.push('**Challenge** :: ' + mon.cr + ' (' + (row ? row.xp.toLocaleString() : '?') + ' XP, PB ' + mmSigned(pb) + ')');
  L.push('___');
  mon.traits.forEach(function(e){ L.push('***' + e.name + '.*** ' + mmTokens(e.desc, mon)); L.push(':'); });
  var sec = function(title, arr){ if (!arr.length) return; L.push('### ' + title); arr.forEach(function(e){ L.push('***' + e.name + '.*** ' + mmTokens(e.desc, mon)); L.push(':'); }); };
  sec('Actions', mon.actions);
  sec('Bonus Actions', mon.bonus);
  sec('Reactions', mon.reactions);
  if (mon.legendary.length) {
    L.push('### Legendary Actions');
    L.push('Legendary Action Uses: ' + (mon.legCount||3) + '.');
    L.push(':');
    mon.legendary.forEach(function(e){ L.push('***' + e.name + '.*** ' + mmTokens(e.desc, mon)); L.push(':'); });
  }
  if ((mon.loot||[]).length) {
    L.push('### Loot');
    mon.loot.forEach(function(e){ L.push('***' + e.name + '.*** ' + mmTokens(e.desc||'', mon)); L.push(':'); });
  }
  L.push('}}');
  var md = L.join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(md);
  return md;
}

function mmExportPrint(mon) {
  var w = window.open('', '_blank');
  if (!w) { alert('Pop-up blocked — allow pop-ups to print.'); return; }
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + _mmEsc(mon.name) + '</title><style>' +
    'body{margin:24px;background:#fff;display:flex;justify-content:center}' +
    '.wrap{max-width:760px;width:100%}' + mmStatblockCSS() +
    '@media print { body{margin:0} .mm-sb{box-shadow:none} }' +
    '</style></head><body><div class="wrap">' + mmRenderStatblock(mon, { two: (mon.actions.length + mon.traits.length + mon.legendary.length) > 6 }) + '</div>' +
    '<script>setTimeout(function(){window.print()},400)<\/script></body></html>');
  w.document.close();
}

// ── Universal read-only stat-block viewer ────────────────────────
// Pops the 2024 parchment stat block in a lightweight modal. Used by the
// Bestiary, Homebrew Manual and MH Library so any creature opens the same
// neat character-sheet view the Forge preview shows.
function _mmEnsureStatblockCSS() {
  if (document.getElementById('mm-sb-global-css')) return;
  var st = document.createElement('style');
  st.id = 'mm-sb-global-css';
  st.textContent = mmStatblockCSS();
  document.head.appendChild(st);
}
function mmViewStatblock(mon) {
  if (!mon) return;
  _mmEnsureStatblockCSS();
  var ov = document.getElementById('mm-sb-modal');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'mm-sb-modal';
    ov.className = 'modal-overlay';
    ov.style.zIndex = '1200';
    ov.addEventListener('click', function(e){ if (e.target === ov) ov.classList.remove('active'); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') ov.classList.remove('active'); });
    document.body.appendChild(ov);
  }
  var heavy = (mon.actions.length + mon.traits.length + (mon.legendary||[]).length + (mon.bonus||[]).length) > 9;
  ov.innerHTML =
    '<div style="position:relative;width:100%;max-width:' + (heavy ? '760px' : '640px') + '">' +
      '<button onclick="document.getElementById(\'mm-sb-modal\').classList.remove(\'active\')" title="Close" ' +
        'style="position:absolute;top:-13px;right:-13px;z-index:3;width:34px;height:34px;border-radius:50%;border:2px solid #58180d;background:#fdf1dc;color:#58180d;font-size:17px;line-height:1;cursor:pointer;box-shadow:0 2px 9px rgba(0,0,0,.55);font-family:Georgia,serif">\u2715</button>' +
      '<div style="max-height:88vh;overflow-y:auto;box-shadow:0 10px 40px rgba(0,0,0,.6);border-radius:3px">' +
        mmRenderStatblock(mon, { flags:false, two: heavy }) +
      '</div>' +
    '</div>';
  ov.classList.add('active');
}
