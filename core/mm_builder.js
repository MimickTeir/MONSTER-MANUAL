// ═══════════════════════════════════════════════════════════════
//  MONSTER MAKER — Reactive Editor ("The Forge")
//  CR auto-fill · override flags · live CR estimator · tokens ·
//  library attach/save · layout variations · 2024 stat block
// ═══════════════════════════════════════════════════════════════

var _mmM = null;            // active monster object
var _mmBaseline = null;     // CR row used for deviation flags
var _mmEditCustomId = null; // editing an existing custom entry
var _mmTab = 'build';       // 'build' | 'library'
var _mmLayout = localStorage.getItem('mm_layout') || 'split';
var _mmPreviewTimer = null;
var _mmLibCat = 'traits';
var _mmLibQ = ''; var _mmLibTag = ''; var _mmLibKind = '';

var MM_SIZES = ['Tiny','Small','Medium','Large','Huge','Gargantuan'];
var MM_TYPES = ['Aberration','Beast','Celestial','Construct','Dragon','Elemental','Fey','Fiend','Giant','Humanoid','Monstrosity','Ooze','Plant','Undead','Wyvern','Leviathan'];
var MM_SECTIONS = [
  { key:'traits',    label:'Traits',            kind:'trait' },
  { key:'actions',   label:'Actions',           kind:'action' },
  { key:'bonus',     label:'Bonus Actions',     kind:'bonus' },
  { key:'reactions', label:'Reactions',         kind:'reaction' },
  { key:'legendary', label:'Legendary / Lair',  kind:'legendary' }
];

// ── Styles ───────────────────────────────────────────────────────
function _mmCSS() {
  return '#mm-tab-root{position:relative;height:100%;min-height:0;background:#16120c;display:flex;flex-direction:column;font-family:inherit}' +
  '#mm-head{display:flex;gap:.6rem;align-items:center;padding:.5rem .9rem;background:#1f1810;border-bottom:2px solid #58180d;flex-shrink:0;flex-wrap:wrap}' +
  '#mm-head h2{margin:0;font-size:1.05rem;color:#c9a84c;letter-spacing:.5px}' +
  '.mm-tabbtn{padding:.28rem .7rem;border-radius:6px;cursor:pointer;font-family:inherit;font-size:.8rem;border:1px solid rgba(201,168,76,.35);background:transparent;color:#c9a84c99}' +
  '.mm-tabbtn.on{background:rgba(201,168,76,.18);color:#c9a84c;border-color:#c9a84c}' +
  '.mm-laybtn{padding:.22rem .5rem;border-radius:5px;cursor:pointer;font-family:inherit;font-size:.72rem;border:1px solid rgba(255,255,255,.15);background:transparent;color:#888}' +
  '.mm-laybtn.on{background:rgba(112,184,224,.15);color:#70b8e0;border-color:#70b8e066}' +
  '#mm-body{flex:1;overflow:hidden;display:flex;min-height:0}' +
  '#mm-edit{overflow-y:auto;padding:.8rem;box-sizing:border-box}' +
  '#mm-prev{overflow-y:auto;padding:.8rem;box-sizing:border-box;background:#0e0b07}' +
  '.mm-split #mm-edit{width:54%;border-right:1px solid rgba(255,255,255,.08)}.mm-split #mm-prev{width:46%}' +
  '.mm-stack #mm-body{flex-direction:column}.mm-stack #mm-edit{width:100%;max-height:55%}.mm-stack #mm-prev{width:100%;flex:1}' +
  '.mm-tabbed #mm-edit{width:100%}.mm-tabbed #mm-prev{width:100%}' +
  '.mm-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:.6rem;margin-bottom:.6rem}' +
  '.mm-card h3{margin:0 0 .45rem;font-size:.78rem;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}' +
  '.mm-grid{display:grid;gap:.4rem}.mm-g2{grid-template-columns:1fr 1fr}.mm-g3{grid-template-columns:1fr 1fr 1fr}.mm-g4{grid-template-columns:1fr 1fr 1fr 1fr}.mm-g6{grid-template-columns:repeat(6,1fr)}' +
  '.mm-f label{display:block;font-size:.62rem;color:#9a8a6a;margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px}' +
  '.mm-f input,.mm-f select,.mm-f textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.84rem;font-family:inherit;outline:none;padding:.3rem .4rem}' +
  '.mm-f input:focus,.mm-f select:focus,.mm-f textarea:focus{border-color:#c9a84c88}' +
  '.mm-f input.mm-dev{border-color:#c77b3a;background:rgba(199,123,58,.1)}' +
  '.mm-devnote{font-size:.6rem;color:#c77b3a;margin-top:1px}' +
  '.mm-entry-row{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:.4rem;margin-bottom:.35rem}' +
  '.mm-entry-row input,.mm-entry-row textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.13);border-radius:5px;font-size:.82rem;font-family:inherit;outline:none;padding:.26rem .38rem}' +
  '.mm-entry-row textarea{resize:vertical;min-height:52px;margin-top:.25rem}' +
  '.mm-ebtn{padding:.14rem .4rem;border-radius:4px;cursor:pointer;font-size:.66rem;font-family:inherit;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);color:#aaa}' +
  '.mm-ebtn:hover{background:rgba(255,255,255,.12)}' +
  '.mm-addbtn{padding:.24rem .6rem;border-radius:5px;cursor:pointer;font-size:.74rem;font-family:inherit;border:1px dashed rgba(201,168,76,.4);background:transparent;color:#c9a84c}' +
  '.mm-libsearch{position:relative;flex:1;min-width:140px}' +
  '.mm-libsearch input{width:100%;box-sizing:border-box;background:rgba(112,184,224,.07);color:#cde;border:1px solid rgba(112,184,224,.25);border-radius:5px;font-size:.72rem;font-family:inherit;outline:none;padding:.2rem .35rem}' +
  '.mm-libdrop{position:absolute;top:100%;left:0;right:0;z-index:50;background:#241d12;border:1px solid rgba(112,184,224,.4);border-radius:6px;max-height:220px;overflow-y:auto;box-shadow:0 6px 18px rgba(0,0,0,.6)}' +
  '.mm-libdrop div{padding:.3rem .45rem;font-size:.74rem;color:#cbbfa0;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05)}' +
  '.mm-libdrop div:hover{background:rgba(112,184,224,.12)}' +
  '.mm-chip{display:inline-flex;align-items:center;gap:.25rem;background:rgba(144,120,200,.15);border:1px solid rgba(144,120,200,.4);color:#b8a8e0;border-radius:10px;padding:.08rem .45rem;font-size:.72rem;margin:.12rem .15rem 0 0;cursor:default}' +
  '.mm-chip b{cursor:pointer;color:#d0c0f0}' +
  '.mm-est{display:flex;gap:.7rem;align-items:center;font-size:.78rem;flex-wrap:wrap}' +
  '.mm-estcr{font-size:1.3rem;font-weight:bold;color:#c9a84c}' +
  '.mm-tag{display:inline-block;background:rgba(128,192,128,.12);border:1px solid rgba(128,192,128,.3);color:#90c890;border-radius:8px;padding:0 .4rem;font-size:.64rem;margin-right:.2rem;cursor:pointer}' +
  '.mm-modsel{text-align:center}.mm-modsel select{text-align:center}' +
  '#mm-prev-tools{display:flex;gap:.4rem;margin-bottom:.6rem;flex-wrap:wrap}' +
  '#mm-prev-tools button{padding:.26rem .6rem;border-radius:5px;cursor:pointer;font-size:.74rem;font-family:inherit;border:1px solid rgba(201,168,76,.4);background:rgba(201,168,76,.1);color:#c9a84c}' +
  mmStatblockCSS();
}

// ── Open / close ─────────────────────────────────────────────────
function mmOpenMaker(existingMon) {
  if (typeof gmMode !== 'undefined' && !gmMode) { alert('Keeper only.'); return; }
  _mmM = existingMon || mmNewMonster();
  _mmEditCustomId = existingMon && existingMon._customId || null;
  _mmBaseline = mmCrRow(_mmM.cr);
  // auto-scan library on first open
  try { var s = mmLibScan(false); if (s) console.log('[Forge] Library scan:', s); } catch(e) { console.error(e); }
  _mmTab = 'build';
  mmShowForgeTab(true);
}
function mmCloseMaker() {
  if (typeof showTab === 'function') { try { showTab('divine-beasts'); } catch(e) {} }
}

// Render the Forge into its dedicated tab (DM only)
function mmShowForgeTab(forceRender) {
  if (typeof gmMode !== 'undefined' && !gmMode) return;
  if (!document.getElementById('mm-style')) {
    var st = document.createElement('style'); st.id = 'mm-style'; st.textContent = _mmCSS();
    document.head.appendChild(st);
  }
  var root = document.getElementById('mm-tab-root'); if (!root) return;
  if (!_mmM) {
    _mmM = mmNewMonster();
    _mmBaseline = mmCrRow(_mmM.cr);
    try { var s = mmLibScan(false); if (s) console.log('[Forge] Library scan:', s); } catch(e) {}
  }
  if (typeof showTab === 'function') { try { showTab('creature-forge'); } catch(e) {} }
  if (forceRender || root.dataset.ready !== '1') { root.dataset.ready = '1'; _mmRenderShell(); }
  _mmRefreshBestiaryCat();
}

