// atlas-builder.jsx — the deep, full-screen rules editor for a system.

const BUILDER_SECTIONS = [
  { id: "identity", label: "Identity", icon: "banner", blurb: "Name, sigil & accent" },
  { id: "terms", label: "Terminology", icon: "terminology", blurb: "What you call things" },
  { id: "dice", label: "Dice & Resolution", icon: "dice", blurb: "The core engine" },
  { id: "attrs", label: "Attributes", icon: "attr", blurb: "Ability scores" },
  { id: "sheet", label: "Character Sheet", icon: "figure", blurb: "Fields & sections" },
  { id: "leveling", label: "Leveling & XP", icon: "ladder", blurb: "The progress curve" },
  { id: "currency", label: "Currency", icon: "coins", blurb: "The economy" },
  { id: "bestiary", label: "Bestiary & Stat Blocks", icon: "claw", blurb: "Adversary schema + difficulty" },
  { id: "modules", label: "Modules", icon: "layers", blurb: "Which tabs switch on" },
];

const ACCENTS = ["#c8a050", "#9977cc", "#5fb89a", "#5b9bd5", "#cc6f7c", "#e0905a", "#7c9bdc", "#b0894c"];
const SIGILS = ["diamond", "wand", "crown", "sword", "shield", "skull", "claw", "eye", "rune", "compass", "sun", "moon", "gear", "anchor", "fracture", "scroll"];

const MODULE_INFO = [
  { key: "characters", label: "Characters", icon: "figure", desc: "Player dashboards, levels, inventory" },
  { key: "crew", label: "Ship & Crew", icon: "anchor", desc: "Vessels, crew roster, voyages" },
  { key: "map", label: "Map", icon: "compass", desc: "Travel, distances, party location" },
  { key: "lore", label: "Lore Codex", icon: "book", desc: "Worldbuilding wiki + the Librarian" },
  { key: "combat", label: "Combat Tracker", icon: "sword", desc: "Initiative & encounter runner" },
  { key: "dmscreen", label: "GM Screen", icon: "shield", desc: "Private rules reference & notes" },
  { key: "bestiary", label: "Bestiary", icon: "claw", desc: "Monster manual & stat blocks" },
  { key: "calendar", label: "Calendar", icon: "hourglass", desc: "In-world dates & events" },
  { key: "quests", label: "Quests", icon: "scroll", desc: "Quest log & objectives" },
  { key: "sessions", label: "Session Log", icon: "quill", desc: "Recaps & session notes" },
  { key: "handouts", label: "Handouts", icon: "scroll", desc: "Push reveals to players" },
];

// Small building blocks --------------------------------------------------
const RowShell = ({ children, onUp, onDown, onDel, accent }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
    <span style={{ color: "var(--muted)", cursor: "grab", flexShrink: 0 }}><Sigil name="grip" size={15} /></span>
    {children}
    <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
      {onUp && <button className="a-iconbtn" style={{ width: 26, height: 26 }} onClick={onUp} title="Move up"><Sigil name="chevron-down" size={13} style={{ transform: "rotate(180deg)" }} /></button>}
      {onDown && <button className="a-iconbtn" style={{ width: 26, height: 26 }} onClick={onDown} title="Move down"><Sigil name="chevron-down" size={13} /></button>}
      {onDel && <button className="a-iconbtn" style={{ width: 26, height: 26, color: "#cc6f7c" }} onClick={onDel} title="Remove"><Sigil name="close" size={13} /></button>}
    </div>
  </div>
);
const AddBtn = ({ onClick, children }) => (
  <button className="a-btn a-btn-ghost a-btn-sm" style={{ alignSelf: "flex-start" }} onClick={onClick}><Sigil name="plus" size={12} /> {children}</button>
);
const SecHead = ({ title, desc }) => (
  <div style={{ marginBottom: 18 }}>
    <h2 className="a-serif" style={{ fontSize: "1.32rem", color: "var(--bone)", fontWeight: 700 }}>{title}</h2>
    {desc && <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginTop: 6, lineHeight: 1.55, maxWidth: 640 }}>{desc}</p>}
  </div>
);
const move = (arr, i, d) => { const n = [...arr]; const j = i + d; if (j < 0 || j >= n.length) return n; [n[i], n[j]] = [n[j], n[i]]; return n; };

