// ═══════════════════════════════════════════════════════════════
//  MONSTER MAKER — Library Manager dashboard
//  Browse / filter / edit / delete / tag the global component pools.
// ═══════════════════════════════════════════════════════════════

var _mmLibOpen = {}; // expanded rows

function _mmRenderLibraryManager() {
  var body = document.getElementById('mm-body'); if (!body) return;
  var lib = mmLib();
  var cats = [
    { key: 'traits',    label: '⚔ Traits & Actions', count: (lib.traits||[]).length },
    { key: 'legendary', label: '👑 Legendary / Mythic', count: (lib.legendary||[]).length },
    { key: 'spells',    label: '✨ Spells', count: (typeof MM_SPELLS !== 'undefined' ? MM_SPELLS.length : 0) + (lib.spells||[]).length }
  ];
  var h = '<div style="width:100%;overflow-y:auto;padding:.8rem;box-sizing:border-box">';

  // header: cat tabs + scan
  h += '<div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-bottom:.6rem">';
  cats.forEach(function(c){
    h += '<button class="mm-tabbtn' + (_mmLibCat===c.key?' on':'') + '" onclick="_mmLibCat=\'' + c.key + '\';_mmLibQ=\'\';_mmLibTag=\'\';_mmLibKind=\'\';_mmRenderLibraryManager()">' + c.label + ' <span style="opacity:.6">(' + c.count + ')</span></button>';
  });
  h += '<span style="flex:1"></span>';
  var ss = lib.scanStats;
  h += (ss ? '<span style="font-size:.66rem;color:#777">Last scan: ' + ss.added + ' added, ' + ss.dups + ' deduped, ' + ss.variants + ' variants from ' + ss.creatures + ' creatures</span>' : '');
  h += '<button class="mm-tabbtn" style="border-color:#80c08066;color:#80c080" onclick="var s=mmLibScan(true);_mmRenderLibraryManager();alert(\'Scan complete: \'+s.added+\' new components added (\'+s.dups+\' duplicates skipped, \'+s.variants+\' variants merged) from \'+s.creatures+\' creatures.\')">⟳ Scan Compendium</button>';
  h += '</div>';

  if (_mmLibCat === 'spells') {
    h += _mmLibSpellsHTML();
  } else {
    // filters
    var tags = mmLibTags(_mmLibCat);
    var kinds = _mmLibCat === 'legendary' ? ['legendary'] : ['trait','action','bonus','reaction'];
    h += '<div style="display:flex;gap:.4rem;margin-bottom:.5rem;flex-wrap:wrap">' +
      '<input id="mm-lm-q" placeholder="🔎 Search…" value="' + _mmLibQ.replace(/"/g,'&quot;') + '" oninput="_mmLibQ=this.value;_mmLibListOnly()" style="flex:1;min-width:160px;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.82rem;font-family:inherit;outline:none;padding:.3rem .45rem">' +
      '<select onchange="_mmLibTag=this.value;_mmLibListOnly()" style="background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.78rem;font-family:inherit;padding:.3rem .4rem"><option value="">All tags</option>' +
      tags.map(function(t){ return '<option value="' + t + '"' + (_mmLibTag===t?' selected':'') + '>#' + t + '</option>'; }).join('') + '</select>' +
      (_mmLibCat !== 'legendary' ? '<select onchange="_mmLibKind=this.value;_mmLibListOnly()" style="background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.78rem;font-family:inherit;padding:.3rem .4rem"><option value="">All kinds</option>' +
        kinds.map(function(k){ return '<option value="' + k + '"' + (_mmLibKind===k?' selected':'') + '>' + k + '</option>'; }).join('') + '</select>' : '') +
      '</div><div id="mm-lm-list"></div>';
  }
  h += '</div>';
  body.innerHTML = h;
  if (_mmLibCat !== 'spells') _mmLibListOnly();
}

function _mmLibListOnly() {
  var el = document.getElementById('mm-lm-list'); if (!el) return;
  var res = mmLibSearch(_mmLibCat, _mmLibQ, _mmLibTag, _mmLibKind);
  if (!res.length) { el.innerHTML = '<div style="color:#666;font-style:italic;padding:1.2rem;text-align:center">No components' + (mmLib().scanned ? '' : ' — run ⟳ Scan Compendium to ingest your monster collection') + '.</div>'; return; }
  var kindColor = { trait:'#80c080', action:'#c9a84c', bonus:'#70b8e0', reaction:'#d090e0', legendary:'#e08866' };
  el.innerHTML = '<div style="font-size:.66rem;color:#777;margin-bottom:.3rem">' + res.length + ' component' + (res.length===1?'':'s') + '</div>' +
    res.slice(0, 400).map(function(e){
      var open = _mmLibOpen[e.id];
      var kc = kindColor[e.kind] || '#999';
      var head = '<div style="display:flex;gap:.4rem;align-items:center;cursor:pointer" onclick="_mmLibOpen[\'' + e.id + '\']=' + (open?'false':'true') + ';_mmLibListOnly()">' +
        '<b style="color:#e0d6c0;font-size:.84rem">' + e.name + '</b>' +
        '<span style="font-size:.62rem;color:' + kc + ';border:1px solid ' + kc + '55;border-radius:4px;padding:0 .3rem">' + e.kind + '</span>' +
        (e.custom ? '<span style="font-size:.62rem;color:#c9a84c">★ custom</span>' : '') +
        '<span style="flex:1"></span>' +
        (e.sourceCreature ? '<span style="font-size:.64rem;color:#776">' + e.sourceCreature + '</span>' : '') +
        '<span style="color:#666;font-size:.7rem">' + (open ? '▾' : '▸') + '</span></div>';
      var tagsH = '<div style="margin-top:.25rem">' + (e.tags||[]).map(function(t){ return '<span class="mm-tag" onclick="_mmLibTag=\'' + t + '\';_mmLibListOnly()">#' + t + '</span>'; }).join('') +
        (open ? ' <span class="mm-tag" style="border-style:dashed;color:#888" onclick="_mmLibEditTags(\'' + e.id + '\')">+ tag</span>' : '') + '</div>';
      var bodyH = '';
      if (open) {
        bodyH = '<div style="margin-top:.4rem">' +
          '<input value="' + e.name.replace(/"/g,'&quot;') + '" onchange="mmLibUpdate(\'' + _mmLibCat + '\',\'' + e.id + '\',{name:this.value})" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.82rem;font-family:inherit;padding:.26rem .4rem;margin-bottom:.25rem">' +
          '<textarea onchange="mmLibUpdate(\'' + _mmLibCat + '\',\'' + e.id + '\',{desc:this.value})" style="width:100%;box-sizing:border-box;min-height:80px;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.8rem;font-family:inherit;padding:.26rem .4rem;resize:vertical">' + String(e.desc).replace(/</g,'&lt;') + '</textarea>' +
          '<div style="display:flex;gap:.4rem;margin-top:.3rem">' +
          '<button class="mm-ebtn" onclick="_mmTab=\'build\';_mmRenderShell();setTimeout(function(){_mmAttachPick(\'' + (_mmLibCat==='legendary'?'legendary':'actions') + '\',\'' + e.id + '\')},80)">⚒ Attach to current monster</button>' +
          '<span style="flex:1"></span>' +
          (e.origins && e.origins.length > 1 ? '<span style="font-size:.62rem;color:#776;align-self:center">also in: ' + e.origins.slice(1, 4).join(', ') + (e.origins.length > 4 ? '…' : '') + '</span>' : '') +
          '<button class="mm-ebtn" style="color:#c07070" onclick="if(confirm(\'Delete from library?\')){mmLibRemove(\'' + _mmLibCat + '\',\'' + e.id + '\');_mmLibListOnly()}">🗑 Delete</button>' +
          '</div></div>';
      } else {
        bodyH = '<div style="font-size:.72rem;color:#998;margin-top:.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + String(e.desc).slice(0, 160) + '</div>';
      }
      return '<div class="mm-entry-row">' + head + tagsH + bodyH + '</div>';
    }).join('') + (res.length > 400 ? '<div style="color:#666;font-size:.7rem;text-align:center;padding:.5rem">… ' + (res.length - 400) + ' more — refine your search</div>' : '');
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
    '<input placeholder="🔎 Search spells…" value="' + _mmLibQ.replace(/"/g,'&quot;') + '" oninput="_mmLibQ=this.value;_mmSpellListOnly()" style="flex:1;min-width:160px;background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.82rem;font-family:inherit;outline:none;padding:.3rem .45rem">' +
    '<select onchange="_mmSpellLvlFilter=this.value;_mmSpellListOnly()" style="background:rgba(255,255,255,.06);color:#e8dcc0;border:1px solid rgba(255,255,255,.14);border-radius:5px;font-size:.78rem;font-family:inherit;padding:.3rem .4rem"><option value="">All levels</option>' +
    MM_SPELL_LEVELS.map(function(l, i){ return '<option value="' + i + '"' + (String(_mmSpellLvlFilter)===String(i)?' selected':'') + '>' + l + '</option>'; }).join('') + '</select></div>' +
    '<div id="mm-lm-spells"></div>';
}
function _mmSpellListOnly() {
  var el = document.getElementById('mm-lm-spells'); if (!el) return;
  var res = mmSpellSearch(_mmLibQ, _mmSpellLvlFilter === '' ? null : _mmSpellLvlFilter);
  el.innerHTML = '<div style="font-size:.66rem;color:#777;margin-bottom:.3rem">' + res.length + ' spells (SRD 5.2)</div>' +
    res.slice(0, 200).map(function(s){
      return '<div class="mm-entry-row" style="display:flex;gap:.5rem;align-items:baseline">' +
        '<b style="color:#b8a8e0;font-size:.84rem;min-width:170px">' + s.n + '</b>' +
        '<span style="font-size:.64rem;color:#776;min-width:120px">' + MM_SPELL_LEVELS[s.l] + ' · ' + s.s + (s.k ? ' · ⏳C' : '') + '</span>' +
        '<span style="font-size:.72rem;color:#998;flex:1">' + s.x + '</span>' +
        '<button class="mm-ebtn" onclick="_mmSpellPickFromLib(\'' + s.n.replace(/'/g,"\\'") + '\')">+ Add to Forge</button>' +
        '</div>';
    }).join('') + (res.length > 200 ? '<div style="color:#666;font-size:.7rem;text-align:center;padding:.5rem">… ' + (res.length - 200) + ' more — refine your search</div>' : '');
}
function _mmSpellPickFromLib(name) {
  if (!_mmM) _mmM = mmNewMonster();
  var sp = mmNormSpells(_mmM);
  var s = mmSpellByName(name);
  if (!sp.list.some(function(x){ return String(x.name).toLowerCase() === String(name).toLowerCase(); }))
    sp.list.push({ name: s ? s.n : name, level: s ? s.l : 0, custom: !s });
  alert('"' + name + '" added to ' + _mmM.name + '\u2019s spell list.');
}
