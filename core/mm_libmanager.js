// ═══════════════════════════════════════════════════════════════
//  MONSTER MAKER — Ability & Spell Index (formerly the in-Forge
//  Library Manager). Lives in its own nav tab under Creature Forge.
//  Browse / filter / sort / page / edit / delete / tag the global
//  component pools.
// ═══════════════════════════════════════════════════════════════

var _mmLibOpen = {}; // expanded rows

// Pagination + sorting state
var _mmLibPage = 0, _mmLibPageSize = 50, _mmLibSort = 'name';
var _mmSpellPage = 0, _mmSpellPageSize = 50, _mmSpellSort = 'name';

// The index renders into its own tab root when present, otherwise falls back
// to the Forge body (standalone Forge usage).
function _mmIndexBody() {
  return document.getElementById('mm-index-root') || document.getElementById('mm-body');
}

function _mmRenderLibraryManager() {
  var body = _mmIndexBody(); if (!body) return;
  var lib = mmLib();
  var cats = [
    { key: 'traits',    label: '⚔ Traits & Actions', count: (lib.traits||[]).length },
    { key: 'legendary', label: '👑 Legendary / Mythic', count: (lib.legendary||[]).length },
    { key: 'spells',    label: '✨ Spells', count: (typeof MM_SPELLS !== 'undefined' ? MM_SPELLS.length : 0) + (lib.spells||[]).length }
  ];
  var h = '<div style="width:100%;height:100%;overflow-y:auto;padding:.8rem;box-sizing:border-box;background:#16120c">';

  // header: title + cat tabs + scan
  h += '<div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-bottom:.6rem">';
  h += '<h2 style="margin:0 .4rem 0 0;font-size:1.05rem;color:#c9a84c;letter-spacing:.5px">📚 Ability &amp; Spell Index</h2>';
  cats.forEach(function(c){
    h += '<button class="mm-tabbtn' + (_mmLibCat===c.key?' on':'') + '" onclick="_mmLibCat=\'' + c.key + '\';_mmLibQ=\'\';_mmLibTag=\'\';_mmLibKind=\'\';_mmLibPage=0;_mmSpellPage=0;_mmRenderLibraryManager()">' + c.label + ' <span style="opacity:.6">(' + c.count + ')</span></button>';
  });
  h += '<span style="flex:1"></span>';
  var ss = lib.scanStats;
  h += (ss ? '<span style="font-size:.66rem;color:#777">Last scan: ' + ss.added + ' added, ' + ss.dups + ' deduped, ' + ss.variants + ' variants from ' + ss.creatures + ' creatures</span>' : '');
  h += '<button class="mm-tabbtn" style="border-color:#80c08066;color:#80c080" onclick="var s=mmLibScan(true);_mmRenderLibraryManager();alert(\'Scan complete: \'+s.added+\' new components added (\'+s.dups+\' duplicates skipped, \'+s.variants+\' variants merged) from \'+s.creatures+\' creatures.\')">⟳ Scan Compendium</button>';
  h += '</div>';

  if (_mmLibCat === 'spells') {
    h += _mmLibSpellsHTML();
  } else {
    // filters + sort + page size
    var tags = mmLibTags(_mmLibCat);
    var kinds = _mmLibCat === 'legendary' ? ['legendary'] : ['trait','action','bonus','reaction'];
    h += '<div style="display:flex;gap:.4rem;margin-bottom:.5rem;flex-wrap:wrap">' +
      '<input id="mm-lm-q" placeholder="🔎 Search…" value="' + _mmLibQ.replace(/"/g,'&quot;') + '" oninput="_mmLibQ=this.value;_mmLibPage=0;_mmLibListOnly()" style="flex:1;min-width:160px;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.82rem;font-family:inherit;outline:none;padding:.3rem .45rem">' +
      '<select onchange="_mmLibTag=this.value;_mmLibPage=0;_mmLibListOnly()" style="' + _mmLmSelSty() + '"><option value="">All tags</option>' +
      tags.map(function(t){ return '<option value="' + t + '"' + (_mmLibTag===t?' selected':'') + '>#' + t + '</option>'; }).join('') + '</select>' +
      (_mmLibCat !== 'legendary' ? '<select onchange="_mmLibKind=this.value;_mmLibPage=0;_mmLibListOnly()" style="' + _mmLmSelSty() + '"><option value="">All kinds</option>' +
        kinds.map(function(k){ return '<option value="' + k + '"' + (_mmLibKind===k?' selected':'') + '>' + k + '</option>'; }).join('') + '</select>' : '') +
      '<select onchange="_mmLibSort=this.value;_mmLibPage=0;_mmLibListOnly()" title="Sort order" style="' + _mmLmSelSty() + '">' +
        [['name','Sort: Name A→Z'],['nameDesc','Sort: Name Z→A'],['kind','Sort: Kind'],['source','Sort: Source creature'],['custom','Sort: Custom first']].map(function(o){
          return '<option value="' + o[0] + '"' + (_mmLibSort===o[0]?' selected':'') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
      '<select onchange="_mmLibPageSize=parseInt(this.value);_mmLibPage=0;_mmLibListOnly()" title="Results per page" style="' + _mmLmSelSty() + '">' +
        [25,50,100].map(function(n){ return '<option value="' + n + '"' + (_mmLibPageSize===n?' selected':'') + '>' + n + ' / page</option>'; }).join('') + '</select>' +
      '</div><div id="mm-lm-list"></div>';
  }
  h += '</div>';
  body.innerHTML = h;
  if (_mmLibCat !== 'spells') _mmLibListOnly();
}

function _mmLmSelSty() {
  return 'background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.78rem;font-family:inherit;padding:.3rem .4rem';
}

// Shared pager bar: Prev / "Page X of Y (N results)" / Next
function _mmPagerHtml(total, page, pageSize, moveFn) {
  var pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return '';
  var btn = function(label, delta, disabled) {
    return '<button class="mm-ebtn" style="padding:.2rem .55rem;font-size:.72rem' + (disabled?';opacity:.35;cursor:default':'') + '"' +
      (disabled ? '' : ' onclick="' + moveFn + '(' + delta + ')"') + '>' + label + '</button>';
  };
  return '<div style="display:flex;gap:.5rem;align-items:center;justify-content:center;padding:.4rem 0">' +
    btn('◀ Prev', -1, page <= 0) +
    '<span style="font-size:.72rem;color:#998">Page ' + (page + 1) + ' of ' + pages + ' · ' + total + ' result' + (total===1?'':'s') + '</span>' +
    btn('Next ▶', 1, page >= pages - 1) +
    '</div>';
}

function _mmLibMovePage(delta) {
  _mmLibPage = Math.max(0, _mmLibPage + delta);
  _mmLibListOnly();
  var el = _mmIndexBody(); if (el && el.firstChild) el.firstChild.scrollTop = 0;
}

function _mmLibListOnly() {
  var el = document.getElementById('mm-lm-list'); if (!el) return;
  var res = mmLibSearch(_mmLibCat, _mmLibQ, _mmLibTag, _mmLibKind).slice();

  // sort
  var byName = function(a, b){ return String(a.name).localeCompare(String(b.name)); };
  if (_mmLibSort === 'name') res.sort(byName);
  else if (_mmLibSort === 'nameDesc') res.sort(function(a,b){ return byName(b,a); });
  else if (_mmLibSort === 'kind') res.sort(function(a,b){ return String(a.kind).localeCompare(String(b.kind)) || byName(a,b); });
  else if (_mmLibSort === 'source') res.sort(function(a,b){ return String(a.sourceCreature||'~').localeCompare(String(b.sourceCreature||'~')) || byName(a,b); });
  else if (_mmLibSort === 'custom') res.sort(function(a,b){ return (b.custom?1:0) - (a.custom?1:0) || byName(a,b); });

  if (!res.length) { el.innerHTML = '<div style="color:#666;font-style:italic;padding:1.2rem;text-align:center">No components' + (mmLib().scanned ? '' : ' — run ⟳ Scan Compendium to ingest your monster collection') + '.</div>'; return; }

  // paginate
  var pages = Math.max(1, Math.ceil(res.length / _mmLibPageSize));
  if (_mmLibPage >= pages) _mmLibPage = pages - 1;
  var start = _mmLibPage * _mmLibPageSize;
  var pageRows = res.slice(start, start + _mmLibPageSize);
  var pager = _mmPagerHtml(res.length, _mmLibPage, _mmLibPageSize, '_mmLibMovePage');

  var kindColor = { trait:'#80c080', action:'#c9a84c', bonus:'#70b8e0', reaction:'#d090e0', legendary:'#e08866' };
  el.innerHTML = '<div style="font-size:.66rem;color:#777;margin-bottom:.3rem">Showing ' + (start + 1) + '–' + (start + pageRows.length) + ' of ' + res.length + ' component' + (res.length===1?'':'s') + '</div>' +
    pager +
    pageRows.map(function(e){
      var open = _mmLibOpen[e.id];
      var kc = kindColor[e.kind] || '#999';
      var head = '<div style="display:flex;gap:.4rem;align-items:center;cursor:pointer" onclick="_mmLibOpen[\'' + e.id + '\']=' + (open?'false':'true') + ';_mmLibListOnly()">' +
        '<b style="color:#e0d6c0;font-size:.84rem">' + e.name + '</b>' +
        '<span style="font-size:.62rem;color:' + kc + ';border:1px solid ' + kc + '55;border-radius:4px;padding:0 .3rem">' + e.kind + '</span>' +
        (e.custom ? '<span style="font-size:.62rem;color:#c9a84c">★ custom</span>' : '') +
        '<span style="flex:1"></span>' +
        (e.sourceCreature ? '<span style="font-size:.64rem;color:#776">' + e.sourceCreature + '</span>' : '') +
        '<span style="color:#666;font-size:.7rem">' + (open ? '▾' : '▸') + '</span></div>';
      var tagsH = '<div style="margin-top:.25rem">' + (e.tags||[]).map(function(t){ return '<span class="mm-tag" onclick="_mmLibTag=\'' + t + '\';_mmLibPage=0;_mmLibListOnly()">#' + t + '</span>'; }).join('') +
        (open ? ' <span class="mm-tag" style="border-style:dashed;color:#888" onclick="_mmLibEditTags(\'' + e.id + '\')">+ tag</span>' : '') + '</div>';
      var bodyH = '';
      if (open) {
        bodyH = '<div style="margin-top:.4rem">' +
          '<input value="' + e.name.replace(/"/g,'&quot;') + '" onchange="mmLibUpdate(\'' + _mmLibCat + '\',\'' + e.id + '\',{name:this.value})" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.82rem;font-family:inherit;padding:.26rem .4rem;margin-bottom:.25rem">' +
          '<textarea onchange="mmLibUpdate(\'' + _mmLibCat + '\',\'' + e.id + '\',{desc:this.value})" style="width:100%;box-sizing:border-box;min-height:80px;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.8rem;font-family:inherit;padding:.26rem .4rem;resize:vertical">' + String(e.desc).replace(/</g,'&lt;') + '</textarea>' +
          '<div style="display:flex;gap:.4rem;margin-top:.3rem">' +
          '<button class="mm-ebtn" onclick="_mmAttachFromIndex(\'' + (_mmLibCat==='legendary'?'legendary':'actions') + '\',\'' + e.id + '\')">⚒ Attach to current monster</button>' +
          '<span style="flex:1"></span>' +
          (e.origins && e.origins.length > 1 ? '<span style="font-size:.62rem;color:#776;align-self:center">also in: ' + e.origins.slice(1, 4).join(', ') + (e.origins.length > 4 ? '…' : '') + '</span>' : '') +
          '<button class="mm-ebtn" style="color:#c07070" onclick="if(confirm(\'Delete from library?\')){mmLibRemove(\'' + _mmLibCat + '\',\'' + e.id + '\');_mmLibListOnly()}">🗑 Delete</button>' +
          '</div></div>';
      } else {
        bodyH = '<div style="font-size:.72rem;color:#998;margin-top:.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + String(e.desc).slice(0, 160) + '</div>';
      }
      return '<div class="mm-entry-row">' + head + tagsH + bodyH + '</div>';
    }).join('') + pager;
}

// Jump from the index into the Forge and attach the component to the monster
// currently on the anvil.
function _mmAttachFromIndex(sec, id) {
  _mmTab = 'build';
  if (typeof mmShowForgeTab === 'function') mmShowForgeTab(true);
  setTimeout(function(){ _mmAttachPick(sec, id); }, 120);
}

function _mmLibEditTags(id) {
  var e = (mmLib()[_mmLibCat]||[]).find(function(x){ return x.id === id; });
  if (!e) return;
  var t = prompt('Tags (comma-separated):', (e.tags||[]).join(', '));
  if (t === null) return;
  mmLibUpdate(_mmLibCat, id, { tags: t.split(',').map(function(x){ return x.trim(); }).filter(Boolean) });
  _mmLibListOnly();
}

// ── Spells catalog view ──────────────────────────────────────────
var _mmSpellLvlFilter = '';
function _mmLibSpellsHTML() {
  return '<div style="display:flex;gap:.4rem;margin-bottom:.5rem;flex-wrap:wrap">' +
    '<input placeholder="🔎 Search spells…" value="' + _mmLibQ.replace(/"/g,'&quot;') + '" oninput="_mmLibQ=this.value;_mmSpellPage=0;_mmSpellListOnly()" style="flex:1;min-width:160px;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.82rem;font-family:inherit;outline:none;padding:.3rem .45rem">' +
    '<select onchange="_mmSpellLvlFilter=this.value;_mmSpellPage=0;_mmSpellListOnly()" style="' + _mmLmSelSty() + '"><option value="">All levels</option>' +
    MM_SPELL_LEVELS.map(function(l, i){ return '<option value="' + i + '"' + (String(_mmSpellLvlFilter)===String(i)?' selected':'') + '>' + l + '</option>'; }).join('') + '</select>' +
    '<select onchange="_mmSpellSort=this.value;_mmSpellPage=0;_mmSpellListOnly()" title="Sort order" style="' + _mmLmSelSty() + '">' +
      [['name','Sort: Name A→Z'],['nameDesc','Sort: Name Z→A'],['level','Sort: Level ↑'],['levelDesc','Sort: Level ↓'],['school','Sort: School']].map(function(o){
        return '<option value="' + o[0] + '"' + (_mmSpellSort===o[0]?' selected':'') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
    '<select onchange="_mmSpellPageSize=parseInt(this.value);_mmSpellPage=0;_mmSpellListOnly()" title="Results per page" style="' + _mmLmSelSty() + '">' +
      [25,50,100].map(function(n){ return '<option value="' + n + '"' + (_mmSpellPageSize===n?' selected':'') + '>' + n + ' / page</option>'; }).join('') + '</select>' +
    '</div>' +
    '<div id="mm-lm-spells"></div>';
}

function _mmSpellMovePage(delta) {
  _mmSpellPage = Math.max(0, _mmSpellPage + delta);
  _mmSpellListOnly();
  var el = _mmIndexBody(); if (el && el.firstChild) el.firstChild.scrollTop = 0;
}

function _mmSpellListOnly() {
  var el = document.getElementById('mm-lm-spells'); if (!el) return;
  var res = mmSpellSearch(_mmLibQ, _mmSpellLvlFilter === '' ? null : _mmSpellLvlFilter).slice();

  // sort
  var byName = function(a, b){ return String(a.n).localeCompare(String(b.n)); };
  if (_mmSpellSort === 'name') res.sort(byName);
  else if (_mmSpellSort === 'nameDesc') res.sort(function(a,b){ return byName(b,a); });
  else if (_mmSpellSort === 'level') res.sort(function(a,b){ return (a.l||0) - (b.l||0) || byName(a,b); });
  else if (_mmSpellSort === 'levelDesc') res.sort(function(a,b){ return (b.l||0) - (a.l||0) || byName(a,b); });
  else if (_mmSpellSort === 'school') res.sort(function(a,b){ return String(a.s||'').localeCompare(String(b.s||'')) || byName(a,b); });

  // paginate
  var pages = Math.max(1, Math.ceil(res.length / _mmSpellPageSize));
  if (_mmSpellPage >= pages) _mmSpellPage = pages - 1;
  var start = _mmSpellPage * _mmSpellPageSize;
  var pageRows = res.slice(start, start + _mmSpellPageSize);
  var pager = _mmPagerHtml(res.length, _mmSpellPage, _mmSpellPageSize, '_mmSpellMovePage');

  el.innerHTML = '<div style="font-size:.66rem;color:#777;margin-bottom:.3rem">Showing ' + (res.length ? (start + 1) : 0) + '–' + (start + pageRows.length) + ' of ' + res.length + ' spells (SRD 5.2)</div>' +
    pager +
    pageRows.map(function(s){
      return '<div class="mm-entry-row" style="display:flex;gap:.5rem;align-items:baseline">' +
        '<b style="color:#b8a8e0;font-size:.84rem;min-width:170px">' + s.n + '</b>' +
        '<span style="font-size:.64rem;color:#776;min-width:120px">' + MM_SPELL_LEVELS[s.l] + ' · ' + s.s + (s.k ? ' · ⏳C' : '') + '</span>' +
        '<span style="font-size:.72rem;color:#998;flex:1">' + s.x + '</span>' +
        '<button class="mm-ebtn" onclick="_mmSpellPickFromLib(\'' + s.n.replace(/'/g,"\\'") + '\')">+ Add to Forge</button>' +
        '</div>';
    }).join('') + pager;
}

function _mmSpellPickFromLib(name) {
  if (!_mmM) _mmM = mmNewMonster();
  var sp = mmNormSpells(_mmM);
  var s = mmSpellByName(name);
  if (!sp.list.some(function(x){ return String(x.name).toLowerCase() === String(name).toLowerCase(); }))
    sp.list.push({ name: s ? s.n : name, level: s ? s.l : 0, custom: !s });
  alert('"' + name + '" added to ' + _mmM.name + '’s spell list.');
}