// ── Section editors ─────────────────────────────────────────────────────
function IdentityEditor({ d, set }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <SecHead title="Identity" desc="How this system shows up across the launcher — on cards, badges and the campaign shelf." />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Field label="System name"><input className="a-input" value={d.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Short badge" hint="Shown on campaign cards"><input className="a-input" value={d.abbr} onChange={e => set({ abbr: e.target.value })} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Field label="Version"><input className="a-input" value={d.version} onChange={e => set({ version: e.target.value })} /></Field>
        <Field label="Author"><input className="a-input" value={d.author} onChange={e => set({ author: e.target.value })} /></Field>
      </div>
      <Field label="Tagline" style={{ marginBottom: 16 }}><input className="a-input" value={d.tagline} onChange={e => set({ tagline: e.target.value })} /></Field>
      <Field label="Description" style={{ marginBottom: 20 }}><textarea className="a-textarea" rows={3} value={d.description} onChange={e => set({ description: e.target.value })} /></Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <Field label="Sigil">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {SIGILS.map(s => <button key={s} className="a-iconbtn" style={{ width: 40, height: 40, borderColor: d.sigil === s ? "var(--border3)" : "var(--border)", background: d.sigil === s ? tint(d.accent, 0.16) : "transparent", color: d.sigil === s ? d.accent : "var(--muted)" }} onClick={() => set({ sigil: s })}><Sigil name={s} size={19} /></button>)}
          </div>
        </Field>
        <Field label="Accent">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ACCENTS.map(a => <button key={a} onClick={() => set({ accent: a })} style={{ width: 40, height: 40, borderRadius: "var(--r2)", background: tint(a, 0.2), border: d.accent === a ? "2px solid " + a : "1px solid var(--border)", cursor: "pointer", display: "grid", placeItems: "center", color: a }}>{d.accent === a && <Sigil name="check" size={16} />}</button>)}
          </div>
        </Field>
      </div>
    </div>
  );
}

function TermsEditor({ d, set }) {
  const t = d.terminology;
  const upd = (k, v) => set({ terminology: { ...t, [k]: v } });
  const fields = [["gm", "Game-runner"], ["player", "Player"], ["character", "Character"], ["monster", "Adversary"], ["spell", "Powers / spells"], ["currency", "Money"], ["session", "Play session"], ["party", "The group"]];
  return (
    <div style={{ maxWidth: 720 }}>
      <SecHead title="Terminology" desc="Relabel the vocabulary so the whole app speaks your system's language — “Dungeon Master” becomes “Keeper,” “Spell” becomes “Power,” and so on." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
        {fields.map(([k, lbl]) => <Field key={k} label={lbl}><input className="a-input" value={t[k] || ""} onChange={e => upd(k, e.target.value)} /></Field>)}
      </div>
      <div style={{ padding: 16, borderRadius: "var(--r)", background: tint(d.accent, 0.06), border: "1px solid " + tint(d.accent, 0.22) }}>
        <div className="a-kicker" style={{ marginBottom: 8 }}>Live preview</div>
        <div className="a-serif" style={{ fontSize: "1.02rem", color: "var(--bone)", lineHeight: 1.6 }}>
          The <b style={{ color: d.accent }}>{t.gm}</b> gathers the <b style={{ color: d.accent }}>{t.party}</b> for tonight's <b style={{ color: d.accent }}>{t.session}</b>. Each <b style={{ color: d.accent }}>{t.player}</b> readies their <b style={{ color: d.accent }}>{t.character}</b>, spends their {t.currency}, and braces for the next <b style={{ color: d.accent }}>{t.monster}</b>.
        </div>
      </div>
    </div>
  );
}

