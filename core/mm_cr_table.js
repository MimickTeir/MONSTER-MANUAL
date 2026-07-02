// ═══════════════════════════════════════════════════════════════
//  MONSTER MAKER — CR Data Matrix
//  Source: "Quick Monster Builder" © Icarus Games 2025 (Anthony Cerrato)
//  Columns: cr, xp, pb (prof bonus), mods (median ability modifiers,
//  in chart order — assignable to any ability), init, ac, acR (range),
//  hp, hpR, atk, atkR, natk (attacks/multiattack), dpr, dprR,
//  dpa (damage/attack), dc (save DC), dcR, dres (% has dmg resistance),
//  leg (legendary actions likelihood), mres (% has magic resistance)
// ═══════════════════════════════════════════════════════════════

var MM_CR_TABLE = [
 {cr:'0',  xp:10,    pb:2, mods:[-3,1,0,-4,0,-3],   init:1,  ac:11,acR:[5,15],  hp:3,  hpR:[1,20],    atk:2, atkR:[0,5],  natk:1,dpr:2,  dprR:[0,4],    dpa:2, dc:10,dres:'10%',leg:'No', mres:'6%'},
 {cr:'1/8',xp:25,    pb:2, mods:[0,2,0,-3,0,-2],    init:1,  ac:12,acR:[9,16],  hp:8,  hpR:[5,17],    atk:4, atkR:[2,5],  natk:1,dpr:4,  dprR:[4,7],    dpa:4, dc:10,dres:'10%',leg:'No', mres:'6%'},
 {cr:'1/4',xp:50,    pb:2, mods:[1,2,1,-3,0,-2],    init:1,  ac:12,acR:[5,17],  hp:13, hpR:[9,22],    atk:4, atkR:[2,6],  natk:1,dpr:6,  dprR:[1,10],   dpa:6, dc:11,dres:'10%',leg:'No', mres:'6%'},
 {cr:'1/2',xp:100,   pb:2, mods:[1,1,1,-2,0,-2],    init:1,  ac:12,acR:[8,18],  hp:19, hpR:[11,33],   atk:4, atkR:[0,6],  natk:1,dpr:7,  dprR:[3,12],   dpa:7, dc:11,dres:'10%',leg:'No', mres:'6%'},
 {cr:'1',  xp:200,   pb:2, mods:[2,2,1,-2,0,-1],    init:2,  ac:13,acR:[9,18],  hp:25, hpR:[19,52],   atk:4, atkR:[3,6],  natk:1,dpr:10, dprR:[5,18],   dpa:10,dc:12,dres:'20%',leg:'No', mres:'6%'},
 {cr:'2',  xp:450,   pb:2, mods:[3,2,2,-1,0,-1],    init:2,  ac:13,acR:[6,19],  hp:45, hpR:[22,85],   atk:5, atkR:[2,7],  natk:2,dpr:15, dprR:[9,30],   dpa:8, dc:12,dres:'20%',leg:'No', mres:'6%'},
 {cr:'3',  xp:700,   pb:2, mods:[3,2,2,0,1,0],      init:2,  ac:14,acR:[11,18], hp:65, hpR:[45,90],   atk:5, atkR:[4,7],  natk:2,dpr:23, dprR:[13,36],  dpa:12,dc:12,dres:'20%',leg:'No', mres:'6%'},
 {cr:'4',  xp:1100,  pb:2, mods:[3,2,2,0,1,1],      init:3,  ac:15,acR:[7,20],  hp:71, hpR:[40,120],  atk:5, atkR:[4,8],  natk:2,dpr:30, dprR:[11,38],  dpa:15,dc:13,dres:'20%',leg:'No', mres:'6%'},
 {cr:'5',  xp:1800,  pb:3, mods:[4,1,3,-2,0,-1],    init:3,  ac:15,acR:[9,20],  hp:93, hpR:[60,147],  atk:7, atkR:[5,9],  natk:2,dpr:38, dprR:[20,50],  dpa:19,dc:14,dres:'30%',leg:'No', mres:'20%'},
 {cr:'6',  xp:2300,  pb:3, mods:[3,2,3,1,2,1],      init:3,  ac:15,acR:[12,20], hp:110,hpR:[78,152],  atk:7, atkR:[5,10], natk:2,dpr:45, dprR:[14,60],  dpa:15,dc:14,dres:'30%',leg:'No', mres:'20%'},
 {cr:'7',  xp:2900,  pb:3, mods:[4,2,4,0,1,0],      init:4,  ac:16,acR:[12,18], hp:126,hpR:[99,168],  atk:7, atkR:[6,9],  natk:3,dpr:53, dprR:[36,64],  dpa:27,dc:15,dres:'30%',leg:'No', mres:'20%'},
 {cr:'8',  xp:3900,  pb:3, mods:[4,2,3,1,2,1],      init:4,  ac:16,acR:[13,18], hp:144,hpR:[85,184],  atk:7, atkR:[6,10], natk:3,dpr:60, dprR:[29,80],  dpa:20,dc:15,dres:'30%',leg:'No', mres:'20%'},
 {cr:'9',  xp:5000,  pb:4, mods:[5,0,5,1,2,3],      init:4,  ac:17,acR:[14,19], hp:162,hpR:[123,200], atk:9, atkR:[8,12], natk:3,dpr:68, dprR:[32,71],  dpa:34,dc:16,dres:'30%',leg:'No', mres:'20%'},
 {cr:'10', xp:5900,  pb:4, mods:[5,3,4,2,3,4],      init:5,  ac:17,acR:[15,20], hp:180,hpR:[136,229], atk:9, atkR:[8,10], natk:3,dpr:75, dprR:[48,90],  dpa:25,dc:16,dres:'30%',leg:'20%',mres:'40%'},
 {cr:'11', xp:7200,  pb:4, mods:[6,1,5,1,2,4],      init:5,  ac:17,acR:[15,20], hp:198,hpR:[143,248], atk:9, atkR:[8,13], natk:3,dpr:83, dprR:[56,107], dpa:28,dc:16,dres:'30%',leg:'20%',mres:'40%'},
 {cr:'12', xp:8400,  pb:4, mods:[3,3,2,2,2,3],      init:7,  ac:18,acR:[16,20], hp:210,hpR:[169,240], atk:10,atkR:[8,10], natk:3,dpr:90, dprR:[72,102], dpa:30,dc:17,dres:'30%',leg:'20%',mres:'40%'},
 {cr:'13', xp:10000, pb:5, mods:[5,2,4,3,2,4],      init:10, ac:18,acR:[16,19], hp:225,hpR:[172,230], atk:10,atkR:[8,14], natk:3,dpr:104,dprR:[70,164], dpa:35,dc:17,dres:'30%',leg:'20%',mres:'40%'},
 {cr:'14', xp:11500, pb:5, mods:[6,2,5,4,2,4],      init:10, ac:18,acR:[18,19], hp:245,hpR:[184,228], atk:11,atkR:[9,11], natk:3,dpr:112,dprR:[81,165], dpa:37,dc:17,dres:'30%',leg:'20%',mres:'40%'},
 {cr:'15', xp:13000, pb:5, mods:[7,1,5,3,2,5],      init:11, ac:18,acR:[16,19], hp:260,hpR:[187,256], atk:11,atkR:[9,14], natk:3,dpr:120,dprR:[87,250], dpa:60,dc:18,dres:'50%',leg:'60%',mres:'40%'},
 {cr:'16', xp:15000, pb:5, mods:[7,0,6,3,3,5],      init:11, ac:19,acR:[16,20], hp:280,hpR:[212,264], atk:12,atkR:[10,13],natk:3,dpr:128,dprR:[74,166], dpa:43,dc:19,dres:'50%',leg:'60%',mres:'40%'},
 {cr:'17', xp:18000, pb:6, mods:[7,0,6,3,2,4],      init:12, ac:19,acR:[17,20], hp:300,hpR:[199,356], atk:12,atkR:[11,14],natk:3,dpr:136,dprR:[97,171], dpa:45,dc:19,dres:'50%',leg:'60%',mres:'40%'},
 {cr:'18', xp:20000, pb:6, mods:[-5,5,0,5,3,5],     init:12, ac:20,acR:[20,20], hp:315,hpR:[180,180], atk:13,atkR:[11,11],natk:3,dpr:144,dprR:[190,190],dpa:48,dc:19,dres:'50%',leg:'60%',mres:'40%'},
 {cr:'19', xp:22000, pb:6, mods:[8,2,6,5,3,6],      init:13, ac:20,acR:[19,19], hp:333,hpR:[287,287], atk:14,atkR:[14,14],natk:3,dpr:152,dprR:[124,124],dpa:76,dc:20,dres:'50%',leg:'60%',mres:'40%'},
 {cr:'20', xp:25000, pb:6, mods:[8,1,7,4,3,6],      init:13, ac:20,acR:[19,21], hp:350,hpR:[323,337], atk:14,atkR:[13,14],natk:3,dpr:180,dprR:[136,218],dpa:60,dc:20,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'21', xp:33000, pb:7, mods:[8,2,7,5,3,6],      init:14, ac:21,acR:[20,22], hp:378,hpR:[297,367], atk:15,atkR:[12,15],natk:3,dpr:189,dprR:[160,213],dpa:63,dc:21,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'22', xp:41000, pb:7, mods:[8,1,8,4,3,6],      init:14, ac:21,acR:[20,22], hp:418,hpR:[370,444], atk:15,atkR:[15,16],natk:3,dpr:189,dprR:[137,216],dpa:63,dc:23,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'23', xp:50000, pb:7, mods:[10,1,9,5,4,8],     init:15, ac:22,acR:[18,22], hp:460,hpR:[268,481], atk:17,atkR:[6,17], natk:3,dpr:207,dprR:[141,244],dpa:69,dc:23,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'24', xp:62000, pb:7, mods:[10,1,9,4,3,9],     init:15, ac:22,acR:[22,22], hp:528,hpR:[507,546], atk:17,atkR:[17,17],natk:3,dpr:216,dprR:[215,234],dpa:72,dc:24,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'25', xp:75000, pb:8, mods:[10,0,10,-4,0,-1],  init:16, ac:23,acR:[25,25], hp:550,hpR:[553,553], atk:18,atkR:[18,18],natk:3,dpr:225,dprR:[203,203],dpa:75,dc:24,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'26', xp:90000, pb:8, mods:[10,0,9,0,1,3],     init:16, ac:23,acR:null,    hp:572,hpR:null,      atk:18,atkR:null,   natk:4,dpr:234,dprR:null,     dpa:59,dc:25,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'27', xp:105000,pb:8, mods:[10,0,9,0,1,4],     init:17, ac:24,acR:null,    hp:594,hpR:null,      atk:18,atkR:null,   natk:4,dpr:243,dprR:null,     dpa:61,dc:25,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'28', xp:120000,pb:8, mods:[10,1,10,0,2,4],    init:17, ac:24,acR:null,    hp:616,hpR:null,      atk:19,atkR:null,   natk:4,dpr:252,dprR:null,     dpa:63,dc:26,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'29', xp:135000,pb:9, mods:[10,1,10,0,2,4],    init:18, ac:25,acR:null,    hp:638,hpR:null,      atk:19,atkR:null,   natk:5,dpr:261,dprR:null,     dpa:65,dc:26,dres:'40%',leg:'Yes',mres:'30%'},
 {cr:'30', xp:155000,pb:9, mods:[10,0,10,-4,0,0],   init:18, ac:25,acR:null,    hp:660,hpR:[697,697], atk:19,atkR:null,   natk:5,dpr:253,dprR:[270,270],dpa:51,dc:27,dres:'100%',leg:'Yes',mres:'30%'}
];

