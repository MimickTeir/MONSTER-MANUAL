// atlas-campaigns.jsx — the shelf of worlds (landing), campaign detail & creation.

const COVER_SIGILS = ["compass", "crown", "sun", "anchor", "moon", "skull", "tower", "eye", "fracture", "diamond"];
const COVER_TINTS = ["#1b2236", "#2a1c16", "#16242a", "#241a2c", "#1d2a20", "#2c1a1a", "#16202c", "#262014"];

// ── Cover art (striped placeholder, themed) ──
const Cover = ({ cover, accent, h = 132, big }) => (
  <div className="a-ph" style={{
    position: "relative", height: h, borderRadius: big ? "var(--r)" : "var(--r) var(--r) 0 0",
    background: `radial-gradient(120% 120% at 70% 10%, ${tint(accent, 0.16)}, transparent 55%), ${cover.tint}`,
    overflow: "hidden", display: "grid", placeItems: "center",
  }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 10px, transparent 10px 20px)" }} />
    <span style={{ color: tint(accent, 0.55), filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.5))" }}>
      <Sigil name={cover.sigil} size={big ? 84 : 50} stroke={1.1} />
    </span>
    <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 -40px 50px rgba(0,0,0,0.45)" }} />
  </div>
);

const SysBadge = ({ sigil, abbr, accent }) => (
  <span className="a-pill" style={{ background: tint(accent, 0.13), color: accent, borderColor: tint(accent, 0.34) }}>
    <Sigil name={sigil} size={11} /> {abbr}
  </span>
);

// ── Users / roles ─────────────────────────────────────────────────────
// Role labels come from the campaign's system terminology (gm / player).
const ROLE = (sys) => ({
  gm: (sys && sys.terminology && sys.terminology.gm) || "Game Master",
  player: (sys && sys.terminology && sys.terminology.player) || "Player",
});

function deriveUsers(c) {
  if (c.users && c.users.length) return JSON.parse(JSON.stringify(c.users));
  const out = [{ id: uid("usr"), name: c.gm || "You", role: "gm", plays: "" }];
  (c.party || []).forEach(p => out.push({ id: uid("usr"), name: "", role: "player", plays: p.name }));
  return out;
}

const RoleBadge = ({ role, sys }) => {
  const labels = ROLE(sys);
  const isGm = role === "gm";
  return (
    <span className="a-pill" style={isGm
      ? { background: "var(--gold3)", color: "var(--gold)", borderColor: "rgba(200,160,80,0.34)" }
      : { background: "rgba(91,155,213,0.12)", color: "#7eb4e0", borderColor: "rgba(91,155,213,0.3)" }}>
      <Sigil name={isGm ? "crown" : "figure"} size={10} /> {isGm ? labels.gm : labels.player}
    </span>
  );
};

// Build the campaign's character list (party) from the roster's player assignments.
function buildParty(users) {
  return (users || [])
    .filter(u => u.role === "player" && (u.plays || "").trim())
    .map(u => ({ name: u.plays.trim(), cls: (u.cls || "").trim(), level: Math.max(1, parseInt(u.level, 10) || 1) }));
}

// Read characters that already exist in a campaign's live save. Campaign files
// persist their state under a namespaced "<ns>si_state_v2" localStorage key (same
// origin as the launcher), so the roster can tie a player to a character the GM
// has already built instead of retyping name / class / level.
// Each campaign declares its own namespace (campaign.ns, e.g. "siCampaign::"), so we
// read THAT campaign's save directly — never guess across other campaigns' saves.
function loadLiveCharacters(campaign) {
  try {
    let party = [];
    const ns = campaign && campaign.ns;
    if (ns) {
      // Deterministic: read this campaign's own namespaced save.
      try {
        const st = JSON.parse(localStorage.getItem(ns + "si_state_v2"));
        if (Array.isArray(st && st.party)) party = st.party;
      } catch (e) {}
    } else {
      // Fallback for campaigns without a declared namespace: pick the richest save.
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !/si_state_v2$/.test(k)) continue;
        try {
          const st = JSON.parse(localStorage.getItem(k));
          const p = Array.isArray(st && st.party) ? st.party : [];
          if (p.length > party.length) party = p;
        } catch (e) {}
      }
    }
    return party
      .map(p => ({ name: (p.name || "").trim(), cls: (p.cls || "").trim(), level: parseInt(p.level, 10) || 1 }))
      .filter(c => c.name);
  } catch (e) { return []; }
}