// Lazy-render when the tab is opened from any nav (sidebar, bubble, hidden nav)
document.addEventListener('click', function(e){
  var t = e.target && e.target.closest ? e.target.closest('[data-tab="creature-forge"], #tab-btn-creature-forge') : null;
  if (t) setTimeout(function(){ mmShowForgeTab(false); }, 0);
});

function _mmRenderShell() {
  var ov = document.getElementById('mm-tab-root'); if (!ov) return;
  var layCls = _mmLayout === 'stack' ? 'mm-stack' : _mmLayout === 'tabbed' ? 'mm-tabbed' : 'mm-split';
  ov.innerHTML =
    '<div id="mm-head">' +
      '<h2>⚒ The Forge</h2>' +
      '<button class="mm-tabbtn' + (_mmTab==='build'?' on':'') + '" onclick="_mmTab=\'build\';_mmRenderShell()">Builder</button>' +
      '<button class="mm-tabbtn' + (_mmTab==='library'?' on':'') + '" onclick="_mmTab=\'library\';_mmRenderShell()">📚 Library Manager</button>' +
      '<span style="flex:1"></span>' +
      (_mmTab==='build' ?
        '<span style="font-size:.66rem;color:#777">Layout:</span>' +
        '<button class="mm-laybtn' + (_mmLayout==='split'?' on':'') + '" onclick="_mmSetLayout(\'split\')">◧ Split</button>' +
        '<button class="mm-laybtn' + (_mmLayout==='stack'?' on':'') + '" onclick="_mmSetLayout(\'stack\')">⬓ Stacked</button>' +
        '<button class="mm-laybtn' + (_mmLayout==='tabbed'?' on':'') + '" onclick="_mmSetLayout(\'tabbed\')">▭ Tabbed</button>' : '') +
      '<button class="mm-tabbtn" style="border-color:#80c08066;color:#80c080" onclick="_mmSaveToCompendium()">💾 Save to Bestiary</button>' +
      '<button class="mm-tabbtn" style="border-color:#c0707066;color:#c07070" onclick="mmCloseMaker()">← Bestiary</button>' +
    '</div>' +
    '<div id="mm-body" class="' + layCls + '"></div>';
  if (_mmTab === 'library') { _mmRenderLibraryManager(); return; }
  var body = document.getElementById('mm-body');
  if (_mmLayout === 'tabbed') {
    body.innerHTML = '<div style="width:100%;display:flex;flex-direction:column;min-height:0">' +
      '<div style="display:flex;gap:.4rem;padding:.4rem .8rem;border-bottom:1px solid rgba(255,255,255,.08)">' +
      '<button class="mm-laybtn on" id="mm-tb-edit" onclick="_mmTabbedShow(\'edit\')">✏ Edit</button>' +
      '<button class="mm-laybtn" id="mm-tb-prev" onclick="_mmTabbedShow(\'prev\')">📜 Preview</button></div>' +
      '<div style="flex:1;display:flex;min-height:0"><div id="mm-edit" style="width:100%"></div><div id="mm-prev" style="width:100%;display:none"></div></div></div>';
  } else {
    body.innerHTML = '<div id="mm-edit"></div><div id="mm-prev"></div>';
  }
  _mmRenderEditor();
  _mmRenderPreview();
}
function _mmSetLayout(l) { _mmLayout = l; localStorage.setItem('mm_layout', l); _mmRenderShell(); }
function _mmTabbedShow(which) {
  document.getElementById('mm-edit').style.display = which==='edit' ? '' : 'none';
  document.getElementById('mm-prev').style.display = which==='prev' ? '' : 'none';
  document.getElementById('mm-tb-edit').className = 'mm-laybtn' + (which==='edit'?' on':'');
  document.getElementById('mm-tb-prev').className = 'mm-laybtn' + (which==='prev'?' on':'');
}