// ── Helpers ──────────────────────────────────────────────────────

function mmCrRow(cr) {
  cr = String(cr == null ? '' : cr).trim();
  return MM_CR_TABLE.find(function(r){ return r.cr === cr; }) || null;
}

function mmCrNum(cr) {
  cr = String(cr == null ? '' : cr).trim();
  if (cr === '1/8') return 0.125;
  if (cr === '1/4') return 0.25;
  if (cr === '1/2') return 0.5;
  var n = parseFloat(cr);
  return isNaN(n) ? 0 : n;
}

function mmCrIndex(cr) {
  cr = String(cr == null ? '' : cr).trim();
  for (var i = 0; i < MM_CR_TABLE.length; i++) if (MM_CR_TABLE[i].cr === cr) return i;
  return -1;
}

// Modifier → raw ability score (even score: mod +4 → 18)
function mmScoreFromMod(mod) {
  return 10 + (mod * 2);
}
function mmModFromScore(score) {
  var s = parseInt(score, 10);
  if (isNaN(s)) return 0;
  return Math.floor((s - 10) / 2);
}
function mmFmtMod(m) { return (m >= 0 ? '+' : '') + m; }

// Average of a dice expression "3d6+4" → 14.5
function mmDiceAvg(expr) {
  var m = String(expr).match(/^\s*(\d+)\s*[dD]\s*(\d+)\s*([+\-]\s*\d+)?\s*$/);
  if (!m) return null;
  var n = parseInt(m[1],10), d = parseInt(m[2],10);
  var k = m[3] ? parseInt(m[3].replace(/\s/g,''),10) : 0;
  return Math.floor(n * (d + 1) / 2 + k);
}

