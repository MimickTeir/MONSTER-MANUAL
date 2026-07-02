// atlas-encounter.js — The Atlas Encounter Builder (D&D 2024 / 5.5e XP-budget rules).
//
// A third Bestiary sub-tab. It is campaign-aware: it reads the launcher's campaign
// list (localStorage "atlas-mock-v3") and each campaign's live party
// (localStorage "<ns>si_state_v2".party), computes the 2024 XP budget for the
// chosen difficulty, lets you spend that budget on tracked + searched creatures,
// and SAVES the finished encounter straight into the chosen campaign's combat
// tracker (state.encounter) so the DM can run it when ready.
//
// Loaded as a classic script after mm_builder.js, so it shares the engine's
// global scope and can call _crXP, MHMM_LIBRARY, _mhmmCustom, _encId, _parseHP,
// _parseAC, _KIND_COLORS, etc. directly.

(function () {
  'use strict';

  // ── D&D 2024 DMG — XP Budget per Character (Low / Moderate / High) ──
  // Index by party level 1–20. Source: 2024 Dungeon Master's Guide, "Plan Encounters".
  var AE_XP = {
    1:[50,75,100],        2:[100,150,200],      3:[150,225,400],      4:[250,375,500],
    5:[500,750,1100],     6:[600,1000,1400],    7:[750,1300,1700],    8:[1000,1700,2100],
    9:[1300,2000,2600],   10:[1600,2300,3100],  11:[1900,2900,4100],  12:[2200,3700,4700],
    13:[2600,4200,5400],  14:[2900,4900,6200],  15:[3300,5400,7800],  16:[3800,6100,9800],
    17:[4500,7200,11700], 18:[5000,8700,14200], 19:[5500,10700,17200],20:[6400,13200,22000]
  };

  // Tier definitions. low/moderate/high are RAW 2024 rules. extreme/punishing are
  // clearly-labelled homebrew extensions above High (×1.5 and ×2 of the High budget).
  var AE_TIERS = [
    { key:'low',       label:'Low',       col:'#6fae7a', official:true,  note:'A scary moment or two; victory expected.' },
    { key:'moderate',  label:'Moderate',  col:'#c9a84c', official:true,  note:'Could go badly; a weak PC might drop.' },
    { key:'high',      label:'High',      col:'#d98a4c', official:true,  note:'Lethal for one or more PCs without smart play.' },
    { key:'extreme',   label:'Extreme',   col:'#d9594c', official:false, note:'Homebrew — 1.5× the High budget. Expect casualties.' },
    { key:'punishing', label:'Punishing', col:'#b14ad9', official:false, note:'Homebrew — 2× the High budget. A near-unwinnable wall.' }
  ];

  // ── Module state (resets per Forge session) ──
  var _aeNs      = null;     // chosen campaign namespace
  var _aeTarget  = 'high';   // selected difficulty tier key
  var _aeMons    = [];       // [{name, cr, xp, count}]
  var _aeName    = '';       // encounter name
  var _aeSearch  = '';       // bestiary search query
  var _aeLvlOv   = {};       // { ns: { memberName: levelOverride } }
  var _aeMsg     = null;     // transient toast {text, ok}
  var _aeRootId  = 'ae-tab-root'; // container the builder renders into

  var AE_G='#c9a84c', AE_TEXT='#e8dcc8', AE_MUTED='rgba(200,180,140,0.55)',
      AE_DIM='rgba(200,170,100,0.38)', AE_FAINT='rgba(200,170,100,0.08)';

  function _esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _attr(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
  function _xpOf(cr){ return (typeof _crXP === 'function') ? _crXP(cr) : 0; }
  function _fmt(n){ return (n||0).toLocaleString(); }

  // The engine shims window.localStorage to prefix the Forge's own namespace
  // (atlasBestiary::). Cross-campaign keys (atlas-mock-v3, <ns>si_state_v2) live in
  // the REAL store, exposed by the namespace shim as window.__realLS.
  function _ls(){ return window.__realLS || window.localStorage; }

  // ── Data reads ──────────────────────────────────────────────
  function _atlas(){ try { return JSON.parse(_ls().getItem('atlas-mock-v3')) || {}; } catch(e){ return {}; } }
  function _campaigns(){
    var a=_atlas();
    var list = Array.isArray(a.campaigns) ? a.campaigns.slice() : [];
    // Fallback: the launcher only persists "atlas-mock-v3" after a change. If it's
    // absent, discover campaigns directly from their saved states ("<ns>si_state_v2").
    if (!list.length) {
      var byNs = {};
      try {
        var LS = _ls();
        for (var i=0;i<LS.length;i++){
          var k = LS.key(i);
          if (!k || !/si_state_v2$/.test(k)) continue;
          var ns = k.replace(/si_state_v2$/, '');
          if (!/::$/.test(ns)) continue;                       // only true namespaced saves
          if ((ns.match(/::/g)||[]).length !== 1) continue;     // skip double-prefixed artifacts
          if (ns.indexOf('atlasBestiary') === 0) continue;      // the Forge's own scratch save
          if (byNs[ns]) continue; byNs[ns]=true;
          var title = ns === 'siCampaign::' ? 'The Shattered Isles'
                    : (ns.replace(/::$/,'').replace(/^si[_-]/,'').replace(/[-_]/g,' ').trim() || 'Campaign');
          try { var st = JSON.parse(LS.getItem(k)); if (st && st.worldName) title = st.worldName; } catch(e){}
          list.push({ id: ns, title: title.charAt(0).toUpperCase()+title.slice(1), ns: ns,
            real: 'campaigns/The Shattered Isles/The Shattered Isles - My Campaign.html' });
        }
      } catch(e){}
    }
    // Guarantee the canonical campaign is always offered.
    if (!list.some(function(c){ return c.ns==='siCampaign::'; }))
      list.unshift({ id:'siCampaign::', title:'The Shattered Isles', ns:'siCampaign::',
        real:'campaigns/The Shattered Isles/The Shattered Isles - My Campaign.html' });
    return list;
  }
  function _campaignByNs(ns){ return _campaigns().find(function(c){ return c.ns===ns; }) || null; }

  // Live party for a campaign: prefer its namespaced save, fall back to the
  // launcher's seed roster. Returns [{name, cls, level}].
  function _party(ns){
    var live = null;
    try {
      var st = JSON.parse(_ls().getItem(ns + 'si_state_v2'));
      if (st && Array.isArray(st.party) && st.party.length) live = st.party;
    } catch(e){}
    var src = live;
    if (!src) {
      var c = _campaignByNs(ns);
      src = (c && Array.isArray(c.party)) ? c.party : [];
    }
    var ov = _aeLvlOv[ns] || {};
    return src.map(function(p){
      var lvl = ov[p.name] != null ? ov[p.name] : (parseInt(p.level) || 1);
      return { name: p.name || 'Adventurer', cls: p.cls || p.class || '', level: Math.max(1, Math.min(20, lvl)) };
    });
  }

  // ── Budget math ─────────────────────────────────────────────
  // Sum each character's own per-level budget (correct for mixed-level parties).
  function _budgets(party){
    var b = { low:0, moderate:0, high:0 };
    party.forEach(function(p){
      var row = AE_XP[Math.max(1, Math.min(20, p.level))] || AE_XP[1];
      b.low += row[0]; b.moderate += row[1]; b.high += row[2];
    });
    b.extreme   = Math.round(b.high * 1.5);
    b.punishing = b.high * 2;
    return b;
  }

  function _spent(){ return _aeMons.reduce(function(s,m){ return s + (m.xp||0) * (m.count||1); }, 0); }
  function _headcount(){ return _aeMons.reduce(function(s,m){ return s + (m.count||1); }, 0); }

  // Which tier does a given spent-XP land in, relative to a party's budgets?
  function _classify(spent, b){
    if (spent <= 0) return { label:'Empty', col:AE_MUTED };
    if (spent < b.low)       return { label:'Trivial',   col:'#7a8a6a' };
    if (spent < b.moderate)  return { label:'Low',       col:'#6fae7a' };
    if (spent < b.high)      return { label:'Moderate',  col:'#c9a84c' };
    if (spent < b.extreme)   return { label:'High',      col:'#d98a4c' };
    if (spent < b.punishing) return { label:'Extreme',   col:'#d9594c' };
    return { label:'Punishing+', col:'#b14ad9' };
  }

  // ── Monster pools ───────────────────────────────────────────
  function _tracked(){
    var st = (typeof state !== 'undefined' && state) ? state : {};
    return Array.isArray(st.monsters) ? st.monsters : [];
  }
  // Everything searchable: MH Library + custom variants + divine beasts + homebrew.
  function _searchPool(q){
    q = (q||'').toLowerCase().trim();
    var out = [], seen = {};
    function add(name, cr){
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) return; seen[key] = 1;
      if (q && key.indexOf(q) === -1) return;
      out.push({ name: name, cr: (cr==null?'?':String(cr)) });
    }
    try { if (typeof MHMM_LIBRARY !== 'undefined') MHMM_LIBRARY.forEach(function(m){ add(m.name, m.cr); }); } catch(e){}
    try { if (typeof _mhmmCustom === 'function') _mhmmCustom().forEach(function(m){ add(m.name, m.cr); }); } catch(e){}
    var st = (typeof state !== 'undefined' && state) ? state : {};
    (st.divineBeasts||[]).forEach(function(b){ add(b.name, b.cr); });
    (st.homebrewMonsters||[]).forEach(function(h){ add(h.name, h.cr); });
    return out.slice(0, 60);
  }

  // ── Mutations ───────────────────────────────────────────────
  function _addMon(name, cr){
    var existing = _aeMons.find(function(m){ return m.name===name; });
    if (existing) { existing.count++; }
    else { _aeMons.push({ name:name, cr:String(cr==null?'?':cr), xp:_xpOf(cr), count:1 }); }
    _render();
  }
  window.aeAddByName = function(name){
    var pool = _searchPool('');
    var hit = pool.find(function(m){ return m.name===name; });
    _addMon(name, hit ? hit.cr : '?');
  };
  window.aeAddTracked = function(idx){ var t=_tracked()[idx]; if (t) _addMon(t.name, t.cr); };
  window.aeAddSearch  = function(name, cr){ _addMon(name, cr); };
  window.aeStep = function(idx, d){
    var m=_aeMons[idx]; if(!m) return;
    m.count += d;
    if (m.count <= 0) _aeMons.splice(idx,1);
    _render();
  };
  window.aeRemove = function(idx){ _aeMons.splice(idx,1); _render(); };
  window.aeClear = function(){ if (_aeMons.length && !confirm('Clear all creatures from this encounter?')) return; _aeMons=[]; _render(); };
  window.aeSetCampaign = function(ns){ _aeNs = ns || null; _render(); };
  window.aeSetTarget = function(k){ _aeTarget = k; _render(); };
  window.aeSetName = function(v){ _aeName = v; };
  window.aeSearchInput = function(v){ _aeSearch = v; _renderSearchResults(); };
  window.aeSetLevel = function(ns, name, v){
    var lvl = Math.max(1, Math.min(20, parseInt(v)||1));
    _aeLvlOv[ns] = _aeLvlOv[ns] || {};
    _aeLvlOv[ns][name] = lvl;
    _render();
  };

  // ── Save the encounter into the chosen campaign's combat tracker ──
  window.aeSaveToCampaign = function(){
    if (!_aeNs) { _toast('Choose a campaign first.', false); return; }
    if (!_aeMons.length) { _toast('Add at least one creature.', false); return; }
    var key = _aeNs + 'si_state_v2';
    var st;
    try { st = JSON.parse(_ls().getItem(key)) || {}; } catch(e){ st = {}; }

    var combatants = [];
    var KIND = (typeof _KIND_COLORS !== 'undefined') ? _KIND_COLORS : { monster:'#e07070' };
    var idBase = Date.now();
    _aeMons.forEach(function(m){
      var info = _lookupStat(m.name);
      var n = m.count || 1;
      for (var i=0;i<n;i++){
        var maxHp = info.hp;
        combatants.push({
          id: 'ae'+(idBase++)+Math.random().toString(36).slice(2,5),
          kind:'monster', playerIdx:null,
          name: n>1 ? (m.name+' '+(i+1)) : m.name,
          initiative:null, initMod:0,
          hp: maxHp, maxHp: maxHp, ac: info.ac, tempHp:0,
          cr: m.cr||'?', statuses:[], notes:'', color: KIND.monster,
          monsterType: info.type||'',
          reactionUsed:false,
          legendaryActionsMax:0, legendaryActions:0,
          legendaryResistancesMax:0, legendaryResistances:0
        });
      }
    });

    // Stage (not active) so the DM rolls initiative when ready. Players are
    // auto-added from state.party when the campaign opens its tracker.
    st.encounter = {
      active:false, round:1, turnIdx:0,
      combatants: combatants, log:[], notes:'',
      xpEarned:0,
      name: (_aeName || 'Atlas Encounter')
    };
    // Also file it as a reusable preset. IMPORTANT: match the shape the campaign's
    // combat tracker expects (loadEncounterPreset reads p.id + p.combatants) — an
    // earlier version stored {monsters,…} with no id, so its Load button no-op'd.
    if (!Array.isArray(st.encounterPresets)) st.encounterPresets = [];
    var presetName = (_aeName || 'Atlas Encounter');
    // Overwrite an existing preset of the same name instead of piling up duplicates.
    var _exIdx = st.encounterPresets.findIndex(function(p){ return p.name === presetName; });
    if (_exIdx !== -1) st.encounterPresets.splice(_exIdx, 1);
    st.encounterPresets.unshift({
      id: 'pr' + Date.now() + Math.random().toString(36).slice(2,5),
      name: presetName,
      combatants: JSON.parse(JSON.stringify(combatants)),
      created: Date.now(),
      from: 'Atlas Encounter Builder',
      totalXp: _spent()
    });

    try {
      _ls().setItem(key, JSON.stringify(st));
      var c = _campaignByNs(_aeNs);
      _toast('Sent “'+(_aeName||'Atlas Encounter')+'” to '+((c&&c.title)||'the campaign')+'. Open it → DM Screen → Combat Tracker.', true);
      _aeName=''; _aeMons=[];
      _render();
    } catch(e){ _toast('Could not save: '+e.message, false); }
  };

  // Look up HP/AC/type for a creature name from any pool, for the handoff.
  function _lookupStat(name){
    var hp=10, ac=10, type='';
    function fromStatblock(sb, hpStr){
      if (typeof _parseHP === 'function' && hpStr) hp = _parseHP(hpStr);
      if (typeof _parseAC === 'function' && sb) ac = _parseAC(sb);
    }
    try {
      var m = (typeof MHMM_LIBRARY !== 'undefined') ? MHMM_LIBRARY.find(function(x){return x.name===name;}) : null;
      if (!m && typeof _mhmmCustom==='function') m = _mhmmCustom().find(function(x){return x.name===name;});
      if (m){ fromStatblock(m.statblock, m.hp); type=m.type||''; return {hp:hp,ac:ac,type:type}; }
    } catch(e){}
    var st = (typeof state!=='undefined'&&state)?state:{};
    var d = (st.divineBeasts||[]).find(function(x){return x.name===name;});
    if (d){ hp = (typeof _parseHP==='function')?_parseHP(d.hp||50):50; ac = d.ac?parseInt(d.ac):14; return {hp:hp,ac:ac,type:d.creatureType||''}; }
    var h = (st.homebrewMonsters||[]).find(function(x){return x.name===name;});
    if (h){ hp = (typeof _parseHP==='function')?_parseHP(h.hp||30):30; ac = h.ac?parseInt(h.ac):12; return {hp:hp,ac:ac,type:h.type||''}; }
    var t = _tracked().find(function(x){return x.name===name;});
    if (t){ fromStatblock(t.statblock, t.hp); type=t.type||''; }
    return {hp:hp,ac:ac,type:type};
  }

  function _toast(text, ok){ _aeMsg={text:text,ok:ok}; _render(); setTimeout(function(){ _aeMsg=null; var e=document.getElementById('ae-toast'); if(e) e.style.display='none'; }, 4200); }

  // ── Render ──────────────────────────────────────────────────
  function _render(){
    var root = document.getElementById(_aeRootId);
    if (!root) return;
    // Preserve a focused input (bestiary search / encounter name) across the
    // innerHTML rebuild. The campaign calls refreshCurrentTab() from its periodic
    // state-sync, which re-renders this tab; without this, the search & name fields
    // are un-typeable until some other interaction forces a clean re-render.
    var _af = document.activeElement;
    var _pid = (_af && root.contains(_af) && (_af.tagName === 'INPUT' || _af.tagName === 'TEXTAREA')) ? _af.id : null;
    var _pval = _pid ? _af.value : null;
    var _ps = _pid ? _af.selectionStart : null, _pe = _pid ? _af.selectionEnd : null;
    function _restoreFocus(){
      if (!_pid) return;
      var el = document.getElementById(_pid);
      if (el){ try { if (_pval != null && el.value !== _pval) el.value = _pval; el.focus(); if (_ps != null && el.setSelectionRange) el.setSelectionRange(_ps, _pe); } catch(e){} }
    }
    var camps = _campaigns();
    if (!_aeNs && camps.length) _aeNs = camps[0].ns;
    var party = _aeNs ? _party(_aeNs) : [];
    var b = _budgets(party);
    var spent = _spent();
    var tgt = b[_aeTarget] || 0;
    var cls = _classify(spent, b);
    var camp = _campaignByNs(_aeNs);

    var html = '';
    html += _header();
    html += _campaignBar(camps);
    if (!_aeNs || !camps.length) {
      html += '<div style="text-align:center;padding:48px 20px;color:'+AE_MUTED+';font-family:\'Crimson Text\',serif;font-style:italic">No campaigns found yet. Create a campaign in The Atlas, then return here to build an encounter for its party.</div>';
      root.innerHTML = html;
      _restoreFocus();
      return;
    }
    html += _partyBlock(party, b);
    html += _difficultyBar(party, b);
    html += _meter(spent, tgt, cls, b);
    html += _encounterList();
    html += _addBlock();
    html += _saveBar(camp);
    if (_aeMsg) html += '<div id="ae-toast" style="position:sticky;bottom:8px;margin-top:14px;padding:11px 14px;border-radius:9px;font-family:\'Crimson Text\',serif;font-size:13px;border:1px solid '+(_aeMsg.ok?'rgba(111,174,122,.5)':'rgba(217,89,76,.5)')+';background:'+(_aeMsg.ok?'rgba(111,174,122,.14)':'rgba(217,89,76,.14)')+';color:'+(_aeMsg.ok?'#9fd8ac':'#f0a09a')+'">'+_esc(_aeMsg.text)+'</div>';
    root.innerHTML = html;
    _restoreFocus();
    // Re-populate live search results too (they live in a child div that the main
    // render leaves empty), so a background re-render doesn't blank the results.
    if (_aeSearch && _aeSearch.trim()) _renderSearchResults();
  }

  function _header(){
    return '<div style="text-align:center;margin-bottom:16px;padding:18px 16px;background:rgba(8,6,4,.96);border:1px solid rgba(200,170,100,.2);border-radius:12px">'+
      '<div style="font-size:28px;margin-bottom:2px">⚔️</div>'+
      '<div style="font-family:\'Cinzel\',serif;font-size:21px;font-weight:700;color:'+AE_G+';letter-spacing:2px">ENCOUNTER BUILDER</div>'+
      '<div style="height:1px;background:linear-gradient(90deg,transparent,'+AE_G+'60,transparent);margin:9px auto 7px"></div>'+
      '<div style="font-family:\'Crimson Text\',serif;font-style:italic;font-size:13px;color:'+AE_MUTED+'">Balance a fight to D&D 2024 XP budgets, then send it to a campaign\u2019s combat tracker.</div>'+
    '</div>';
  }

  function _campaignBar(camps){
    var opts = camps.map(function(c){ return '<option value="'+_esc(c.ns)+'"'+(c.ns===_aeNs?' selected':'')+'>'+_esc(c.title||c.id)+'</option>'; }).join('');
    return '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">'+
      '<span style="font-family:\'Cinzel\',serif;font-size:12px;letter-spacing:1px;color:'+AE_MUTED+';text-transform:uppercase">Campaign</span>'+
      '<select onchange="aeSetCampaign(this.value)" style="flex:1;min-width:180px;padding:8px 11px;background:rgba(255,255,255,.05);color:'+AE_TEXT+';border:1px solid rgba(200,170,100,.28);border-radius:7px;font-size:14px;font-family:\'Crimson Text\',serif;outline:none">'+opts+'</select>'+
    '</div>';
  }

  function _partyBlock(party, b){
    if (!party.length) return '<div style="padding:14px;border:1px dashed rgba(200,170,100,.25);border-radius:9px;color:'+AE_MUTED+';font-family:\'Crimson Text\',serif;font-style:italic;margin-bottom:14px">This campaign has no party members saved yet. Add characters in the campaign, or adjust below.</div>';
    var chips = party.map(function(p){
      return '<div style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.04);border:1px solid rgba(200,170,100,.18);border-radius:8px;padding:6px 9px">'+
        '<div style="min-width:0"><div style="font-family:\'Cinzel\',serif;font-size:12.5px;color:'+AE_TEXT+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px">'+_esc(p.name)+'</div>'+
        (p.cls?'<div style="font-size:10px;color:'+AE_MUTED+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px">'+_esc(p.cls)+'</div>':'')+'</div>'+
        '<div style="display:flex;align-items:center;gap:3px">'+
          '<span style="font-size:9px;color:'+AE_DIM+';letter-spacing:1px">LV</span>'+
          '<input type="number" min="1" max="20" value="'+p.level+'" onchange="aeSetLevel(\''+_attr(_aeNs)+'\',\''+_attr(p.name)+'\',this.value)" style="width:42px;padding:3px 5px;background:rgba(0,0,0,.3);color:'+AE_G+';border:1px solid rgba(200,170,100,.25);border-radius:5px;font-size:12px;text-align:center;font-family:\'Crimson Text\',serif">'+
        '</div>'+
      '</div>';
    }).join('');
    return '<div style="margin-bottom:14px">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px">'+
        '<span style="font-family:\'Cinzel\',serif;font-size:12px;letter-spacing:1px;color:'+AE_MUTED+';text-transform:uppercase">Party \u00b7 '+party.length+'</span>'+
        '<span style="font-size:11px;color:'+AE_DIM+';font-family:\'Crimson Text\',serif">Levels pulled from the campaign save \u2014 edit if stale</span>'+
      '</div>'+
      '<div style="display:flex;gap:7px;flex-wrap:wrap">'+chips+'</div>'+
    '</div>';
  }

  function _difficultyBar(party, b){
    var cells = AE_TIERS.map(function(t){
      var on = t.key===_aeTarget;
      var val = b[t.key]||0;
      return '<button onclick="aeSetTarget(\''+t.key+'\')" title="'+_esc(t.note)+'" style="flex:1;min-width:88px;text-align:left;cursor:pointer;border-radius:9px;padding:9px 11px;'+
        'border:1px solid '+(on?t.col:'rgba(255,255,255,.1)')+';background:'+(on?t.col+'22':'rgba(255,255,255,.025)')+';transition:all .12s">'+
        '<div style="display:flex;align-items:center;gap:5px">'+
          '<span style="font-family:\'Cinzel\',serif;font-size:12.5px;font-weight:700;color:'+(on?t.col:AE_TEXT)+';letter-spacing:.5px">'+t.label+'</span>'+
          (t.official?'':'<span style="font-size:8px;letter-spacing:.5px;color:'+AE_MUTED+';border:1px solid '+AE_DIM+';border-radius:4px;padding:0 3px">HB</span>')+
        '</div>'+
        '<div style="font-family:\'Crimson Text\',serif;font-size:15px;font-weight:700;color:'+(on?t.col:AE_TEXT)+';margin-top:2px">'+_fmt(val)+' <span style="font-size:10px;font-weight:400;color:'+AE_MUTED+'">XP</span></div>'+
      '</button>';
    }).join('');
    return '<div style="margin-bottom:14px">'+
      '<div style="font-family:\'Cinzel\',serif;font-size:12px;letter-spacing:1px;color:'+AE_MUTED+';text-transform:uppercase;margin-bottom:7px">Target Difficulty <span style="text-transform:none;letter-spacing:0;color:'+AE_DIM+'">\u2014 2024 budget \u00d7 your party</span></div>'+
      '<div style="display:flex;gap:7px;flex-wrap:wrap">'+cells+'</div>'+
    '</div>';
  }

  function _meter(spent, tgt, cls, b){
    var pct = tgt>0 ? Math.min(100, Math.round(spent/tgt*100)) : 0;
    var over = spent > tgt;
    var remain = tgt - spent;
    var tier = AE_TIERS.find(function(t){return t.key===_aeTarget;}) || AE_TIERS[2];
    var barCol = over ? '#d9594c' : tier.col;
    return '<div style="background:rgba(8,6,4,.9);border:1px solid rgba(200,170,100,.2);border-radius:11px;padding:14px 16px;margin-bottom:16px">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:9px">'+
        '<div><span style="font-family:\'Crimson Text\',serif;font-size:22px;font-weight:700;color:'+AE_TEXT+'">'+_fmt(spent)+'</span>'+
          '<span style="font-size:13px;color:'+AE_MUTED+'"> / '+_fmt(tgt)+' XP spent</span></div>'+
        '<div style="text-align:right"><span style="font-size:11px;color:'+AE_MUTED+';font-family:\'Cinzel\',serif;letter-spacing:1px;text-transform:uppercase">Reads as </span>'+
          '<span style="font-family:\'Cinzel\',serif;font-size:14px;font-weight:700;color:'+cls.col+'">'+cls.label+'</span></div>'+
      '</div>'+
      '<div style="height:12px;border-radius:7px;background:rgba(0,0,0,.4);overflow:hidden;border:1px solid rgba(255,255,255,.08)">'+
        '<div style="height:100%;width:'+pct+'%;background:'+barCol+';transition:width .2s;box-shadow:0 0 10px '+barCol+'66"></div>'+
      '</div>'+
      '<div style="margin-top:8px;font-family:\'Crimson Text\',serif;font-size:12.5px;color:'+(over?'#f0a09a':AE_MUTED)+'">'+
        (over ? ('\u26a0 '+_fmt(spent-tgt)+' XP over the '+tier.label+' budget \u2014 reads as '+cls.label+' for this party.')
              : (_fmt(Math.max(0,remain))+' XP left in the '+tier.label+' budget.'))+
      '</div>'+
    '</div>';
  }

  function _encounterList(){
    var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
      '<span style="font-family:\'Cinzel\',serif;font-size:13px;letter-spacing:1px;color:'+AE_G+';text-transform:uppercase">The Encounter</span>'+
      (_aeMons.length?'<button onclick="aeClear()" style="font-size:10.5px;font-family:\'Cinzel\',serif;background:rgba(217,89,76,.12);border:1px solid rgba(217,89,76,.3);color:#e89088;border-radius:6px;padding:3px 9px;cursor:pointer">Clear all</button>':'')+
    '</div>';
    if (!_aeMons.length) {
      return '<div style="margin-bottom:16px">'+head+
        '<div style="text-align:center;padding:26px 18px;border:1px dashed rgba(200,170,100,.22);border-radius:10px;color:'+AE_MUTED+';font-family:\'Crimson Text\',serif;font-style:italic">No creatures yet. Add from your tracked list or search the bestiary below.</div>'+
      '</div>';
    }
    var xpReward = _spent();
    var rows = _aeMons.map(function(m, i){
      var sub = (m.xp||0)*(m.count||1);
      return '<div style="display:flex;align-items:center;gap:9px;padding:9px 11px;border-bottom:1px solid rgba(200,170,100,.1)">'+
        '<div style="flex:1;min-width:0"><div style="font-family:\'Cinzel\',serif;font-size:14px;color:'+AE_TEXT+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(m.name)+'</div>'+
          '<div style="font-size:11px;color:'+AE_MUTED+';font-family:\'Crimson Text\',serif">CR '+_esc(m.cr)+' \u00b7 '+_fmt(m.xp)+' XP each</div></div>'+
        '<div style="display:flex;align-items:center;gap:4px">'+
          '<button onclick="aeStep('+i+',-1)" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(200,170,100,.28);background:rgba(255,255,255,.04);color:'+AE_G+';font-size:15px;cursor:pointer;line-height:1">\u2212</button>'+
          '<span style="min-width:22px;text-align:center;font-family:\'Crimson Text\',serif;font-size:15px;color:'+AE_TEXT+'">'+(m.count||1)+'</span>'+
          '<button onclick="aeStep('+i+',1)" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(200,170,100,.28);background:rgba(255,255,255,.04);color:'+AE_G+';font-size:15px;cursor:pointer;line-height:1">+</button>'+
        '</div>'+
        '<div style="width:74px;text-align:right;font-family:\'Crimson Text\',serif;font-size:13.5px;font-weight:700;color:'+AE_G+'">'+_fmt(sub)+'</div>'+
        '<button onclick="aeRemove('+i+')" title="Remove" style="width:24px;height:24px;border-radius:6px;border:1px solid rgba(217,89,76,.28);background:rgba(217,89,76,.1);color:#e89088;font-size:12px;cursor:pointer;line-height:1">\u2715</button>'+
      '</div>';
    }).join('');
    // XP reward split
    var party = _aeNs ? _party(_aeNs) : [];
    var per = party.length ? Math.floor(xpReward / party.length) : 0;
    var reward = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 11px;background:rgba(200,170,100,.06);border-top:1px solid rgba(200,170,100,.18)">'+
      '<span style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:1px;color:'+AE_MUTED+';text-transform:uppercase">XP Reward on defeat</span>'+
      '<span style="font-family:\'Crimson Text\',serif;font-size:13.5px;color:'+AE_TEXT+'"><b style="color:'+AE_G+'">'+_fmt(xpReward)+'</b> total'+
        (party.length?(' \u00b7 <b style="color:'+AE_G+'">'+_fmt(per)+'</b> each (\u00f7'+party.length+')'):'')+'</span>'+
    '</div>';
    return '<div style="margin-bottom:16px">'+head+
      '<div style="background:rgba(8,6,4,.9);border:1px solid rgba(200,170,100,.2);border-radius:11px;overflow:hidden">'+
        '<div style="display:flex;align-items:center;gap:9px;padding:7px 11px;background:rgba(0,0,0,.35);font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:1px;color:'+AE_MUTED+';text-transform:uppercase">'+
          '<span style="flex:1">Creature</span><span style="width:96px;text-align:center">Count</span><span style="width:74px;text-align:right">XP</span><span style="width:24px"></span></div>'+
        rows + reward +
      '</div>'+
    '</div>';
  }

  function _addBlock(){
    var tracked = _tracked();
    var trackedHtml;
    if (!tracked.length) {
      trackedHtml = '<div style="color:'+AE_MUTED+';font-style:italic;font-family:\'Crimson Text\',serif;font-size:12.5px;padding:6px 2px">Nothing tracked yet. In MH Library, use <b style="color:'+AE_G+'">+Track</b> on a creature to stage it here.</div>';
    } else {
      trackedHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap">'+ tracked.map(function(t,i){
        return '<button onclick="aeAddTracked('+i+')" style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);border:1px solid rgba(200,170,100,.22);border-radius:7px;padding:5px 9px;cursor:pointer;font-family:\'Crimson Text\',serif">'+
          '<span style="font-size:12.5px;color:'+AE_TEXT+'">'+_esc(t.name)+'</span>'+
          '<span style="font-size:10px;color:'+AE_MUTED+'">CR '+_esc(t.cr)+'</span>'+
          '<span style="color:'+AE_G+';font-size:13px;line-height:1">+</span>'+
        '</button>';
      }).join('') +'</div>';
    }
    return '<div style="margin-bottom:14px">'+
      '<div style="font-family:\'Cinzel\',serif;font-size:12px;letter-spacing:1px;color:'+AE_MUTED+';text-transform:uppercase;margin-bottom:7px">Tracked creatures</div>'+
      trackedHtml+
      '<div style="font-family:\'Cinzel\',serif;font-size:12px;letter-spacing:1px;color:'+AE_MUTED+';text-transform:uppercase;margin:14px 0 7px">Search the bestiary</div>'+
      '<input id="ae-search" placeholder="\uD83D\uDD0D  Search every creature in the Atlas\u2026" value="'+_esc(_aeSearch)+'" oninput="aeSearchInput(this.value)" style="width:100%;padding:8px 12px;background:rgba(255,255,255,.05);color:'+AE_TEXT+';border:1px solid rgba(200,170,100,.22);border-radius:7px;font-size:13.5px;font-family:\'Crimson Text\',serif;outline:none;box-sizing:border-box">'+
      '<div id="ae-search-results" style="margin-top:8px"></div>'+
    '</div>';
  }

  function _renderSearchResults(){
    var el = document.getElementById('ae-search-results');
    if (!el) return;
    var q = _aeSearch.trim();
    if (!q) { el.innerHTML=''; return; }
    var pool = _searchPool(q);
    if (!pool.length) { el.innerHTML = '<div style="color:'+AE_MUTED+';font-style:italic;font-family:\'Crimson Text\',serif;font-size:12.5px;padding:4px 2px">No creatures match \u201c'+_esc(q)+'\u201d.</div>'; return; }
    el.innerHTML = '<div style="display:flex;flex-direction:column;border:1px solid rgba(200,170,100,.16);border-radius:8px;overflow:hidden;max-height:230px;overflow-y:auto">'+
      pool.map(function(m){
        var xp=_xpOf(m.cr);
        return '<button onclick="aeAddSearch(\''+_attr(m.name)+'\',\''+_attr(m.cr)+'\')" style="display:flex;align-items:center;gap:9px;padding:7px 11px;border:0;border-bottom:1px solid rgba(200,170,100,.08);background:transparent;cursor:pointer;text-align:left;width:100%">'+
          '<span style="flex:1;font-family:\'Crimson Text\',serif;font-size:13px;color:'+AE_TEXT+'">'+_esc(m.name)+'</span>'+
          '<span style="font-size:11px;color:'+AE_MUTED+'">CR '+_esc(m.cr)+'</span>'+
          '<span style="font-size:11px;color:'+AE_G+';width:70px;text-align:right">'+(xp?_fmt(xp)+' XP':'\u2014')+'</span>'+
          '<span style="color:'+AE_G+';font-size:14px;line-height:1">+</span>'+
        '</button>';
      }).join('')+
    '</div>';
  }

  function _saveBar(camp){
    var to = camp ? camp.title : 'campaign';
    return '<div style="position:sticky;bottom:0;display:flex;gap:9px;align-items:center;flex-wrap:wrap;padding:13px;margin-top:6px;background:rgba(8,6,4,.97);border:1px solid rgba(200,170,100,.28);border-radius:11px">'+
      '<input id="ae-name" placeholder="Encounter name (e.g. Ambush at the Gorge)" value="'+_esc(_aeName)+'" oninput="aeSetName(this.value)" style="flex:1;min-width:170px;padding:9px 12px;background:rgba(255,255,255,.05);color:'+AE_TEXT+';border:1px solid rgba(200,170,100,.22);border-radius:7px;font-size:13.5px;font-family:\'Crimson Text\',serif;outline:none">'+
      '<button onclick="aeSaveToCampaign()" style="display:flex;align-items:center;gap:7px;padding:10px 16px;background:linear-gradient(135deg,#e3b96e,#c8a050 55%,#9a7732);border:1px solid #caa24f;border-radius:8px;color:#1a1206;font-family:\'Cinzel\',serif;font-size:13px;font-weight:700;letter-spacing:.5px;cursor:pointer;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)">\u2694\uFE0F  Save \u2192 '+_esc(to)+'</button>'+
    '</div>';
  }

  // ── Public API (called by the engine's _setDbTab) ──
  window.AtlasEncounter = {
    render: function(id){ if (id) _aeRootId = id; _render(); }
  };

})();