// ── Editor ───────────────────────────────────────────────────────
function _mmF(label, html) { return '<div class="mm-f"><label>' + label + '</label>' + html + '</div>'; }
function _mmIn(bind, val, extra) {
  return '<input data-mmb="' + bind + '" value="' + String(val==null?'':val).replace(/"/g,'&quot;') + '"' + (extra||'') + '>';
}

// Shared destination list — the editor's "Bestiary Category" dropdown and the
// save chooser both read this so they always stay in sync. Any category added
// to the bestiary in future flows automatically appears in both.
function _mmDestList() {
  var dests = [];
  if (typeof _dbCats === 'function') dests.push({ v:'divine', label:'\uD83D\uDC09 Divine Beasts', subs:_dbCats().slice(), extra:true });
  dests.push({ v:'homebrew', label:'\uD83D\uDCD6 Homebrew', subs:[] });
  dests.push({ v:'mhlib', label:'\uD83C\uDFF9 MH Library (custom)', subs:[] });
  if (typeof window._bcChooserCats === 'function') {
    window._bcChooserCats().forEach(function(c){ dests.push({ v:'bc:'+c.id, label:(c.icon?c.icon+' ':'')+c.label, subs:c.subs||[] }); });
  }
  return dests;
}
function _mmBiomeOpts(m) {
  var biomes = (typeof DB_BIOMES !== 'undefined') ? DB_BIOMES : [];
  return '<option value="">\u2014 None</option>' + biomes.map(function(b){
    return '<option value="' + b + '"' + (m.biome===b?' selected':'') + '>' + b + '</option>';
  }).join('');
}
function _mmBestiaryCatOpts(m) {
  var cur = m.bestiaryCat || (m.divine ? 'divine' : '');
  return '<option value="">\u2014 Unfiled</option>' + _mmDestList().map(function(d){
    return '<option value="' + d.v + '"' + (cur===d.v?' selected':'') + '>' + d.label + '</option>';
  }).join('');
}
// Rebuild the Bestiary Category dropdown against the current category list,
// keeping the chosen value. The editor renders once and is cached, so this is
// what keeps it in sync after categories are added/removed in the Bestiary.
function _mmRefreshBestiaryCat() {
  if (!_mmM) return;
  var sel = document.querySelector('#mm-edit select[data-mmb="bestiaryCat"]');
  if (!sel) return;
  var cur = sel.value || _mmM.bestiaryCat || '';
  sel.innerHTML = _mmBestiaryCatOpts(_mmM);
  if (cur) { for (var i=0;i<sel.options.length;i++){ if (sel.options[i].value===cur){ sel.value=cur; break; } } }
}
window._mmRefreshBestiaryCat = _mmRefreshBestiaryCat;

function _mmRenderEditor() {
  var el = document.getElementById('mm-edit'); if (!el) return;
  var m = _mmM;
  var crOpts = MM_CR_TABLE.map(function(r){ return '<option value="' + r.cr + '"' + (String(m.cr)===r.cr?' selected':'') + '>CR ' + r.cr + ' (' + r.xp.toLocaleString() + ' XP)</option>'; }).join('');
  var h = '';

  // Identity
  h += '<div class="mm-card"><h3>Identity</h3><div class="mm-grid mm-g2">' +
    _mmF('Name', _mmIn('name', m.name)) +
    _mmF('Alignment', _mmIn('alignment', m.alignment)) + '</div>' +
    '<div class="mm-grid mm-g3" style="margin-top:.4rem">' +
    _mmF('Size', '<select data-mmb="size">' + MM_SIZES.map(function(s){ return '<option' + (m.size===s?' selected':'') + '>' + s + '</option>'; }).join('') + '</select>') +
    _mmF('Type', '<select data-mmb="type">' + MM_TYPES.map(function(s){ return '<option' + (m.type===s?' selected':'') + '>' + s + '</option>'; }).join('') + '</select>') +
    _mmF('Subtype / tag', _mmIn('subtype', m.subtype, ' placeholder="e.g. fanged, elder"')) + '</div>' +
    '<div class="mm-grid mm-g2" style="margin-top:.4rem">' +
    _mmF('Bestiary Category', '<select data-mmb="bestiaryCat">' + _mmBestiaryCatOpts(m) + '</select>') +
    _mmF('Biome', '<select data-mmb="biome">' + _mmBiomeOpts(m) + '</select>') +
    '</div></div>';

  // Portrait / image
  h += '<div class="mm-card"><h3>Portrait</h3><div style="display:flex;gap:.6rem;align-items:flex-start">' +
    '<div id="mm-img-prev" style="flex-shrink:0">' +
      (m.img ? '<img src="' + m.img + '" style="width:88px;height:88px;object-fit:cover;border-radius:6px;border:1px solid rgba(201,168,76,.4)">'
             : '<div style="width:88px;height:88px;border-radius:6px;border:1px dashed rgba(201,168,76,.35);display:flex;align-items:center;justify-content:center;color:#7a6a4a;font-size:.66rem;text-align:center">No image</div>') +
    '</div>' +
    '<div style="flex:1">' +
      '<input type="file" accept="image/*" id="mm-img-input" style="display:none" onchange="_mmImgPick(this)">' +
      '<button class="mm-addbtn" onclick="document.getElementById(\'mm-img-input\').click()">\uD83D\uDCF7 Upload image</button>' +
      (m.img ? ' <button class="mm-ebtn" onclick="_mmImgClear()">Remove</button>' : '') +
      '<div style="font-size:.62rem;color:#9a8a6a;margin-top:.4rem;line-height:1.5">Shown as a thumbnail in the bestiary list and full-width atop the stat block.</div>' +
    '</div></div></div>';

  // CR engine
  var row = mmCrRow(m.cr) || {};
  h += '<div class="mm-card"><h3>⚙ Challenge Rating Engine <span style="font-weight:normal;text-transform:none;font-size:.66rem;color:#777">(Icarus Games Quick Monster Builder)</span></h3>' +
    '<div class="mm-grid mm-g2">' +
    _mmF('Challenge Rating', '<select id="mm-cr-sel">' + crOpts + '</select>') +
    '<div class="mm-f"><label>Baseline (auto-fill)</label><button class="mm-addbtn" style="width:100%" onclick="_mmAutofill()">⟳ Re-apply CR ' + m.cr + ' baseline</button></div>' +
    '</div>' +
    '<div style="font-size:.68rem;color:#8a7a5a;margin-top:.4rem;line-height:1.5">CR ' + m.cr + ' targets — <b style="color:#c9a84c">Prof ' + mmSigned(row.pb||2) + '</b> · AC <b>' + (row.ac||'?') + '</b> · HP <b>' + (row.hp||'?') + '</b> · Atk <b>+' + (row.atk||'?') + '</b> · ' + (row.natk||1) + ' attacks · DPR <b>' + (row.dpr||'?') + '</b> (' + (row.dpa||'?') + '/attack) · Save DC <b>' + (row.dc||'?') + '</b> · Init <b>+' + (row.init||'?') + '</b></div>' +
    '<div id="mm-est-box" style="margin-top:.5rem;padding:.45rem .55rem;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.25);border-radius:6px"></div></div>';

  // Median modifier assignment
  var mods = (row.mods||[]).slice();
  h += '<div class="mm-card"><h3>Ability Scores <span style="font-weight:normal;text-transform:none;font-size:.66rem;color:#777">— assign CR-median modifiers (' + mods.map(mmSigned).join(', ') + ') or type scores</span></h3>' +
    '<div class="mm-grid mm-g6">';
  MM_ABILS.forEach(function(a, idx){
    var modOpts = '<option value="">—</option>' + mods.map(function(mo, mi){ return '<option value="' + mo + '">' + mmSigned(mo) + '</option>'; }).join('');
    h += '<div class="mm-f mm-modsel"><label>' + MM_ABIL_LABEL[a].toUpperCase() + '</label>' +
      '<select data-mmmod="' + a + '" style="margin-bottom:3px">' + modOpts + '</select>' +
      _mmIn('abil.' + a, m.abil[a], ' type="number" min="1" max="30"') +
      '<div style="font-size:.66rem;color:#9a8a6a;margin-top:1px">' + mmSigned(mmMod(m.abil[a])) + '</div></div>';
  });
  h += '</div><div style="margin-top:.4rem;font-size:.64rem;color:#777">Saving throw proficiencies: ' +
    MM_ABILS.map(function(a){
      return '<label style="margin-right:.6rem;cursor:pointer;color:' + ((m.saves||[]).indexOf(a)!==-1?'#c9a84c':'#888') + '"><input type="checkbox" data-mmsave="' + a + '"' + ((m.saves||[]).indexOf(a)!==-1?' checked':'') + '> ' + MM_ABIL_LABEL[a] + '</label>';
    }).join('') + '</div></div>';

  // Defense & profile
  h += '<div class="mm-card"><h3>Defense & Profile</h3><div class="mm-grid mm-g4">' +
    _mmF('AC' + _mmDevLabel('ac'), _mmIn('ac', m.ac, ' type="number"' + _mmDevCls('ac'))) +
    _mmF('AC note', _mmIn('acNote', m.acNote, ' placeholder="natural armor"')) +
    _mmF('HP' + _mmDevLabel('hp'), _mmIn('hp', m.hp, ' type="number"' + _mmDevCls('hp'))) +
    _mmF('HP formula', _mmIn('hpFormula', m.hpFormula, ' placeholder="auto"')) + '</div>' +
    '<div class="mm-grid mm-g2" style="margin-top:.4rem">' +
    _mmF('Speed', _mmIn('speed', m.speed)) +
    _mmF('Initiative override', _mmIn('initOverride', m.initOverride==null?'':m.initOverride, ' placeholder="auto (Dex mod)" type="number"')) + '</div>' +
    '<div class="mm-grid mm-g2" style="margin-top:.4rem">' +
    _mmF('Skills', _mmIn('skills', m.skills, ' placeholder="Perception +5, Stealth +4"')) +
    _mmF('Senses', _mmIn('senses', m.senses, ' placeholder="Darkvision 60 ft."')) + '</div>' +
    '<div class="mm-grid mm-g2" style="margin-top:.4rem">' +
    _mmF('Vulnerabilities', _mmIn('vuln', m.vuln)) +
    _mmF('Resistances', _mmIn('resist', m.resist)) + '</div>' +
    '<div class="mm-grid mm-g3" style="margin-top:.4rem">' +
    _mmF('Damage Immunities', _mmIn('immune', m.immune)) +
    _mmF('Condition Immunities', _mmIn('condImmune', m.condImmune)) +
    _mmF('Languages', _mmIn('languages', m.languages)) + '</div></div>';

  // Component sections
  MM_SECTIONS.forEach(function(sec){
    h += '<div class="mm-card"><h3>' + sec.label +
      '<span style="flex:1"></span>' +
      '<span class="mm-libsearch"><input placeholder="🔎 attach from library…" data-mmattach="' + sec.key + '"><div class="mm-libdrop" id="mm-drop-' + sec.key + '" style="display:none"></div></span>' +
      '</h3><div id="mm-list-' + sec.key + '">';
    (m[sec.key]||[]).forEach(function(e, i){ h += _mmEntryRowHTML(sec.key, i, e); });
    h += '</div><button class="mm-addbtn" onclick="_mmAddEntry(\'' + sec.key + '\')">+ Add ' + sec.label.replace(/s$| \/ Lair/,'') + '</button>' +
      (sec.key === 'legendary' ? ' <span style="font-size:.66rem;color:#777;margin-left:.6rem">Uses/round: <input data-mmb="legCount" type="number" value="' + (m.legCount||3) + '" style="width:44px;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:4px;font-family:inherit;padding:.1rem .2rem"></span>' : '') +
      '</div>';
  });

  // Spellcasting (slots-based)
  mmNormSpells(m);
  h += '<div class="mm-card"><h3>Spellcasting <span style="font-weight:normal;text-transform:none;font-size:.66rem;color:#777">(SRD 5.2 catalog — ' + (typeof MM_SPELLS !== 'undefined' ? MM_SPELLS.length : 0) + ' spells)</span></h3>' +
    '<div class="mm-grid mm-g2">' +
    _mmF('Spellcasting ability', '<select data-mmb="spellAbil">' + MM_ABILS.map(function(a){ return '<option value="' + a + '"' + (m.spellAbil===a?' selected':'') + '>' + MM_ABIL_LABEL[a] + ' (DC ' + (8 + mmPB(m.cr) + mmMod(m.abil[a])) + ')</option>'; }).join('') + '</select>') +
    '<div></div></div>' +
    '<div class="mm-f" style="margin-top:.5rem"><label>Spell Slots <span style="font-weight:normal;text-transform:none;color:#777">— how many slots per level</span></label>' + _mmSpellSlotsHTML() + '</div>' +
    '<div class="mm-f" style="margin-top:.55rem"><label>Add a Spell</label>' +
      '<span class="mm-libsearch"><input placeholder="🔎 Search SRD spells…" data-mmspell="add"><div class="mm-libdrop" id="mm-drop-sp-add" style="display:none"></div></span>' +
      '<div style="margin-top:.35rem"><button type="button" class="mm-ebtn" onclick="_mmToggleCustomSpell()">✎ Add custom spell</button></div>' +
      '<div id="mm-custom-spell" style="display:none;margin-top:.45rem;padding:.55rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.09);border-radius:6px">' +
        '<div class="mm-grid mm-g2">' +
          '<div class="mm-f"><label>Spell name</label><input id="mm-cs-name" placeholder="e.g. Tidecaller&#39;s Wrath"></div>' +
          '<div class="mm-f"><label>Level</label><select id="mm-cs-level">' + [0,1,2,3,4,5,6,7,8,9].map(function(l){ return '<option value="' + l + '">' + (l===0?'Cantrip':mmSpellLevelLabel(l)+'-level') + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div class="mm-f" style="margin-top:.35rem"><label>Effect / specifications (optional, tokens OK)</label><textarea id="mm-cs-desc" placeholder="Range, save, damage, duration…"></textarea></div>' +
        '<button type="button" class="mm-addbtn" style="margin-top:.35rem" onclick="_mmSpellAddCustom()">+ Add Spell</button>' +
      '</div></div>' +
    '<div id="mm-spell-list" style="margin-top:.55rem">' + _mmSpellListHTML() + '</div>' +
    '</div>';

  // Loot & Harvestables
  m.loot = m.loot || [];
  h += '<div class="mm-card"><h3>🏹 Loot & Harvestables <span style="font-weight:normal;text-transform:none;font-size:.66rem;color:#777">— monster parts, carried items, salvage</span></h3><div id="mm-list-loot">';
  m.loot.forEach(function(e, i){
    h += '<div class="mm-entry-row" data-sec="loot" data-i="' + i + '">' +
      '<div style="display:flex;gap:.3rem;align-items:center">' +
      '<input data-mment="name" value="' + String(e.name||'').replace(/"/g,'&quot;') + '" placeholder="Item… e.g. Stormwing Pinion ×2" style="flex:1">' +
      '<button class="mm-ebtn" title="Move up" onclick="_mmMoveEntry(\'loot\',' + i + ',-1)">↑</button>' +
      '<button class="mm-ebtn" style="color:#c07070" onclick="_mmDelEntry(\'loot\',' + i + ')">✕</button></div>' +
      '<textarea data-mment="desc" placeholder="Details… harvest DC, value, what it\'s used for (tokens OK)">' + String(e.desc||'').replace(/</g,'&lt;') + '</textarea></div>';
  });
  h += '</div><button class="mm-addbtn" onclick="_mmAddEntry(\'loot\')">+ Add Loot Item</button></div>';

  h += '<div style="font-size:.64rem;color:#666;margin:.2rem 0 1rem;line-height:1.6">Tokens: <code>{NAME}</code> creature name · <code>{2d6+3}</code> → "10 (2d6 + 3)" · <code>{DC:STR}</code> → save DC · <code>{ATK:DEX}</code> → attack bonus · <code>{MOD:WIS}</code> · <code>{PB}</code></div>';

  el.innerHTML = h;
  _mmBindEditor(el);
  _mmUpdateEstimator();
}

function _mmDevLabel(f) { return _mmM.overrides && _mmM.overrides[f] ? ' <span style="color:#c77b3a">⚠</span>' : ''; }
function _mmDevCls(f) { return _mmM.overrides && _mmM.overrides[f] ? ' class="mm-dev" title="' + _mmM.overrides[f] + '"' : ''; }

function _mmEntryRowHTML(sec, i, e) {
  return '<div class="mm-entry-row" data-sec="' + sec + '" data-i="' + i + '">' +
    '<div style="display:flex;gap:.3rem;align-items:center">' +
    '<input data-mment="name" value="' + String(e.name||'').replace(/"/g,'&quot;') + '" placeholder="Name…" style="flex:1">' +
    '<button class="mm-ebtn" title="Save to global library" onclick="_mmSaveEntryToLib(\'' + sec + '\',' + i + ')">📚 Save</button>' +
    '<button class="mm-ebtn" title="Move up" onclick="_mmMoveEntry(\'' + sec + '\',' + i + ',-1)">↑</button>' +
    '<button class="mm-ebtn" style="color:#c07070" onclick="_mmDelEntry(\'' + sec + '\',' + i + ')">✕</button></div>' +
    '<textarea data-mment="desc" placeholder="Description… (tokens OK)">' + String(e.desc||'').replace(/</g,'&lt;') + '</textarea></div>';
}

function _mmSpellSlotsHTML() {
  var sp = mmNormSpells(_mmM);
  var cells = '';
  for (var l = 1; l <= 9; l++) {
    cells += '<div style="text-align:center"><label style="display:block;font-size:.56rem;color:#8a7a5a;margin-bottom:2px;font-family:inherit">' + mmSpellLevelLabel(l) + '</label>' +
      '<input type="number" min="0" max="20" data-mmslot="' + l + '" value="' + (sp.slots[l] || 0) + '" style="width:100%;text-align:center;padding:.25rem 0"></div>';
  }
  return '<div style="display:grid;grid-template-columns:repeat(9,1fr);gap:.3rem">' + cells + '</div>';
}

function _mmSpellListHTML() {
  var sp = mmNormSpells(_mmM);
  if (!sp.list.length) return '<div style="font-size:.68rem;color:#555;font-style:italic">No spells yet — search above or add a custom spell.</div>';
  var byLvl = {};
  sp.list.forEach(function(s, i){ var l = s.level || 0; (byLvl[l] = byLvl[l] || []).push({ s:s, i:i }); });
  return Object.keys(byLvl).map(Number).sort(function(a,b){ return a-b; }).map(function(l){
    var slotNote = l === 0 ? 'at will' : ((sp.slots[l] || 0) + ' slot' + ((sp.slots[l]||0)===1?'':'s'));
    var head = (l === 0 ? 'Cantrips' : mmSpellLevelLabel(l) + '-level') + ' · ' + slotNote;
    var chips = byLvl[l].map(function(o){
      return '<span class="mm-chip">' + String(o.s.name).replace(/</g,'&lt;') + (o.s.custom ? ' <span style="color:#c9a84c;font-size:.6rem" title="Custom spell">★</span>' : '') +
        ' <b onclick="_mmSpellRemove(' + o.i + ')">✕</b></span>';
    }).join('');
    return '<div style="margin-bottom:.4rem"><div style="font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:#9a8a6a;margin-bottom:.22rem">' + head + '</div><div>' + chips + '</div></div>';
  }).join('');
}

function _mmSpellAdd(name) {
  var sp = mmNormSpells(_mmM);
  var s = mmSpellByName(name);
  if (!sp.list.some(function(x){ return String(x.name).toLowerCase() === String(name).toLowerCase(); }))
    sp.list.push({ name: s ? s.n : name, level: s ? s.l : 0, custom: !s });
  _mmRenderEditor(); _mmSchedulePreview();
}

function _mmSpellAddCustom() {
  var sp = mmNormSpells(_mmM);
  var nmEl = document.getElementById('mm-cs-name');
  var nm = (nmEl && nmEl.value || '').trim();
  if (!nm) { if (nmEl) nmEl.focus(); alert('Give the spell a name first.'); return; }
  var lvl = parseInt((document.getElementById('mm-cs-level')||{}).value) || 0;
  var desc = ((document.getElementById('mm-cs-desc')||{}).value || '').trim();
  sp.list.push({ name: nm, level: lvl, custom: true, desc: desc });
  if (lvl > 0 && !(sp.slots[lvl] > 0)) sp.slots[lvl] = 1; // give the new level a slot to start
  _mmRenderEditor(); _mmSchedulePreview();
}

function _mmSpellRemove(i) {
  var sp = mmNormSpells(_mmM);
  sp.list.splice(i, 1);
  _mmRenderEditor(); _mmSchedulePreview();
}

function _mmToggleCustomSpell() {
  var el = document.getElementById('mm-custom-spell');
  if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
}

// ── Binding ──────────────────────────────────────────────────────
function _mmImgPick(input) {
  var f = input.files && input.files[0]; if (!f) return;
  if (typeof _resizeImageDataUrl === 'function') {
    _resizeImageDataUrl(f, 480, 480, 0.8, function(dataUrl){ _mmM.img = dataUrl; _mmRenderEditor(); _mmRenderPreview(); });
    return;
  }
  var r = new FileReader();
  r.onload = function(e){ _mmM.img = e.target.result; _mmRenderEditor(); _mmRenderPreview(); };
  r.readAsDataURL(f);
}
function _mmImgClear() { _mmM.img = ''; _mmRenderEditor(); _mmRenderPreview(); }

function _mmBindEditor(root) {
  // simple fields
  root.querySelectorAll('[data-mmb]').forEach(function(inp){
    inp.addEventListener('input', function(){
      var path = inp.getAttribute('data-mmb').split('.');
      var v = inp.value;
      if (inp.type === 'number' && v !== '') v = Number(v);
      if (path[0] === 'divine') v = !!inp.value;
      if (path.length === 2) _mmM[path[0]][path[1]] = v; else _mmM[path[0]] = v;
      if (path[0] === 'bestiaryCat') _mmM.divine = (v === 'divine');
      if (path[0] === 'abil') {
        var lbl = inp.parentElement.querySelector('div');
        if (lbl) lbl.textContent = mmSigned(mmMod(Number(inp.value)||10));
      }
      _mmCheckDeviation(path[0]);
      _mmSchedulePreview();
    });
  });
  // CR select
  var crSel = root.querySelector('#mm-cr-sel');
  if (crSel) crSel.addEventListener('change', function(){
    _mmM.cr = crSel.value;
    _mmAutofill();
  });
  // mod assignment dropdowns
  root.querySelectorAll('[data-mmmod]').forEach(function(sel){
    sel.addEventListener('change', function(){
      if (sel.value === '') return;
      var a = sel.getAttribute('data-mmmod');
      var mod = Number(sel.value);
      _mmM.abil[a] = 10 + mod * 2;
      _mmRenderEditor(); _mmSchedulePreview();
    });
  });
  // save checkboxes
  root.querySelectorAll('[data-mmsave]').forEach(function(cb){
    cb.addEventListener('change', function(){
      var a = cb.getAttribute('data-mmsave');
      _mmM.saves = _mmM.saves || [];
      if (cb.checked) { if (_mmM.saves.indexOf(a) === -1) _mmM.saves.push(a); }
      else _mmM.saves = _mmM.saves.filter(function(x){ return x !== a; });
      _mmSchedulePreview();
    });
  });
  // entry rows
  root.querySelectorAll('.mm-entry-row').forEach(function(row){
    var sec = row.getAttribute('data-sec'), i = Number(row.getAttribute('data-i'));
    row.querySelectorAll('[data-mment]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var f = inp.getAttribute('data-mment');
        if (_mmM[sec] && _mmM[sec][i]) { _mmM[sec][i][f] = inp.value; _mmSchedulePreview(); }
      });
    });
  });
  // library attach typeaheads
  root.querySelectorAll('[data-mmattach]').forEach(function(inp){
    var sec = inp.getAttribute('data-mmattach');
    inp.addEventListener('input', function(){ _mmAttachSearch(sec, inp.value); });
    inp.addEventListener('blur', function(){ setTimeout(function(){ var d = document.getElementById('mm-drop-' + sec); if (d) d.style.display = 'none'; }, 250); });
  });
  // spell typeaheads
  root.querySelectorAll('[data-mmspell]').forEach(function(inp){
    var list = inp.getAttribute('data-mmspell');
    inp.addEventListener('input', function(){ _mmSpellSearch(list, inp.value); });
    inp.addEventListener('blur', function(){ setTimeout(function(){ var d = document.getElementById('mm-drop-sp-' + list); if (d) d.style.display = 'none'; }, 250); });
  });
  // spell slot inputs
  root.querySelectorAll('[data-mmslot]').forEach(function(inp){
    inp.addEventListener('change', function(){
      var sp = mmNormSpells(_mmM);
      var l = parseInt(inp.getAttribute('data-mmslot'));
      sp.slots[l] = Math.max(0, parseInt(inp.value) || 0);
      var listEl = document.getElementById('mm-spell-list'); if (listEl) listEl.innerHTML = _mmSpellListHTML();
      _mmSchedulePreview();
    });
  });
}

// ── CR autofill + deviation tracking ─────────────────────────────
function _mmAutofill() {
  var row = mmCrRow(_mmM.cr); if (!row) return;
  _mmBaseline = row;
  _mmM.ac = row.ac;
  _mmM.hp = row.hp;
  _mmM.hpFormula = '';
  _mmM.initOverride = null;
  _mmM.overrides = {};
  _mmRenderEditor();
  _mmSchedulePreview();
}
function _mmCheckDeviation(field) {
  var row = _mmBaseline || mmCrRow(_mmM.cr); if (!row) return;
  _mmM.overrides = _mmM.overrides || {};
  if (field === 'ac' || field === 'hp') {
    var base = row[field], val = Number(_mmM[field]);
    var rng = row[field + 'R'];
    var off = rng ? (val < rng[0] || val > rng[1]) : Math.abs(val - base) > base * 0.15;
    if (val !== base && off) _mmM.overrides[field] = 'CR ' + _mmM.cr + ' target: ' + base + (rng ? ' (range ' + rng[0] + '–' + rng[1] + ')' : '');
    else delete _mmM.overrides[field];
  }
}

// ── Live CR estimator ────────────────────────────────────────────
function _mmExtractDPR(mon) {
  // avg damage per entry: sum "N (XdY+Z)" patterns + {XdY+Z} tokens
  function entryAvg(desc) {
    var t = 0; var s = String(desc||'');
    var re1 = /(\d+)\s*\((\d+)d(\d+)(?:\s*[+\-]\s*\d+)?\)/g, m;
    while ((m = re1.exec(s))) t += Number(m[1]);
    var re2 = /\{(\d+)d(\d+)([+\-]\d+)?\}/g;
    while ((m = re2.exec(s))) t += mmDiceAvg(+m[1], +m[2], m[3] ? +m[3] : 0);
    return t;
  }
  var attacks = [], aoes = [], recharges = [];
  (mon.actions||[]).forEach(function(e){
    var avg = entryAvg(e.desc); if (!avg) return;
    var isRecharge = /recharge/i.test(e.name + e.desc);
    var isAoe = /each creature|saving throw/i.test(e.desc) && !/attack:/i.test(e.desc);
    if (isRecharge) recharges.push(avg);
    else if (isAoe) aoes.push(avg);
    else attacks.push({ name: e.name.toLowerCase().replace(/\s*\(.*\)/,''), avg: avg });
  });
  // multiattack synthesis
  var multi = (mon.actions||[]).find(function(e){ return /multiattack/i.test(e.name); });
  var base = 0;
  if (multi && attacks.length) {
    var d = multi.desc.toLowerCase();
    var words = { one:1, two:2, three:3, four:4, five:5, six:6 };
    var total = 0, matched = false;
    attacks.forEach(function(a){
      var re = new RegExp('(one|two|three|four|five|six|\\d+)\\s+' + a.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/s$/,'') + '[a-z]*\\s+attack', 'i');
      var mm2 = d.match(re);
      if (mm2) { matched = true; total += (words[mm2[1]] || Number(mm2[1]) || 1) * a.avg; }
    });
    if (!matched) {
      var cnt = d.match(/makes?\s+(one|two|three|four|five|six|\d+)/);
      var n = cnt ? (words[cnt[1]] || Number(cnt[1]) || 1) : 2;
      total = n * Math.max.apply(null, attacks.map(function(a){ return a.avg; }));
    }
    base = total;
  } else if (attacks.length) {
    base = Math.max.apply(null, attacks.map(function(a){ return a.avg; }));
  }
  if (aoes.length) base = Math.max(base, Math.max.apply(null, aoes));
  // 3-round average with recharge round 1
  var dpr = base;
  if (recharges.length) {
    var r = Math.max.apply(null, recharges);
    dpr = Math.round((Math.max(r, base) + base * 2) / 3);
  }
  return Math.round(dpr);
}

function _mmAtkBonus(mon) {
  var best = null, re = /([+\-]\d+)\s+to\s+hit|\{ATK:(STR|DEX|CON|INT|WIS|CHA)\}/gi, m;
  (mon.actions||[]).forEach(function(e){
    var s = String(e.desc||'');
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      var v = m[1] ? Number(m[1]) : mmPB(mon.cr) + mmMod(mon.abil[m[2].toLowerCase()]);
      if (best === null || v > best) best = v;
    }
  });
  return best;
}
function _mmSaveDC(mon) {
  var best = null, m;
  (mon.actions||[]).concat(mon.traits||[]).forEach(function(e){
    var s = String(e.desc||'');
    var re = /DC\s*(\d+)|\{DC:(STR|DEX|CON|INT|WIS|CHA)\}/gi;
    while ((m = re.exec(s))) {
      var v = m[1] ? Number(m[1]) : 8 + mmPB(mon.cr) + mmMod(mon.abil[m[2].toLowerCase()]);
      if (best === null || v > best) best = v;
    }
  });
  return best;
}