// Suggested CR estimator — chart-driven (Icarus columns).
// Defensive: locate row by HP, shift by AC delta (±1 step per 2 AC).
// Offensive: locate row by DPR, shift by attack-bonus delta (±1 step per 2).
// Suggested = rounded average of the two indices.
function mmEstimateCR(hp, ac, dpr, atk, dc, usesDc) {
  var T = MM_CR_TABLE, i, di = 0, oi = 0;
  if (!hp && !dpr) return null;
  // defensive index: last row whose hp <= target (closest fit)
  di = 0;
  for (i = 0; i < T.length; i++) if (hp >= T[i].hp) di = i;
  if (T[di+1] && Math.abs(T[di+1].hp - hp) < Math.abs(hp - T[di].hp)) di = di + 1;
  if (ac) di += Math.round((ac - T[di].ac) / 2);
  di = Math.max(0, Math.min(T.length - 1, di));
  // offensive index
  oi = 0;
  for (i = 0; i < T.length; i++) if (dpr >= T[i].dpr) oi = i;
  if (T[oi+1] && Math.abs(T[oi+1].dpr - dpr) < Math.abs(dpr - T[oi].dpr)) oi = oi + 1;
  var offRef = usesDc && dc ? Math.round((dc - T[oi].dc) / 2) : (atk ? Math.round((atk - T[oi].atk) / 2) : 0);
  oi += offRef;
  oi = Math.max(0, Math.min(T.length - 1, oi));
  var fi = Math.round((di + oi) / 2);
  return { cr: T[fi].cr, defensive: T[di].cr, offensive: T[oi].cr, index: fi };
}

window.MM_CR_TABLE = MM_CR_TABLE;
window.mmCrRow = mmCrRow; window.mmCrNum = mmCrNum; window.mmCrIndex = mmCrIndex;
window.mmScoreFromMod = mmScoreFromMod; window.mmModFromScore = mmModFromScore;
window.mmFmtMod = mmFmtMod; window.mmDiceAvg = mmDiceAvg; window.mmEstimateCR = mmEstimateCR;