// Editable roster — each person + role; players get a character (name, class, level) assigned to them.
const UsersRoster = ({ users, onChange, sys, characters = [] }) => {
  const labels = ROLE(sys);
  const charLabel = (sys && sys.terms && sys.terms.character) || "Character";
  const setRow = (i, patch) => onChange(users.map((u, j) => j === i ? { ...u, ...patch } : u));
  const add = (role) => onChange([...users, { id: uid("usr"), name: "", role, plays: "", cls: "", level: 1 }]);
  const del = (i) => onChange(users.filter((_, j) => j !== i));
  const gmCount = users.filter(u => u.role === "gm").length;
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {users.map((u, i) => {
          const isGm = u.role === "gm";
          const initial = (u.name || "").trim()[0];
          return (
            <div key={u.id || i} style={{ padding: "8px 9px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: isGm ? "var(--gold3)" : "rgba(91,155,213,0.12)", color: isGm ? "var(--gold)" : "#7eb4e0", fontFamily: "var(--serif)", fontWeight: 700, fontSize: "0.82rem" }}>
                  {initial ? initial.toUpperCase() : <Sigil name={isGm ? "crown" : "figure"} size={14} />}
                </div>
                <input className="a-input" style={{ flex: 1, minWidth: 70 }} value={u.name} placeholder="Person's name…" onChange={e => setRow(i, { name: e.target.value })} />
                <select className="a-select" style={{ width: 158, flexShrink: 0 }} value={u.role} onChange={e => setRow(i, { role: e.target.value })}>
                  <option value="gm">{labels.gm}</option>
                  <option value="player">{labels.player}</option>
                </select>
                {isGm && <div className="a-mono" style={{ width: 148, flexShrink: 0, textAlign: "center", fontSize: "0.58rem", color: "var(--muted)" }}>runs the table</div>}
                <button className="a-iconbtn" style={{ width: 30, height: 30, color: "#cc6f7c", flexShrink: 0 }} onClick={() => del(i)} title="Remove"><Sigil name="close" size={14} /></button>
              </div>
              {!isGm && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, paddingLeft: 38 }}>
                  <span className="a-mono" style={{ fontSize: "0.56rem", color: "var(--muted)", flexShrink: 0, width: 30, textAlign: "right" }}>plays</span>
                  {characters.length ? (
                    <>
                      <select className="a-select" style={{ flex: 1, minWidth: 120, fontSize: "0.86rem" }} value={u.plays || ""}
                        onChange={e => { const ch = characters.find(c => c.name === e.target.value); setRow(i, { plays: e.target.value, cls: ch ? ch.cls : "", level: ch ? ch.level : (u.level || 1) }); }}>
                        <option value="">— pick an existing {charLabel.toLowerCase()} —</option>
                        {characters.map((c, ci) => <option key={c.name + "__" + ci} value={c.name}>{c.name}{c.cls ? " · " + c.cls : ""}{c.level ? " · Lv " + c.level : ""}</option>)}
                        {u.plays && !characters.some(c => c.name === u.plays) && <option value={u.plays}>{u.plays} (no longer in campaign)</option>}
                      </select>
                      {u.plays && (u.cls || u.level) ? <span className="a-mono" style={{ flexShrink: 0, fontSize: "0.58rem", color: "var(--muted)", whiteSpace: "nowrap" }}>{(u.cls || "").trim()}{u.cls && u.level ? " · " : ""}{u.level ? "Lv " + u.level : ""}</span> : null}
                    </>
                  ) : (
                    <>
                      <input className="a-input" style={{ flex: 1, minWidth: 70, fontSize: "0.86rem" }} value={u.plays || ""} placeholder={charLabel + " name…"} onChange={e => setRow(i, { plays: e.target.value })} />
                      <input className="a-input" style={{ width: 132, flexShrink: 0, fontSize: "0.86rem" }} value={u.cls || ""} placeholder="class / role…" onChange={e => setRow(i, { cls: e.target.value })} />
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                        <span className="a-mono" style={{ fontSize: "0.56rem", color: "var(--muted)" }}>Lv</span>
                        <input className="a-input" type="number" min={1} style={{ width: 52, fontSize: "0.86rem", textAlign: "center" }} value={u.level || 1} onChange={e => setRow(i, { level: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 11, alignItems: "center", flexWrap: "wrap" }}>
        <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => add("player")}><Sigil name="plus" size={12} /> Add {labels.player.toLowerCase()}</button>
        <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => add("gm")}><Sigil name="crown" size={12} /> Add {labels.gm.toLowerCase()}</button>
        <span className="a-mono" style={{ fontSize: "0.6rem", color: gmCount === 0 ? "#e07788" : "var(--muted)", marginLeft: "auto" }}>
          {gmCount === 0 ? "no " + labels.gm.toLowerCase() + " assigned" : users.length + " at the table"}
        </span>
      </div>
    </div>
  );
};

// ── Edit-campaign modal ───────────────────────────────────────────────
const EditCampaignModal = ({ campaign, systems, onClose, onSave }) => {
  const sys = systems.find(s => s.id === campaign.sysId) || systems[0];
  const [name, setName] = React.useState(campaign.title);
  const [blurb, setBlurb] = React.useState(campaign.blurb);
  const [sigil, setSigil] = React.useState(campaign.cover.sigil);
  const [tintHex, setTintHex] = React.useState(campaign.cover.tint);
  const [users, setUsers] = React.useState(() => deriveUsers(campaign));
  const liveChars = React.useMemo(() => (campaign && campaign.real) ? loadLiveCharacters(campaign) : [], [campaign && campaign.id]);

  const save = () => {
    const players = users.filter(u => u.role === "player").length;
    const gm = (users.find(u => u.role === "gm") || {}).name || "You";
    onSave(campaign.id, { title: name.trim() || campaign.title, blurb: blurb.trim() || campaign.blurb, cover: { sigil, tint: tintHex }, users, players, gm, party: buildParty(users) });
    onClose();
  };

  return (
    <Modal open={!!campaign} onClose={onClose} width={700} icon="quill" kicker={"Edit · " + campaign.sysName}
      title="Edit campaign"
      footer={<>
        <button className="a-btn a-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="a-btn a-btn-primary" onClick={save}><Sigil name="check" size={13} /> Save Changes</button>
      </>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Campaign name"><input className="a-input" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="System" hint="Edit its rules from the campaign menu → Manage system">
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", border: "1px solid var(--border)", borderRadius: "var(--r2)", background: "var(--faint)" }}>
              <span style={{ color: campaign.accent }}><Sigil name={campaign.sysSigil} size={16} /></span>
              <span className="a-serif" style={{ color: "var(--bone)", fontSize: "0.92rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sys ? sys.name : campaign.sysName}</span>
            </div>
          </Field>
        </div>
        <Field label="One-line pitch"><textarea className="a-textarea" rows={2} value={blurb} onChange={e => setBlurb(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto", gap: 16, alignItems: "start" }}>
          <Field label="Cover sigil">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COVER_SIGILS.map(s => <button key={s} onClick={() => setSigil(s)} className="a-iconbtn" style={{ width: 34, height: 34, borderColor: sigil === s ? "var(--border3)" : "var(--border)", background: sigil === s ? "var(--gold3)" : "transparent", color: sigil === s ? "var(--gold2)" : "var(--muted)" }}><Sigil name={s} size={16} /></button>)}
            </div>
          </Field>
          <Field label="Cover tone">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COVER_TINTS.map(t => <button key={t} onClick={() => setTintHex(t)} style={{ width: 34, height: 34, borderRadius: "var(--r2)", cursor: "pointer", background: t, border: tintHex === t ? "2px solid var(--gold2)" : "1px solid var(--border)" }} />)}
            </div>
          </Field>
          <Field label="Preview"><div style={{ width: 116 }}><Cover cover={{ sigil, tint: tintHex }} accent={campaign.accent} h={64} /></div></Field>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ color: campaign.accent }}><Sigil name="users" size={16} /></span>
            <label className="a-label" style={{ margin: 0 }}>Players &amp; {ROLE(sys).gm} — roles use {sys ? sys.abbr : "system"} terminology</label>
          </div>
          <UsersRoster users={users} onChange={setUsers} sys={sys} characters={liveChars} />
          <div className="a-mono" style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 9, lineHeight: 1.6 }}>
            {liveChars.length
              ? "Add a player, type their name, then pick the character they play from your campaign’s existing roster. This is the only place users are managed — there is no switcher inside the campaign."
              : "This roster is the single place users are managed. Each person enters the campaign as themselves from here or the campaign detail — there is no user switcher inside the campaign."}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Campaign card ──
const CampaignCard = ({ c, onOpen, onLaunch, menu }) => {
  const avgLvl = c.party.length ? Math.round(c.party.reduce((s, p) => s + p.level, 0) / c.party.length) : 0;
  return (
    <div className="a-card a-card-hov" style={{ overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", opacity: c.status === "archived" ? 0.72 : 1 }} onClick={() => onOpen(c)}>
      <Cover cover={c.cover} accent={c.accent} />
      <div style={{ position: "absolute", top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}><Kebab items={menu(c)} /></div>
      {c.status === "archived" && <div style={{ position: "absolute", top: 44, left: 10 }}><span className="a-pill a-pill-muted"><Sigil name="archive" size={10} /> Archived</span></div>}

      <div style={{ padding: "13px 15px 15px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div className="a-serif" style={{ fontSize: "1.12rem", fontWeight: 700, color: "var(--bone)", lineHeight: 1.15 }}>{c.title}</div>
        <div style={{ color: "var(--muted)", fontSize: "0.86rem", lineHeight: 1.45, marginTop: 6, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.blurb}</div>

        <div style={{ display: "flex", gap: 14, margin: "13px 0", paddingTop: 12, borderTop: "1px solid var(--faint)" }}>
          <MiniStat value={c.players} label="Players" />
          <MiniStat value={"Lv " + avgLvl} label="Avg level" />
          <MiniStat value={c.day} label="Day" />
          <MiniStat value={c.sessions} label="Sessions" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="a-mono" style={{ fontSize: "0.62rem", color: "var(--muted)", flex: 1 }}>Last played · {c.lastPlayed}</span>
          <button className="a-btn a-btn-primary a-btn-sm" onClick={(e) => { e.stopPropagation(); onLaunch(c); }}>
            <Sigil name="play" size={11} /> Enter
          </button>
        </div>
      </div>
    </div>
  );
};

// ── New-campaign tile ──
const NewCard = ({ onClick }) => (
  <button onClick={onClick} className="a-card" style={{
    border: "1.5px dashed var(--border2)", background: "rgba(255,255,255,0.012)", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 300, color: "var(--muted)", transition: "all .18s",
  }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border3)"; e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.background = "var(--gold-faint)"; }}
     onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "rgba(255,255,255,0.012)"; }}>
    <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid currentColor", display: "grid", placeItems: "center" }}><Sigil name="plus" size={26} /></div>
    <div className="a-serif" style={{ fontSize: "1rem", color: "currentColor" }}>Forge a New Campaign</div>
    <div className="a-mono" style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}>pick a system · name your world</div>
  </button>
);

// ── Detail overlay ──
const CampaignDetail = ({ c, sys, onClose, onLaunch, onOpenSystem, onArchive, onDelete, onHost, onEdit }) => {
  if (!c) return null;
  const avgLvl = c.party.length ? Math.round(c.party.reduce((s, p) => s + p.level, 0) / c.party.length) : 0;
  const users = deriveUsers(c);
  const labels = ROLE(sys);
  return (
    <Modal open={!!c} onClose={onClose} width={680} title={c.title} kicker={"Campaign · " + c.created}
      icon={null}
      footer={<>
        <button className="a-btn a-btn-ghost" onClick={() => onEdit(c)}><Sigil name="quill" size={14} /> Edit</button>
        <button className="a-btn a-btn-ghost" onClick={() => onHost(c)}><Sigil name="globe" size={14} /> Host / Share</button>
        <button className="a-btn a-btn-primary" onClick={() => { const gm = users.find(u => u.role === "gm"); onLaunch({ ...c, _enterAs: "dm", _enterAsLabel: (gm && gm.name) || "the Keeper" }); }}><Sigil name="play" size={13} /> Enter Campaign</button>
      </>}>
      <Cover cover={c.cover} accent={c.accent} h={170} big />
      <div style={{ display: "flex", gap: 8, margin: "14px 0 4px", flexWrap: "wrap" }}>
        <SysBadge sigil={c.sysSigil} abbr={c.sysName} accent={c.accent} />
        <span className={"a-pill " + (c.status === "active" ? "a-pill-green" : "a-pill-muted")}>{c.status === "active" ? "Active" : "Archived"}</span>
        <span className="a-pill a-pill-muted"><Sigil name="hourglass" size={10} /> In-world day {c.day}</span>
        <span className="a-pill a-pill-muted">{c.sessions} sessions logged</span>
      </div>
      <p style={{ color: "var(--text)", fontSize: "1rem", lineHeight: 1.6, margin: "12px 0 18px" }}>{c.blurb}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div className="a-kicker">At the Table · {users.length}</div>
        <button className="a-btn a-btn-ghost a-btn-sm" style={{ marginLeft: "auto" }} onClick={() => onEdit(c)}><Sigil name="plus" size={11} /> Manage roster</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {users.map((u, i) => {
          const ini = (u.name || "").trim();
          return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: u.role === "gm" ? "var(--gold3)" : "rgba(91,155,213,0.12)", color: u.role === "gm" ? "var(--gold)" : "#7eb4e0", fontFamily: "var(--serif)", fontWeight: 700, fontSize: "0.78rem" }}>{ini ? ini[0].toUpperCase() : <Sigil name={u.role === "gm" ? "crown" : "figure"} size={13} />}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="a-serif" style={{ fontSize: "0.9rem", color: "var(--bone)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name || "Unnamed"}{u.role === "player" && u.plays ? <span className="a-mono" style={{ fontSize: "0.56rem", color: "var(--muted)" }}> · {u.plays}</span> : null}</div>
            </div>
            <RoleBadge role={u.role} sys={sys} />
            <button className="a-btn a-btn-ghost a-btn-sm" style={{ flexShrink: 0, padding: "5px 8px" }}
              title={"Enter the campaign as " + (u.name || u.plays || "this person")}
              onClick={() => onLaunch({ ...c, _enterAs: u.role === "gm" ? "dm" : (u.name || u.plays), _enterAsLabel: u.name || u.plays || "player" })}>
              <Sigil name="play" size={11} />
            </button>
          </div>
          );
        })}
      </div>

      {c.party.length > 0 && <>
        <div className="a-kicker" style={{ marginBottom: 10 }}>Characters · avg level {avgLvl}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {c.party.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
              <span style={{ color: c.accent }}><Sigil name="figure" size={18} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="a-serif" style={{ fontSize: "0.92rem", color: "var(--bone)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div className="a-mono" style={{ fontSize: "0.6rem", color: "var(--muted)" }}>{p.cls} · Lv {p.level}</div>
              </div>
            </div>
          ))}
        </div>
      </>}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => onOpenSystem(c.sysId)}><Sigil name="gear" size={13} /> Manage System</button>
        <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => { onArchive(c); }}><Sigil name="archive" size={13} /> {c.status === "active" ? "Archive" : "Restore"}</button>
        <button className="a-btn a-btn-danger a-btn-sm" onClick={() => { if (confirm("Delete “" + c.title + "”? This removes it from the launcher (mockup only).")) { onDelete(c); onClose(); } }}><Sigil name="trash" size={13} /> Delete</button>
      </div>
    </Modal>
  );
};

// ── New-campaign wizard ──
const NewCampaignWizard = ({ open, systems, initialSysId, onClose, onCreate }) => {
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [blurb, setBlurb] = React.useState("");
  const [sigil, setSigil] = React.useState("compass");
  const [tintIdx, setTintIdx] = React.useState(0);
  const [sysId, setSysId] = React.useState(initialSysId || systems[0]?.id);
  const [users, setUsers] = React.useState([{ id: uid("usr"), name: "You", role: "gm", plays: "" }]);

  React.useEffect(() => { if (open) { setStep(0); setName(""); setBlurb(""); setSigil("compass"); setTintIdx(0); setSysId(initialSysId || systems[0]?.id); setUsers([{ id: uid("usr"), name: "You", role: "gm", plays: "" }]); } }, [open, initialSysId]);

  const sys = systems.find(s => s.id === sysId) || systems[0];
  const canNext = step === 0 ? name.trim().length > 0 : true;

  const create = () => {
    const players = users.filter(u => u.role === "player").length;
    const gm = (users.find(u => u.role === "gm") || {}).name || "You";
    onCreate({
      id: uid("camp"), title: name.trim(), blurb: blurb.trim() || "A new world, freshly forged.",
      sysId: sys.id, sysName: sys.abbr, sysAbbr: sys.abbr, accent: sys.accent, sysSigil: sys.sigil,
      status: "active", lastPlayed: "Never", lastPlayedSort: -1, created: "Just now",
      day: 1, sessions: 0, party: buildParty(users), gm, players, users,
      // New worlds run on the shared campaign engine, opened under their own
      // save namespace (passed on the URL) so each starts blank & independent.
      real: "campaigns/The Shattered Isles/The Shattered Isles - My Campaign.html",
      // Its own localStorage namespace, so its live save never collides with other worlds.
      ns: "si_" + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "::",
      cover: { sigil, tint: COVER_TINTS[tintIdx] },
    });
  };

  return (
    <Modal open={open} onClose={onClose} width={620} icon="compass" kicker={"Step " + (step + 1) + " of 3"}
      title={step === 0 ? "Name your world" : step === 1 ? "Choose a system" : "Set up your table"}
      footer={<>
        {step > 0 && <button className="a-btn a-btn-ghost" onClick={() => setStep(step - 1)}><Sigil name="arrow-left" size={13} /> Back</button>}
        {step < 2
          ? <button className="a-btn a-btn-primary" disabled={step === 0 && !canNext} style={{ opacity: (step === 0 && !canNext) ? 0.4 : 1 }} onClick={() => { if (step === 0 && !canNext) return; setStep(step + 1); }}>Next <Sigil name="arrow-right" size={13} /></button>
          : <button className="a-btn a-btn-primary" onClick={create}><Sigil name="check" size={13} /> Create Campaign</button>}
      </>}>
      {step === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Campaign name"><input className="a-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="The Shattered Isles…" /></Field>
          <Field label="One-line pitch" hint="Shown on the shelf. You can flesh it out later."><textarea className="a-textarea" rows={2} value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Sky-pirates, a sleepless God-Queen, islands that fell upward…" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <Field label="Cover sigil">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COVER_SIGILS.map(s => (
                  <button key={s} onClick={() => setSigil(s)} className="a-iconbtn" style={{ width: 38, height: 38, borderColor: sigil === s ? "var(--border3)" : "var(--border)", background: sigil === s ? "var(--gold3)" : "transparent", color: sigil === s ? "var(--gold2)" : "var(--muted)" }}><Sigil name={s} size={18} /></button>
                ))}
              </div>
            </Field>
            <Field label="Cover tone">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COVER_TINTS.map((t, i) => (
                  <button key={t} onClick={() => setTintIdx(i)} style={{ width: 38, height: 38, borderRadius: "var(--r2)", cursor: "pointer", background: t, border: tintIdx === i ? "2px solid var(--gold2)" : "1px solid var(--border)" }} />
                ))}
              </div>
            </Field>
          </div>
          <div>
            <label className="a-label">Preview</label>
            <div style={{ width: 180 }}><Cover cover={{ sigil, tint: COVER_TINTS[tintIdx] }} accent="#c8a050" h={96} /></div>
          </div>
        </div>
      ) : step === 1 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>Each campaign keeps its <em>own copy</em> of the system you pick — tweak its rules later without touching other tables.</div>
          {systems.map(s => {
            const on = s.id === sysId;
            const modCount = Object.values(s.modules).filter(Boolean).length;
            return (
              <button key={s.id} onClick={() => setSysId(s.id)} className="a-card" style={{ textAlign: "left", cursor: "pointer", padding: 15, display: "flex", gap: 14, alignItems: "center", borderColor: on ? tint(s.accent, 0.6) : "var(--border)", background: on ? tint(s.accent, 0.07) : "var(--surface)" }}>
                <div style={{ width: 46, height: 46, borderRadius: "var(--r2)", display: "grid", placeItems: "center", flexShrink: 0, background: tint(s.accent, 0.12), color: s.accent, border: "1px solid " + tint(s.accent, 0.3) }}><Sigil name={s.sigil} size={24} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="a-serif" style={{ fontSize: "1.02rem", color: "var(--bone)" }}>{s.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.84rem", marginTop: 3 }}>{s.tagline}</div>
                  <div className="a-mono" style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: 6, letterSpacing: "0.04em" }}>{s.dice.core.toUpperCase()} · {s.attributes.length} attributes · {s.currency.length}-coin economy · {modCount} modules</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid " + (on ? s.accent : "var(--border2)"), display: "grid", placeItems: "center" }}>{on && <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.accent }} />}</div>
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>Add the people at your table and mark each as <b style={{ color: sys.accent }}>{ROLE(sys).gm}</b> or <b style={{ color: sys.accent }}>{ROLE(sys).player}</b>. The role labels come from <b style={{ color: "var(--bone)" }}>{sys.name}</b> — switch systems and they change with it. You can edit this anytime later.</div>
          <UsersRoster users={users} onChange={setUsers} sys={sys} />
        </div>
      )}
    </Modal>
  );
};

// ── Campaigns tab ──
const CampaignsTab = ({ store, api, onLaunch, onOpenSystem, onHost, seedSysId, onSeedConsumed }) => {
  const [q, setQ] = React.useState("");
  const [statusF, setStatusF] = React.useState("active");
  const [sort, setSort] = React.useState("recent");
  const [view, setView] = React.useState("grid");
  const [detail, setDetail] = React.useState(null);
  const [editing, setEditing] = React.useState(null);
  const [wizard, setWizard] = React.useState(false);
  const [wizardSeed, setWizardSeed] = React.useState(null);

  const sysOf = (c) => store.systems.find(s => s.id === c.sysId);

  // When Systems' "Use" hands us a system id, open the wizard pre-seeded on it.
  React.useEffect(() => {
    if (seedSysId) { setWizardSeed(seedSysId); setWizard(true); onSeedConsumed && onSeedConsumed(); }
  }, [seedSysId]);

  const list = store.campaigns
    .filter(c => statusF === "all" ? true : c.status === statusF)
    .filter(c => !q || (c.title + " " + c.blurb + " " + c.sysName).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === "recent" ? a.lastPlayedSort - b.lastPlayedSort : sort === "name" ? a.title.localeCompare(b.title) : b.sessions - a.sessions);

  const update = (id, patch) => api.setCampaigns(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
  const archive = (c) => { update(c.id, { status: c.status === "active" ? "archived" : "active" }); setDetail(d => d && d.id === c.id ? { ...d, status: c.status === "active" ? "archived" : "active" } : d); };
  const remove = (c) => api.setCampaigns(cs => cs.filter(x => x.id !== c.id));
  const duplicate = (c) => api.setCampaigns(cs => [{ ...JSON.parse(JSON.stringify(c)), id: uid("camp"), title: c.title + " (copy)", lastPlayed: "Never", lastPlayedSort: -1, sessions: 0, status: "active" }, ...cs]);

  const menu = (c) => [
    { label: "Enter campaign", icon: "play", onClick: () => onLaunch(c) },
    { label: "Edit campaign", icon: "quill", onClick: () => setEditing(c) },
    { label: "Host / share", icon: "globe", onClick: () => onHost(c) },
    { label: "Details", icon: "info", onClick: () => setDetail(c) },
    { label: "Manage system", icon: "gear", onClick: () => onOpenSystem(c.sysId) },
    { label: "Duplicate", icon: "copy", onClick: () => duplicate(c) },
    { sep: true },
    { label: c.status === "active" ? "Archive" : "Restore", icon: "archive", onClick: () => archive(c) },
    { label: "Delete", icon: "trash", danger: true, onClick: () => { if (confirm("Delete “" + c.title + "”? (mockup only)")) remove(c); } },
  ];

  const counts = {
    active: store.campaigns.filter(c => c.status === "active").length,
    archived: store.campaigns.filter(c => c.status === "archived").length,
    all: store.campaigns.length,
  };

  return (
    <div className="scroll-y" style={{ height: "100%", overflowY: "auto", padding: "26px 30px 60px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <PanelHead kicker="The Atlas · Your Tables" title="Campaigns" icon="compass"
          sub="Every world you keep, on one shelf. Open where you left off, or forge a new one on any system."
          right={<button className="a-btn a-btn-primary" onClick={() => setWizard(true)}><Sigil name="plus" size={15} /> New Campaign</button>} />

        {/* toolbar */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 220, maxWidth: 380, background: "rgba(255,255,255,0.035)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: "8px 12px" }}>
            <Sigil name="search" size={15} style={{ color: "var(--muted)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns…" style={{ flex: 1, background: "transparent", border: 0, outline: 0, color: "var(--bone)", fontFamily: "var(--body)", fontSize: "0.95rem", fontStyle: "italic" }} />
          </div>
          <Segmented value={statusF} onChange={setStatusF} options={[{ value: "active", label: "Active · " + counts.active }, { value: "archived", label: "Archived · " + counts.archived }, { value: "all", label: "All · " + counts.all }]} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <select className="a-select" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Recently played</option>
              <option value="name">Name (A–Z)</option>
              <option value="sessions">Most sessions</option>
            </select>
            <Segmented size="sm" value={view} onChange={setView} options={[{ value: "grid", label: "▦" }, { value: "list", label: "≡" }]} />
          </div>
        </div>

        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0", color: "var(--muted)" }}>
            <Sigil name="compass" size={42} style={{ opacity: 0.4 }} />
            <div className="a-serif" style={{ fontSize: "1.2rem", marginTop: 14, color: "var(--text)" }}>No campaigns here yet</div>
            <div style={{ marginTop: 6 }}>{statusF === "archived" ? "Nothing archived." : "Forge your first world to begin."}</div>
            <button className="a-btn a-btn-primary" style={{ marginTop: 18 }} onClick={() => setWizard(true)}><Sigil name="plus" size={14} /> New Campaign</button>
          </div>
        ) : view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(282px, 1fr))", gap: 18 }}>
            {list.map(c => <CampaignCard key={c.id} c={c} onOpen={setDetail} onLaunch={onLaunch} menu={menu} />)}
            {statusF !== "archived" && <NewCard onClick={() => setWizard(true)} />}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {list.map(c => {
              const avg = c.party.length ? Math.round(c.party.reduce((s, p) => s + p.level, 0) / c.party.length) : 0;
              return (
                <div key={c.id} className="a-card a-card-hov" style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, cursor: "pointer" }} onClick={() => setDetail(c)}>
                  <div style={{ width: 70, flexShrink: 0 }}><Cover cover={c.cover} accent={c.accent} h={48} big /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span className="a-serif" style={{ fontSize: "1.02rem", color: "var(--bone)" }}>{c.title}</span>
                      <SysBadge sigil={c.sysSigil} abbr={c.sysAbbr} accent={c.accent} />
                      {c.status === "archived" && <span className="a-pill a-pill-muted">Archived</span>}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: "0.84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>{c.blurb}</div>
                  </div>
                  <div className="a-mono" style={{ fontSize: "0.62rem", color: "var(--muted)", textAlign: "right", whiteSpace: "nowrap" }}>{c.players} players · Lv {avg}<br />Day {c.day} · {c.lastPlayed}</div>
                  <button className="a-btn a-btn-primary a-btn-sm" onClick={(e) => { e.stopPropagation(); onLaunch(c); }}><Sigil name="play" size={11} /> Enter</button>
                  <div onClick={(e) => e.stopPropagation()}><Kebab items={menu(c)} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CampaignDetail c={detail} sys={detail ? sysOf(detail) : null} onClose={() => setDetail(null)} onLaunch={onLaunch} onOpenSystem={onOpenSystem} onArchive={archive} onDelete={remove} onHost={(c) => { setDetail(null); onHost(c); }} onEdit={(c) => { setDetail(null); setEditing(c); }} />
      {editing && <EditCampaignModal campaign={editing} systems={store.systems} onClose={() => setEditing(null)} onSave={(id, patch) => { update(id, patch); setDetail(d => d && d.id === id ? { ...d, ...patch } : d); }} />}
      <NewCampaignWizard open={wizard} systems={store.systems} initialSysId={wizardSeed} onClose={() => { setWizard(false); setWizardSeed(null); }} onCreate={(c) => { api.setCampaigns(cs => [c, ...cs]); setWizard(false); setWizardSeed(null); setDetail(c); }} />
    </div>
  );
};

Object.assign(window, { CampaignsTab, Cover, SysBadge });