function _mmNearestCrIdx(val, col) {
  var bi = 0, bd = Infinity;
  MM_CR_TABLE.forEach(function(r, i){
    var d = Math.abs((r[col]||0) - val);
    if (d < bd) { bd = d; bi = i; }
  });
  return bi;
}

function mmEstimateCR(mon) {
  // Defensive: effective HP adjusted by resist/immune count + AC delta
  var ehp = Number(mon.hp) || 1;
  var resCnt = String(mon.resist||'').split(',').filter(function(x){ return x.trim(); }).length;
  var immCnt = String(mon.immune||'').split(',').filter(function(x){ return x.trim(); }).length;
  if (immCnt >= 3) ehp *= 1.5; else if (immCnt + resCnt >= 3) ehp *= 1.25; else if (resCnt >= 1) ehp *= 1.1;
  if ((mon.traits||[]).some(function(t){ return /legendary resistance/i.test(t.name); })) ehp *= 1.15;
  var defIdx = _mmNearestCrIdx(ehp, 'hp');
  var acDelta = (Number(mon.ac)||10) - (MM_CR_TABLE[defIdx].ac||13);
  defIdx = Math.max(0, Math.min(MM_CR_TABLE.length - 1, defIdx + Math.round(acDelta / 2)));

  // Offensive: DPR + attack bonus / DC delta
  var dpr = _mmExtractDPR(mon);
  var offIdx = dpr ? _mmNearestCrIdx(dpr, 'dpr') : defIdx;
  var atk = _mmAtkBonus(mon), dc = _mmSaveDC(mon);
  if (atk !== null) offIdx = Math.max(0, Math.min(MM_CR_TABLE.length - 1, offIdx + Math.round((atk - (MM_CR_TABLE[offIdx].atk||4)) / 2)));
  else if (dc !== null) offIdx = Math.max(0, Math.min(MM_CR_TABLE.length - 1, offIdx + Math.round((dc - (MM_CR_TABLE[offIdx].dc||12)) / 2)));

  var finalIdx = Math.round((defIdx + offIdx) / 2);
  return {
    cr: MM_CR_TABLE[finalIdx].cr,
    def: MM_CR_TABLE[defIdx].cr,
    off: MM_CR_TABLE[offIdx].cr,
    dpr: dpr, ehp: Math.round(ehp), atk: atk, dc: dc
  };
}