function DiceEditor({ d, set }) {
  const dice = d.dice;
  const upd = (k, v) => set({ dice: { ...dice, [k]: v } });
  const cores = [["1d20", "Single d20"], ["1d100", "Percentile (d100)"], ["2d6", "2d6 (PbtA)"], ["3d6", "3d6 bell curve"], ["pool-d6", "d6 dice pool"], ["4dF", "Fate / Fudge (4dF)"]];
  const modes = [["roll-over", "Roll over target"], ["roll-under", "Roll under target"], ["pool", "Count successes"], ["blackjack", "Closest under"]];
  const advs = [["adv-dis", "Advantage / Disadvantage"], ["plus-minus", "+N / −N modifiers"], ["bane-boon", "Boon / Bane dice"], ["none", "None"]];
  const crits = [["nat-20", "Natural max roll"], ["threat-range", "Threat range (e.g. 19–20)"], ["doubles", "Matching dice"], ["none", "No criticals"]];
  const ALL_DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];
  const diceSet = dice.set || ALL_DICE;
  const toggleDie = (die) => {
    const has = diceSet.includes(die);
    const next = has ? diceSet.filter(x => x !== die) : ALL_DICE.filter(x => diceSet.includes(x) || x === die);
    upd("set", next.length ? next : [die]);
  };
  const allOn = ALL_DICE.every(x => diceSet.includes(x));
  const previewText = () => {
    const m = dice.mode === "roll-under" ? "roll equal or under" : dice.mode === "pool" ? "count dice that beat" : dice.mode === "blackjack" ? "get closest without exceeding" : "meet or beat";
    return `Roll ${dice.core.toUpperCase()}, add your modifier, and ${m} the ${dice.target}.`;
  };
  const Group = ({ label, val, opts, k }) => (
    <Field label={label}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {opts.map(([v, lbl]) => <button key={v} onClick={() => upd(k, v)} style={{ padding: "8px 12px", borderRadius: "var(--r2)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: "0.7rem", border: "1px solid " + (val === v ? tint(d.accent, 0.6) : "var(--border)"), background: val === v ? tint(d.accent, 0.12) : "transparent", color: val === v ? d.accent : "var(--muted)" }}>{lbl}</button>)}
      </div>
    </Field>
  );
  return (
    <div style={{ maxWidth: 760 }}>
      <SecHead title="Dice & Resolution" desc="The beating heart of the system — what you roll and how a check succeeds. Everything downstream (combat, saves, skill checks) reads from this." />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Group label="Core die" val={dice.core} opts={cores} k="core" />
        <Field label="Dice in play" hint="Which physical dice this system uses. Pick all, or any combination.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
            <button onClick={() => upd("set", allOn ? ["d20"] : [...ALL_DICE])} style={{ padding: "8px 12px", borderRadius: "var(--r2)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: "0.7rem", border: "1px solid " + (allOn ? tint(d.accent, 0.6) : "var(--border)"), background: allOn ? tint(d.accent, 0.12) : "transparent", color: allOn ? d.accent : "var(--muted)" }}>{allOn ? "✓ All dice" : "All dice"}</button>
            <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 2px" }}></span>
            {ALL_DICE.map(die => {
              const on = diceSet.includes(die);
              return <button key={die} onClick={() => toggleDie(die)} style={{ padding: "8px 13px", borderRadius: "var(--r2)", cursor: "pointer", fontFamily: "var(--mono)", fontSize: "0.7rem", border: "1px solid " + (on ? tint(d.accent, 0.6) : "var(--border)"), background: on ? tint(d.accent, 0.12) : "transparent", color: on ? d.accent : "var(--muted)" }}>{die}</button>;
            })}
          </div>
        </Field>
        <Group label="Resolution" val={dice.mode} opts={modes} k="mode" />
        <Field label="Target name" hint="What players roll against (Armor Class, Difficulty, Defense…)"><input className="a-input" style={{ maxWidth: 280 }} value={dice.target} onChange={e => upd("target", e.target.value)} /></Field>
        <Group label="Swing mechanic" val={dice.advantage} opts={advs} k="advantage" />
        <Group label="Critical rule" val={dice.crit} opts={crits} k="crit" />
      </div>
      <div style={{ marginTop: 22, padding: 18, borderRadius: "var(--r)", background: "var(--surface3)", border: "1px solid " + tint(d.accent, 0.3), display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ color: d.accent }}><Sigil name="dice" size={30} /></span>
        <div>
          <div className="a-kicker" style={{ marginBottom: 6 }}>How a check resolves</div>
          <div className="a-serif" style={{ fontSize: "1.06rem", color: "var(--bone)" }}>{previewText()}</div>
        </div>
      </div>
    </div>
  );
}

function AttrsEditor({ d, set }) {
  const a = d.attributes;
  const setA = (next) => set({ attributes: next });
  return (
    <div style={{ maxWidth: 740 }}>
      <SecHead title="Attributes" desc="The core scores every character and adversary carries. Define the name, short code, starting value and how a modifier is derived." />
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "26px 1.6fr 0.7fr 0.7fr 1.4fr 88px", gap: 10, padding: "0 10px" }}>
          {["", "Name", "Code", "Default", "Modifier formula", ""].map((h, i) => <div key={i} className="a-kicker" style={{ fontSize: "0.54rem" }}>{h}</div>)}
        </div>
        {a.map((row, i) => (
          <RowShell key={i} onUp={i > 0 ? () => setA(move(a, i, -1)) : null} onDown={i < a.length - 1 ? () => setA(move(a, i, 1)) : null} onDel={() => setA(a.filter((_, j) => j !== i))}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 1.4fr", gap: 10, flex: 1 }}>
              <input className="a-input" value={row.name} onChange={e => setA(a.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} />
              <input className="a-input" value={row.abbr} onChange={e => setA(a.map((r, j) => j === i ? { ...r, abbr: e.target.value } : r))} />
              <input className="a-input" value={row.default} onChange={e => setA(a.map((r, j) => j === i ? { ...r, default: e.target.value } : r))} />
              <input className="a-input" value={row.mod} onChange={e => setA(a.map((r, j) => j === i ? { ...r, mod: e.target.value } : r))} />
            </div>
          </RowShell>
        ))}
      </div>
      <AddBtn onClick={() => setA([...a, { name: "New Attribute", abbr: "NEW", default: 10, mod: "= score" }])}>Add attribute</AddBtn>
    </div>
  );
}

const FIELD_TYPES = [["text", "Text"], ["longtext", "Long text"], ["number", "Number"], ["resource", "Resource (current/max)"], ["toggle", "Toggle"]];
function SheetEditor({ d, set }) {
  const sheet = d.sheet;
  const setS = (next) => set({ sheet: next });
  return (
    <div style={{ maxWidth: 760 }}>
      <SecHead title="Character Sheet" desc="Lay out the sheet players fill in — group fields into sections, choose each field's type. Resources track a current and max (HP, mana, stress…)." />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sheet.map((sec, si) => (
          <div key={si} style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--faint)", borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: d.accent }}><Sigil name="layers" size={15} /></span>
              <input className="a-input" style={{ maxWidth: 260, fontFamily: "var(--serif)", fontWeight: 600 }} value={sec.section} onChange={e => setS(sheet.map((s, j) => j === si ? { ...s, section: e.target.value } : s))} />
              <span className="a-mono" style={{ fontSize: "0.6rem", color: "var(--muted)", marginLeft: "auto" }}>{sec.fields.length} fields</span>
              <button className="a-iconbtn" style={{ width: 28, height: 28, color: "#cc6f7c" }} onClick={() => setS(sheet.filter((_, j) => j !== si))} title="Remove section"><Sigil name="trash" size={14} /></button>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {sec.fields.map((f, fi) => (
                <div key={fi} style={{ display: "flex", gap: 9, alignItems: "center" }}>
                  <span style={{ color: "var(--muted)" }}><Sigil name="grip" size={14} /></span>
                  <input className="a-input" value={f[0]} onChange={e => setS(sheet.map((s, j) => j === si ? { ...s, fields: s.fields.map((x, k) => k === fi ? [e.target.value, x[1]] : x) } : s))} />
                  <select className="a-select" style={{ width: 180, flexShrink: 0 }} value={f[1]} onChange={e => setS(sheet.map((s, j) => j === si ? { ...s, fields: s.fields.map((x, k) => k === fi ? [x[0], e.target.value] : x) } : s))}>
                    {FIELD_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="a-iconbtn" style={{ width: 28, height: 28, color: "#cc6f7c", flexShrink: 0 }} onClick={() => setS(sheet.map((s, j) => j === si ? { ...s, fields: s.fields.filter((_, k) => k !== fi) } : s))}><Sigil name="close" size={13} /></button>
                </div>
              ))}
              <AddBtn onClick={() => setS(sheet.map((s, j) => j === si ? { ...s, fields: [...s.fields, ["New field", "text"]] } : s))}>Add field</AddBtn>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}><AddBtn onClick={() => setS([...sheet, { section: "New Section", fields: [["New field", "text"]] }])}>Add section</AddBtn></div>
    </div>
  );
}

function LevelingEditor({ d, set }) {
  const lv = d.leveling;
  const upd = (patch) => set({ leveling: { ...lv, ...patch } });
  const setTable = (next) => upd({ table: next });
  const presets = {
    "classic": [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000],
    "linear": Array.from({ length: 20 }, (_, i) => i * 1000),
    "fast": Array.from({ length: 20 }, (_, i) => Math.round((i * i) * 250)),
  };
  const applyPreset = (key) => {
    const vals = presets[key];
    upd({ mode: "xp", table: vals.slice(0, lv.cap).map((xp, i) => ({ level: i + 1, xp })) });
  };
  return (
    <div style={{ maxWidth: 720 }}>
      <SecHead title="Leveling & XP" desc="Choose milestone advancement or an experience curve, set the level cap, and shape the table the whole app reads to award levels." />
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <Field label="Advancement"><Segmented value={lv.mode} onChange={v => upd({ mode: v })} options={[{ value: "xp", label: "XP curve" }, { value: "milestone", label: "Milestone" }]} /></Field>
        <Field label="Level cap"><input className="a-input" type="number" style={{ width: 110 }} value={lv.cap} onChange={e => { const cap = Math.max(1, Math.min(40, +e.target.value || 1)); const table = Array.from({ length: cap }, (_, i) => lv.table[i] || { level: i + 1, xp: 0 }); upd({ cap, table }); }} /></Field>
        {lv.mode === "xp" && <Field label="Quick-fill curve"><div style={{ display: "flex", gap: 6 }}>{[["classic", "Classic d20"], ["linear", "Linear"], ["fast", "Fast"]].map(([k, l]) => <button key={k} className="a-btn a-btn-ghost a-btn-sm" onClick={() => applyPreset(k)}>{l}</button>)}</div></Field>}
      </div>
      {lv.mode === "milestone" ? (
        <div style={{ padding: 20, borderRadius: "var(--r)", background: "var(--faint)", border: "1px solid var(--border)", color: "var(--muted)", display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ color: d.accent }}><Sigil name="ladder" size={26} /></span>
          <div>Milestone advancement — the {d.terminology.gm} grants levels by story beats. No XP table needed. Cap: <b style={{ color: "var(--bone)" }}>level {lv.cap}</b>.</div>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 0, background: "var(--faint)", padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
            <div className="a-kicker">Level</div><div className="a-kicker">XP required</div>
          </div>
          <div className="scroll-y" style={{ maxHeight: 340, overflowY: "auto" }}>
            {lv.table.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr", alignItems: "center", padding: "5px 14px", borderBottom: "1px solid var(--faint2)" }}>
                <div className="a-mono" style={{ color: d.accent, fontSize: "0.84rem" }}>{r.level}</div>
                <input className="a-input" type="number" style={{ maxWidth: 220, fontFamily: "var(--mono)", fontSize: "0.8rem" }} value={r.xp} onChange={e => setTable(lv.table.map((x, j) => j === i ? { ...x, xp: +e.target.value || 0 } : x))} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CurrencyEditor({ d, set }) {
  const c = d.currency;
  const setC = (next) => set({ currency: next });
  const base = c.length ? c[c.length - 1] : null;
  return (
    <div style={{ maxWidth: 700 }}>
      <SecHead title="Currency" desc="Define the coins (or credits, marks, ration-chits) of your world and their relative value. The lowest-value denomination is the base unit." />
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "26px 1.6fr 0.8fr 1fr 30px", gap: 10, padding: "0 10px" }}>
          {["", "Name", "Symbol", "Value in base", ""].map((h, i) => <div key={i} className="a-kicker" style={{ fontSize: "0.54rem" }}>{h}</div>)}
        </div>
        {c.map((row, i) => (
          <RowShell key={i} onUp={i > 0 ? () => setC(move(c, i, -1)) : null} onDown={i < c.length - 1 ? () => setC(move(c, i, 1)) : null} onDel={c.length > 1 ? () => setC(c.filter((_, j) => j !== i)) : null}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.8fr 1fr", gap: 10, flex: 1 }}>
              <input className="a-input" value={row.name} onChange={e => setC(c.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} />
              <input className="a-input" value={row.abbr} onChange={e => setC(c.map((r, j) => j === i ? { ...r, abbr: e.target.value } : r))} />
              <input className="a-input" type="number" value={row.value} onChange={e => setC(c.map((r, j) => j === i ? { ...r, value: +e.target.value || 0 } : r))} />
            </div>
          </RowShell>
        ))}
      </div>
      <AddBtn onClick={() => setC([...c, { name: "New Coin", abbr: "?", value: 1 }])}>Add denomination</AddBtn>
      {base && c.length > 1 && (
        <div style={{ marginTop: 18, padding: 14, borderRadius: "var(--r)", background: tint(d.accent, 0.06), border: "1px solid " + tint(d.accent, 0.22), color: "var(--text)", fontFamily: "var(--mono)", fontSize: "0.78rem" }}>
          <span className="a-kicker">Conversion</span><br />
          <span style={{ lineHeight: 2 }}>{c.map(x => `1 ${x.abbr} = ${x.value} ${base.abbr}`).join("   ·   ")}</span>
        </div>
      )}
    </div>
  );
}

function BestiaryEditor({ d, set }) {
  const b = d.bestiary;
  const upd = (patch) => set({ bestiary: { ...b, ...patch } });
  const [newField, setNewField] = React.useState("");
  return (
    <div style={{ maxWidth: 760 }}>
      <SecHead title="Bestiary & Stat Blocks" desc="The schema every adversary's stat block follows, plus the difficulty math that powers encounter budgeting in the combat tracker." />
      <Field label="Stat-block fields" hint="The lines shown on every adversary card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
          {b.fields.map((f, i) => (
            <span key={i} className="a-chip" style={{ borderColor: tint(d.accent, 0.3), color: "var(--bone)" }}>
              {f}<button className="a-iconbtn" style={{ width: 18, height: 18, border: 0, color: "#cc6f7c" }} onClick={() => upd({ fields: b.fields.filter((_, j) => j !== i) })}><Sigil name="close" size={11} /></button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="a-input" style={{ maxWidth: 280 }} value={newField} placeholder="Add a field…" onChange={e => setNewField(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newField.trim()) { upd({ fields: [...b.fields, newField.trim()] }); setNewField(""); } }} />
          <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => { if (newField.trim()) { upd({ fields: [...b.fields, newField.trim()] }); setNewField(""); } }}><Sigil name="plus" size={12} /> Add</button>
        </div>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Field label="Difficulty label" hint="“Challenge Rating”, “Threat Tier”…"><input className="a-input" value={b.crLabel} onChange={e => upd({ crLabel: e.target.value })} /></Field>
        <Field label="Encounter formula"><input className="a-input" value={b.difficultyFormula} onChange={e => upd({ difficultyFormula: e.target.value })} /></Field>
      </div>
      <Field label={b.crLabel + " table"}>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 34px", background: "var(--faint)", padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
            <div className="a-kicker">{b.crLabel}</div><div className="a-kicker">Proficiency</div><div className="a-kicker">XP / Value</div><div></div>
          </div>
          {b.crRows.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 34px", alignItems: "center", gap: 8, padding: "5px 12px", borderBottom: "1px solid var(--faint2)" }}>
              <input className="a-input" style={{ fontFamily: "var(--mono)", fontSize: "0.78rem" }} value={r.cr} onChange={e => upd({ crRows: b.crRows.map((x, j) => j === i ? { ...x, cr: e.target.value } : x) })} />
              <input className="a-input" style={{ fontFamily: "var(--mono)", fontSize: "0.78rem" }} value={r.prof} onChange={e => upd({ crRows: b.crRows.map((x, j) => j === i ? { ...x, prof: e.target.value } : x) })} />
              <input className="a-input" style={{ fontFamily: "var(--mono)", fontSize: "0.78rem" }} value={r.xp} onChange={e => upd({ crRows: b.crRows.map((x, j) => j === i ? { ...x, xp: e.target.value } : x) })} />
              <button className="a-iconbtn" style={{ width: 26, height: 26, color: "#cc6f7c" }} onClick={() => upd({ crRows: b.crRows.filter((_, j) => j !== i) })}><Sigil name="close" size={12} /></button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10 }}><AddBtn onClick={() => upd({ crRows: [...b.crRows, { cr: "—", prof: "—", xp: 0 }] })}>Add tier</AddBtn></div>
      </Field>
    </div>
  );
}

function ModulesEditor({ d, set }) {
  const m = d.modules;
  const on = Object.values(m).filter(Boolean).length;
  return (
    <div style={{ maxWidth: 720 }}>
      <SecHead title="Modules" desc={"Switch app features on or off for campaigns built on this system. " + on + " of " + MODULE_INFO.length + " enabled."} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {MODULE_INFO.map(mi => {
          const active = !!m[mi.key];
          return (
            <div key={mi.key} onClick={() => set({ modules: { ...m, [mi.key]: !active } })} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r)", cursor: "pointer", background: active ? tint(d.accent, 0.07) : "var(--faint)", border: "1px solid " + (active ? tint(d.accent, 0.3) : "var(--border)"), transition: "all .15s" }}>
              <span style={{ color: active ? d.accent : "var(--muted)" }}><Sigil name={mi.icon} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="a-serif" style={{ fontSize: "0.96rem", color: active ? "var(--bone)" : "var(--muted)" }}>{mi.label}</div>
                <div className="a-mono" style={{ fontSize: "0.56rem", color: "var(--muted)", marginTop: 2 }}>{mi.desc}</div>
              </div>
              <Toggle on={active} onChange={() => set({ modules: { ...m, [mi.key]: !active } })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Builder shell ───────────────────────────────────────────────────────
const SystemBuilder = ({ system, onSave, onCancel }) => {
  const [draft, setDraft] = React.useState(() => JSON.parse(JSON.stringify(system)));
  const [active, setActive] = React.useState("identity");
  const isNew = !system.id || system._new;
  const set = (patch) => setDraft(d => ({ ...d, ...patch }));

  // crude completeness signal
  const complete = (() => {
    let n = 0, total = 7;
    if (draft.name && draft.name.length > 1) n++;
    if (draft.description) n++;
    if (draft.attributes.length) n++;
    if (draft.sheet.length) n++;
    if (draft.currency.length) n++;
    if (draft.bestiary.fields.length) n++;
    if (Object.values(draft.modules).some(Boolean)) n++;
    return Math.round((n / total) * 100);
  })();

  const editors = { identity: IdentityEditor, terms: TermsEditor, dice: DiceEditor, attrs: AttrsEditor, sheet: SheetEditor, leveling: LevelingEditor, currency: CurrencyEditor, bestiary: BestiaryEditor, modules: ModulesEditor };
  const Editor = editors[active];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "var(--bg)", display: "flex", flexDirection: "column", animation: "fi .22s ease" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 22px", borderBottom: "1px solid var(--border)", background: "rgba(4,6,12,0.9)", backdropFilter: "blur(8px)", flexShrink: 0 }}>
        <button className="a-btn a-btn-ghost" onClick={onCancel}><Sigil name="arrow-left" size={15} /> Cancel</button>
        <div style={{ width: 1, height: 26, background: "var(--border)" }} />
        <div style={{ width: 38, height: 38, borderRadius: "var(--r2)", display: "grid", placeItems: "center", background: tint(draft.accent, 0.14), color: draft.accent, border: "1px solid " + tint(draft.accent, 0.34) }}><Sigil name={draft.sigil} size={20} /></div>
        <div style={{ minWidth: 0 }}>
          <div className="a-kicker" style={{ fontSize: "0.54rem" }}>{isNew ? "Forging new system" : "Editing system"}</div>
          <div className="a-serif" style={{ fontSize: "1.06rem", color: "var(--bone)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{draft.name || "Untitled System"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="a-mono" style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{complete}% complete</div>
            <div style={{ width: 120, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: complete + "%", background: `linear-gradient(90deg, ${draft.accent}, ${tint(draft.accent, 0.5)})`, transition: "width .3s" }} /></div>
          </div>
          <button className="a-btn a-btn-primary" onClick={() => onSave({ ...draft, id: draft.id || uid("sys"), _new: undefined })}><Sigil name="check" size={14} /> {isNew ? "Create System" : "Save Changes"}</button>
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* rail */}
        <div className="scroll-y" style={{ width: 268, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--bg3)", overflowY: "auto", padding: "16px 12px" }}>
          {BUILDER_SECTIONS.map((s, i) => {
            const on = active === s.id;
            return (
              <button key={s.id} onClick={() => setActive(s.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 12px", border: 0, borderRadius: "var(--r2)", marginBottom: 3, cursor: "pointer", textAlign: "left", background: on ? tint(draft.accent, 0.1) : "transparent", color: on ? "var(--bone)" : "var(--muted)", position: "relative", transition: "all .14s" }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = "var(--faint)"; }} onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                {on && <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: "0 3px 3px 0", background: draft.accent }} />}
                <span style={{ color: on ? draft.accent : "var(--muted)", display: "flex" }}><Sigil name={s.icon} size={18} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="a-serif" style={{ fontSize: "0.94rem", lineHeight: 1.2 }}>{s.label}</div>
                  <div className="a-mono" style={{ fontSize: "0.54rem", color: "var(--muted)", marginTop: 2 }}>{s.blurb}</div>
                </div>
                <span className="a-mono" style={{ marginLeft: "auto", fontSize: "0.6rem", color: on ? draft.accent : "var(--muted)", opacity: 0.6 }}>{String(i + 1).padStart(2, "0")}</span>
              </button>
            );
          })}
        </div>
        {/* content */}
        <div className="scroll-y" style={{ flex: 1, overflowY: "auto", padding: "30px 36px 80px" }}>
          <div className="fade-in" key={active}><Editor d={draft} set={set} /></div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SystemBuilder });