function _mmUpdateEstimator() {
  var box = document.getElementById('mm-est-box'); if (!box) return;
  var est = mmEstimateCR(_mmM);
  var match = String(est.cr) === String(_mmM.cr);
  box.innerHTML = '<div class="mm-est">' +
    '<span style="color:#9a8a6a;font-size:.68rem;text-transform:uppercase;letter-spacing:1px">Suggested CR</span>' +
    '<span class="mm-estcr" style="color:' + (match ? '#80c080' : '#c77b3a') + '">' + est.cr + '</span>' +
    '<span style="color:#777;font-size:.7rem">defensive ' + est.def + ' (eHP ' + est.ehp + ', AC ' + _mmM.ac + ') · offensive ' + est.off + ' (DPR ' + (est.dpr||'—') + (est.atk !== null ? ', atk ' + mmSigned(est.atk) : est.dc !== null ? ', DC ' + est.dc : '') + ')</span>' +
    (match ? '<span style="color:#80c080;font-size:.7rem">✓ matches set CR</span>' : '<span style="color:#c77b3a;font-size:.7rem">set CR is ' + _mmM.cr + '</span>') +
    '</div>';
}

// ── Entries ──────────────────────────────────────────────────────
function _mmAddEntry(sec) {
  _mmM[sec] = _mmM[sec] || [];
  _mmM[sec].push({ name: '', desc: '' });
  _mmRenderEditor();
  var rows = document.querySelectorAll('#mm-list-' + sec + ' .mm-entry-row');
  var last = rows[rows.length - 1];
  if (last) { var inp = last.querySelector('input'); if (inp) inp.focus(); }
}
function _mmDelEntry(sec, i) { _mmM[sec].splice(i, 1); _mmRenderEditor(); _mmSchedulePreview(); }
function _mmMoveEntry(sec, i, d) {
  var a = _mmM[sec]; if (!a) return;
  var j = i + d; if (j < 0 || j >= a.length) return;
  var t = a[i]; a[i] = a[j]; a[j] = t;
  _mmRenderEditor(); _mmSchedulePreview();
}
function _mmSaveEntryToLib(sec, i) {
  var e = (_mmM[sec]||[])[i]; if (!e || !e.name) { alert('Give it a name first.'); return; }
  var cat = sec === 'legendary' ? 'legendary' : 'traits';
  var kind = MM_SECTIONS.find(function(s){ return s.key === sec; }).kind;
  var r = mmLibAdd(cat, { name: e.name, desc: e.desc, kind: kind, origin: _mmM.name, sourceCreature: _mmM.name, custom: true }, { tokenize: false });
  mmLibSave();
  alert(r === 'added' ? '"' + e.name + '" saved to library.' : r === 'dup' ? 'Already in library (exact match).' : 'A parameterized variant already exists — kept the library version.');
}

// ── Library attach (typeahead) ───────────────────────────────────
function _mmAttachSearch(sec, q) {
  var drop = document.getElementById('mm-drop-' + sec); if (!drop) return;
  if (!q || q.length < 2) { drop.style.display = 'none'; return; }
  var cat = sec === 'legendary' ? 'legendary' : 'traits';
  var kind = sec === 'traits' ? 'trait' : sec === 'bonus' ? 'bonus' : sec === 'reactions' ? 'reaction' : sec === 'actions' ? 'action' : '';
  var res = mmLibSearch(cat, q, '', '').slice(0, 30);
  // prefer kind matches first
  res.sort(function(a, b){ return (b.kind === kind) - (a.kind === kind); });
  if (!res.length) { drop.innerHTML = '<div style="color:#666;font-style:italic">no matches</div>'; drop.style.display = ''; return; }
  drop.innerHTML = res.map(function(e){
    return '<div onmousedown="_mmAttachPick(\'' + sec + '\',\'' + e.id + '\')"><b style="color:#9fd0ef">' + e.name + '</b> <span style="color:#777;font-size:.66rem">[' + e.kind + (e.sourceCreature ? ' · ' + e.sourceCreature : '') + ']</span><br><span style="font-size:.68rem;color:#998">' + String(e.desc).slice(0, 110) + '…</span></div>';
  }).join('');
  drop.style.display = '';
}
function _mmAttachPick(sec, id) {
  var cat = sec === 'legendary' ? 'legendary' : 'traits';
  var e = (mmLib()[cat]||[]).find(function(x){ return x.id === id; });
  if (!e) return;
  _mmM[sec] = _mmM[sec] || [];
  _mmM[sec].push({ name: e.name, desc: e.desc }); // clone
  _mmRenderEditor(); _mmSchedulePreview();
}

// ── Spell typeahead ──────────────────────────────────────────────
function _mmSpellSearch(list, q) {
  var drop = document.getElementById('mm-drop-sp-' + list); if (!drop) return;
  if (!q || q.length < 2) { drop.style.display = 'none'; return; }
  var res = mmSpellSearch(q).slice(0, 25);
  if (!res.length) { drop.innerHTML = '<div style="color:#666;font-style:italic">no matches</div>'; drop.style.display = ''; return; }
  drop.innerHTML = res.map(function(s){
    return '<div onmousedown="_mmSpellAdd(\'' + s.n.replace(/'/g, "\\'") + '\')"><b style="color:#b8a8e0">' + s.n + '</b> <span style="color:#777;font-size:.66rem">' + MM_SPELL_LEVELS[s.l] + ' · ' + s.s + '</span><br><span style="font-size:.66rem;color:#998">' + s.x + '</span></div>';
  }).join('');
  drop.style.display = '';
}

// ── Preview ──────────────────────────────────────────────────────
function _mmSchedulePreview() {
  clearTimeout(_mmPreviewTimer);
  _mmPreviewTimer = setTimeout(function(){ _mmRenderPreview(); _mmUpdateEstimator(); }, 160);
}
function _mmRenderPreview() {
  var el = document.getElementById('mm-prev'); if (!el) return;
  el.innerHTML =
    '<div id="mm-prev-tools">' +
    '<button onclick="mmExportJSON(_mmM)">⬇ JSON</button>' +
    '<button onclick="mmExportMarkdown(_mmM);this.textContent=\'✓ Copied!\';setTimeout(()=>this.textContent=\'📋 Markdown\',1500)">📋 Markdown</button>' +
    '<button onclick="mmExportPrint(_mmM)">🖨 Print / PNG</button>' +
    '</div>' +
    '<div style="max-width:620px;margin:0 auto">' + mmRenderStatblock(_mmM, { flags: true }) + '</div>';
}

// ── Save to compendium ───────────────────────────────────────────
function _mmSaveToCompendium() {
  if (!_mmM.name || _mmM.name === 'New Creature') {
    if (!confirm('Save as "' + _mmM.name + '"?')) return;
  }
  var typeLine = _mmM.size + ' ' + _mmM.type.toLowerCase() + (_mmM.subtype ? ' (' + _mmM.subtype + ')' : '') + ', ' + _mmM.alignment.toLowerCase();
  var lootText = (_mmM.loot||[]).map(function(e){ return e.name + (e.desc ? ' — ' + e.desc : ''); }).join('\n');

  // Edits to a Divine Beast: open the chooser pre-filled so the Keeper can keep
  // or re-file the creature into a specific Bestiary section, then save in place.
  if (_mmM._divineBeastIdx != null && typeof _dbFromForge === 'function' && typeof openModal === 'function' && typeof _dbCats === 'function') {
    _mmOpenSaveChooser();
    return;
  }
  if (_mmM._divineBeastIdx != null && typeof _dbFromForge === 'function') {
    var di = _mmM._divineBeastIdx;
    state.divineBeasts = state.divineBeasts || [];
    state.divineBeasts[di] = _dbFromForge(_mmM, state.divineBeasts[di]);
    saveState();
    if (typeof _renderDbBeasts === 'function') { try { _renderDbBeasts(); } catch(e) {} }
    if (typeof _renderActiveHunts === 'function') { try { _renderActiveHunts(); } catch(e) {} }
    alert('\uD83D\uDCBE Edits to "' + _mmM.name + '" saved to the Divine Bestiary.');
    return;
  }

  // Edits to a Homebrew monster save back to the Homebrew Manual in its native shape
  if (_mmM._homebrewIdx != null && typeof _hbFromForge === 'function') {
    var hi = _mmM._homebrewIdx;
    state.homebrewMonsters = state.homebrewMonsters || [];
    state.homebrewMonsters[hi] = _hbFromForge(_mmM, state.homebrewMonsters[hi]);
    saveState();
    if (typeof _hbOpenCards !== 'undefined') _hbOpenCards = {};
    if (typeof _renderHomebrew === 'function') { try { _renderHomebrew(); } catch(e) {} }
    if (typeof _renderActiveHunts === 'function') { try { _renderActiveHunts(); } catch(e) {} }
    alert('\uD83D\uDCBE Edits to "' + _mmM.name + '" saved to the Homebrew Manual.');
    return;
  }

  // Edits to an MH Library monster save back as an override (keeps the base entry intact)
  if (_mmM._mhmmOverrideName && typeof _mhmmOverrides === 'function') {
    var ovName = _mmM._mhmmOverrideName;
    _mhmmOverrides()[ovName] = {
      name: _mmM.name,
      cr: String(_mmM.cr),
      hp: String(_mmM.hp),
      type: typeLine,
      statblock: mmStatblockPlainText(_mmM),
      loot: lootText,
      img: _mmM.img || '',
      mm: JSON.parse(JSON.stringify(_mmM))
    };
    saveState();
    if (typeof _renderLibrary === 'function') { try { _renderLibrary('db-mhmm-inner'); } catch(e) {} }
    if (typeof _renderActiveHunts === 'function') { try { _renderActiveHunts(); } catch(e) {} }
    alert('💾 Edits to "' + ovName + '" saved to the Bestiary.');
    return;
  }

  // Brand-new creature — let the Keeper choose where it lands (Divine Bestiary
  // under a category, or MH Library custom). Falls back to MH custom if the
  // campaign app's category helpers aren't loaded (e.g. Forge used standalone).
  if (typeof _dbCats === 'function' && typeof openModal === 'function') {
    _mmOpenSaveChooser();
    return;
  }
  _mmSaveToCustomLib();
}

// Save the forged creature as a custom MH Library entry (original behavior)
function _mmSaveToCustomLib() {
  var entry = {
    name: _mmM.name,
    cr: String(_mmM.cr),
    hp: String(_mmM.hp),
    type: _mmM.size + ' ' + _mmM.type.toLowerCase() + (_mmM.subtype ? ' (' + _mmM.subtype + ')' : '') + ', ' + _mmM.alignment.toLowerCase(),
    statblock: mmStatblockPlainText(_mmM),
    loot: (_mmM.loot||[]).map(function(e){ return e.name + (e.desc ? ' — ' + e.desc : ''); }).join('\n'),
    mm: JSON.parse(JSON.stringify(_mmM)),
    img: _mmM.img || '',
    _customId: _mmEditCustomId || ('forge_' + Date.now().toString(36))
  };
  _mmEditCustomId = entry._customId;
  var customs = _mhmmCustom();
  var idx = customs.findIndex(function(c){ return c._customId === entry._customId; });
  if (idx !== -1) customs[idx] = entry; else customs.push(entry);
  saveState();
  if (typeof _renderLibrary === 'function') { try { _renderLibrary(); } catch(e) {} }
  if (typeof _renderActiveHunts === 'function') { try { _renderActiveHunts(); } catch(e) {} }
  alert('💾 "' + _mmM.name + '" saved to the Bestiary (MH Library custom).');
}

// Save the forged creature into the Divine Bestiary under a chosen category
function _mmSaveToDivine(category, biome, god) {
  if (typeof _dbFromForge !== 'function') { _mmSaveToCustomLib(); return; }
  var beast = _dbFromForge(_mmM, {});
  beast.type = category || '';
  if (biome) beast.biome = biome;
  if (god)   beast.god = god;
  state.divineBeasts = state.divineBeasts || [];
  state.divineBeasts.push(beast);
  saveState();
  if (typeof _renderDbBeasts === 'function') { try { _renderDbBeasts(); } catch(e) {} }
  if (typeof _renderActiveHunts === 'function') { try { _renderActiveHunts(); } catch(e) {} }
  alert('\uD83D\uDC09 "' + _mmM.name + '" saved to the Divine Bestiary' + (category ? ' under ' + category : '') + '.');
}

// Destination chooser shown when saving a brand-new forged creature
function _mmOpenSaveChooser() {
  var editingDivine = (_mmM._divineBeastIdx != null);
  var _mmPrefill = { dest:(_mmM.bestiaryCat || 'divine'), sub:'', biome:(_mmM.biome||''), god:(_mmM.god||'') };
  if (editingDivine) {
    var _ob = (state.divineBeasts || [])[_mmM._divineBeastIdx] || {};
    _mmPrefill.sub = _ob.type || ''; _mmPrefill.biome = _ob.biome || _mmPrefill.biome; _mmPrefill.god = _ob.god || _mmPrefill.god;
  }
  openModal('modal-main');
  var titleEl = document.getElementById('modal-title');
  var bodyEl  = document.getElementById('modal-body');
  var saveEl  = document.getElementById('modal-save');
  var modalEl = document.querySelector('#modal-main .modal'); if (modalEl) modalEl.style.maxWidth = '460px';
  if (titleEl) { titleEl.textContent = '\uD83D\uDCBE Save \u201c' + _mmM.name + '\u201d'; titleEl.style.fontFamily = "'Cinzel',serif"; }
  var iS  = 'width:100%;padding:8px 11px;background:rgba(255,255,255,.04);color:#e8dcc8;border:1px solid rgba(200,170,100,.25);border-radius:6px;box-sizing:border-box;font-size:13px;outline:none;height:38px;cursor:pointer';
  var lbl = 'font-size:10px;letter-spacing:2px;color:#9a8a6a;font-family:\'Cinzel\',serif;margin-bottom:5px;text-transform:uppercase';
  var biomes = (typeof DB_BIOMES !== 'undefined') ? DB_BIOMES : [];
  var gods   = (typeof DB_GODS   !== 'undefined') ? DB_GODS   : [];
  var catIcon = function(c){ return (typeof _dbCatIcon === 'function') ? _dbCatIcon(c) + ' ' : ''; };
  // Destinations come from the shared list so the editor's Bestiary Category
  // dropdown and this chooser always stay in sync.
  var dests = _mmDestList();
  window._mmSaveDests = dests;
  if (bodyEl) bodyEl.innerHTML =
    '<div style="margin-bottom:14px">' +
      '<div style="' + lbl + '">Destination</div>' +
      '<select id="mm-save-dest" onchange="_mmSyncSaveSubs()" style="' + iS + '">' +
        dests.map(function(d){ return '<option value="' + d.v + '">' + d.label + '</option>'; }).join('') +
      '</select>' +
    '</div>' +
    '<div id="mm-save-sub-wrap" style="margin-bottom:12px"><div style="' + lbl + '">Bestiary Section</div>' +
      '<select id="mm-save-sub" style="' + iS + '"></select></div>' +
    '<div id="mm-save-extra">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div><div style="' + lbl + '">Biome</div><select id="mm-save-biome" style="' + iS + '"><option value="">\u2014 Any</option>' + biomes.map(function(b){ return '<option value="' + b + '">' + b + '</option>'; }).join('') + '</select></div>' +
        '<div><div style="' + lbl + '">God</div><select id="mm-save-god" style="' + iS + '"><option value="">\u2014 Any</option>' + gods.map(function(g){ return '<option value="' + g + '">' + g + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
    '</div>';
  if (saveEl) { saveEl.style.display = ''; saveEl.textContent = editingDivine ? 'File' : 'Save'; saveEl.onclick = _mmConfirmSaveTarget; }
  var destEl = document.getElementById('mm-save-dest'); if (destEl) destEl.value = _mmPrefill.dest;
  _mmSyncSaveSubs();
  var _mmSetSel = function(id, val){ var e = document.getElementById(id); if (e && val != null && val !== '') e.value = val; };
  _mmSetSel('mm-save-sub', _mmPrefill.sub);
  _mmSetSel('mm-save-biome', _mmPrefill.biome);
  _mmSetSel('mm-save-god', _mmPrefill.god);
}
function _mmSyncSaveSubs() {
  var dv = document.getElementById('mm-save-dest'); if (!dv) return;
  var d = (window._mmSaveDests || []).filter(function(x){ return x.v === dv.value; })[0] || { subs:[] };
  var wrap = document.getElementById('mm-save-sub-wrap');
  var subEl = document.getElementById('mm-save-sub');
  var extra = document.getElementById('mm-save-extra');
  if (wrap && subEl) {
    if (d.subs && d.subs.length) {
      wrap.style.display = '';
      subEl.innerHTML = '<option value="">\u2014 None</option>' + d.subs.map(function(s){ return '<option value="' + String(s).replace(/"/g,'&quot;') + '">' + s + '</option>'; }).join('');
    } else { wrap.style.display = 'none'; }
  }
  if (extra) extra.style.display = (dv.value === 'divine') ? '' : 'none';
}
function _mmConfirmSaveTarget() {
  var dv     = document.getElementById('mm-save-dest');
  var v      = dv ? dv.value : 'divine';
  var subEl  = document.getElementById('mm-save-sub');
  var biomeEl= document.getElementById('mm-save-biome');
  var godEl  = document.getElementById('mm-save-god');
  var sub    = subEl ? subEl.value : '';
  var biome  = biomeEl ? biomeEl.value : '';
  var god    = godEl ? godEl.value : '';
  var editDivIdx = (_mmM && _mmM._divineBeastIdx != null) ? _mmM._divineBeastIdx : null;
  if (typeof closeModal === 'function') closeModal('modal-main');
  if (v === 'divine') {
    if (editDivIdx != null) { _mmUpdateDivineInPlace(editDivIdx, sub, biome, god); return; }
    _mmSaveToDivine(sub, biome, god); return;
  }
  // Leaving the Divine Bestiary for another destination: drop the old entry first.
  if (editDivIdx != null && Array.isArray(state.divineBeasts)) {
    state.divineBeasts.splice(editDivIdx, 1);
    _mmM._divineBeastIdx = null;
    if (typeof _renderDbBeasts === 'function') { try { _renderDbBeasts(); } catch(e) {} }
  }
  if (v === 'mhlib') { _mmSaveToCustomLib(); return; }
  if (v === 'homebrew') { _mmSaveToHomebrew(); return; }
  if (v.indexOf('bc:') === 0 && typeof window.bcSaveForged === 'function') { window.bcSaveForged(v.slice(3), sub, _mmM); return; }
  _mmSaveToCustomLib();
}

// Save the forged creature into the Homebrew Manual
function _mmSaveToHomebrew() {
  if (typeof _hbFromForge !== 'function' || typeof state === 'undefined') { _mmSaveToCustomLib(); return; }
  state.homebrewMonsters = state.homebrewMonsters || [];
  var entry = _hbFromForge(_mmM, {});
  state.homebrewMonsters.push(entry);
  if (typeof saveState === 'function') saveState();
  if (typeof _hbOpenCards !== 'undefined') { try { _hbOpenCards = {}; } catch(e) {} }
  if (typeof _renderHomebrew === 'function') { try { _renderHomebrew(); } catch(e) {} }
  if (typeof _setDbTab === 'function') { try { _setDbTab('homebrew'); } catch(e) {} }
  if (typeof _renderActiveHunts === 'function') { try { _renderActiveHunts(); } catch(e) {} }
  alert('\uD83D\uDCD6 "' + _mmM.name + '" saved to the Homebrew Manual.');
}

// Update an existing Divine Beast in place, re-filing it under the chosen section.
function _mmUpdateDivineInPlace(idx, category, biome, god) {
  if (typeof _dbFromForge !== 'function') return;
  state.divineBeasts = state.divineBeasts || [];
  var beast = _dbFromForge(_mmM, state.divineBeasts[idx] || {});
  if (category) beast.type = category;
  if (biome) beast.biome = biome;
  if (god)   beast.god = god;
  state.divineBeasts[idx] = beast;
  saveState();
  if (typeof _renderDbBeasts === 'function') { try { _renderDbBeasts(); } catch(e) {} }
  if (typeof _renderActiveHunts === 'function') { try { _renderActiveHunts(); } catch(e) {} }
  alert('\uD83D\uDC09 "' + _mmM.name + '" saved to the Divine Bestiary' + (category ? ' under ' + category : '') + '.');
}

// ── Import existing creature ─────────────────────────────────────
function mmImportToForge(src) {
  var mon = mmMonFromSource(src);
  _mmEditCustomId = mon._customId;
  mmOpenMaker(mon);
}
// Build a Forge monster object from any Bestiary source WITHOUT opening the maker.
// Used by mmImportToForge (edit) and by the read-only stat-block viewer.
function mmMonFromSource(src) {
  var mon = mmNewMonster();
  if (src.mm) {
    mon = JSON.parse(JSON.stringify(src.mm));
    mon._customId = src._customId;
    mon._mhmmOverrideName = src._mhmmOverrideName || null;
    if (src.img) mon.img = src.img;
    return mon;
  }
  mon.name = src.name || 'Imported';
  mon.cr = String(src.cr || '1').replace('?','1');
  mon.hp = parseInt(src.hp) || 20;
  // parse type line: "Large beast (fanged), unaligned"
  var tm = String(src.type||'').match(/^(\w+)\s+([\w ]+?)(?:\s*\(([^)]+)\))?,\s*(.+)$/);
  if (tm) {
    mon.size = tm[1].charAt(0).toUpperCase() + tm[1].slice(1);
    mon.type = tm[2].trim().charAt(0).toUpperCase() + tm[2].trim().slice(1);
    mon.subtype = tm[3] || '';
    mon.alignment = tm[4].trim();
  }
  var sb = String(src.statblock || '');
  var m;
  if ((m = sb.match(/Armor Class\s+(\d+)(?:\s*\(([^)]+)\))?/i))) { mon.ac = +m[1]; mon.acNote = m[2] || ''; }
  if ((m = sb.match(/Hit Points\s+(\d+)(?:\s*\(([^)]+)\))?/i))) { mon.hp = +m[1]; mon.hpFormula = m[2] || ''; }
  if ((m = sb.match(/Speed\s+([^\n]+)/i))) mon.speed = m[1].trim();
  if ((m = sb.match(/Skills\s+([^\n]+)/i))) mon.skills = m[1].trim();
  if ((m = sb.match(/Damage Resistances\s+([^\n]+)/i))) mon.resist = m[1].trim();
  if ((m = sb.match(/Damage Immunities\s+([^\n]+)/i))) mon.immune = m[1].trim();
  if ((m = sb.match(/Condition Immunities\s+([^\n]+)/i))) mon.condImmune = m[1].trim();
  if ((m = sb.match(/Senses\s+([^\n]+)/i))) mon.senses = m[1].replace(/passive Perception \d+/i,'').replace(/,\s*$/,'').trim();
  if ((m = sb.match(/Languages\s+([^\n]+)/i))) mon.languages = m[1].trim();
  // ability scores: first 6 "N (+M)" patterns
  var scores = []; var re = /(\d+)\s*\(([+\-]\d+)\)/g;
  while ((m = re.exec(sb)) && scores.length < 6) scores.push(+m[1]);
  if (scores.length === 6) MM_ABILS.forEach(function(a, i){ mon.abil[a] = scores[i]; });
  // saving throws
  if ((m = sb.match(/Saving Throws\s+([^\n]+)/i))) {
    mon.saves = [];
    m[1].split(',').forEach(function(s){
      var am = s.trim().match(/^(Str|Dex|Con|Int|Wis|Cha)/i);
      if (am) mon.saves.push(am[1].toLowerCase());
    });
  }
  // sections
  var parsed = mmParseStatblockText(sb, mon.name);
  mon.traits = parsed.traits;
  mon.actions = parsed.actions;
  mon.bonus = parsed.bonus;
  mon.reactions = parsed.reactions;
  mon.legendary = parsed.legendary;
  if (src.god) mon.god = src.god;
  if (src.biome) mon.biome = src.biome;
  if (src.img) mon.img = src.img;
  mon._customId = src._customId || null;
  mon._mhmmOverrideName = src._mhmmOverrideName || null;
  return mon;
}

// Load an existing Bestiary creature (MH Library entry or custom variant) straight
// into the Forge with its stats pre-filled. Wired to the ✏️ edit buttons.
function mmEditInForge(monName) {
  if (typeof gmMode !== 'undefined' && !gmMode) { alert('Keeper only.'); return; }
  var base = null;
  if (typeof MHMM_LIBRARY !== 'undefined') base = MHMM_LIBRARY.find(function(x){ return x.name === monName; });
  if (!base && typeof _mhmmCustom === 'function') base = _mhmmCustom().find(function(x){ return x.name === monName; });
  if (!base) { alert('Could not find "' + monName + '" in the Bestiary.'); return; }
  var resolved = (typeof _mhmmResolved === 'function') ? _mhmmResolved(base) : base;
  var src = {
    name: resolved.name,
    cr: resolved.cr,
    hp: resolved.hp,
    type: resolved.type,
    img: resolved.img || '',
    statblock: resolved.statblock || '',
    loot: resolved.loot,
    god: resolved.god,
    biome: resolved.biome
  };
  // Prefer a previously-saved Forge object (perfect round-trip) when available
  if (resolved.mm) src.mm = resolved.mm;
  if (base._customId) {
    src._customId = base._customId;          // save updates the custom variant in place
  } else {
    src._mhmmOverrideName = monName;         // save writes back as an override on the library monster
  }
  mmImportToForge(src);
}

// Import picker (searches MHMM + custom + divine beasts)
function mmOpenImportPicker() {
  var q = prompt('Search compendium to edit in the Forge (name):');
  if (!q) return;
  var ql = q.toLowerCase();
  var pool = [];
  if (typeof state !== 'undefined' && Array.isArray(state.mhmmCustom)) state.mhmmCustom.forEach(function(c){ pool.push(c); });
  if (typeof MHMM_LIBRARY !== 'undefined') MHMM_LIBRARY.forEach(function(c){ pool.push(c); });
  if (typeof state !== 'undefined' && Array.isArray(state.divineBeasts)) state.divineBeasts.forEach(function(b){
    if (b.statblock || b.name) pool.push({ name: b.name, cr: b.cr || '1', hp: b.hp || '50', type: (b.size||'Medium') + ' ' + (b.creatureType||'monstrosity') + ', ' + (b.alignment||'unaligned'), statblock: b.statblock || '', god: b.god, biome: b.biome });
  });
  var hits = pool.filter(function(c){ return c.name && c.name.toLowerCase().indexOf(ql) !== -1; });
  if (!hits.length) { alert('No match for "' + q + '".'); return; }
  var pick = hits[0];
  if (hits.length > 1) {
    var names = hits.slice(0, 12).map(function(h, i){ return (i+1) + '. ' + h.name; }).join('\n');
    var n = prompt('Matches:\n' + names + '\n\nEnter number:', '1');
    pick = hits[Math.max(0, Math.min(hits.length - 1, (parseInt(n)||1) - 1))];
  }
  mmImportToForge(pick);
}
