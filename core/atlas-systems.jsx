// atlas-systems.jsx — the system (ruleset) library.

const SystemCard = ({ s, usedBy, onEdit, onDuplicate, onDelete, onNewCampaign }) => {
  const modCount = Object.values(s.modules).filter(Boolean).length;
  const facts = [
    { icon: "dice", label: s.dice.core.toUpperCase() + " core" },
    { icon: "attr", label: s.attributes.length + " attributes" },
    { icon: "coins", label: s.currency.length + "-coin economy" },
    { icon: "ladder", label: s.leveling.mode === "xp" ? "XP curve · " + s.leveling.cap + " levels" : "Milestone · " + s.leveling.cap + " levels" },
    { icon: "layers", label: modCount + " modules on" },
  ];
  return (
    <div className="a-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 6, background: `linear-gradient(90deg, ${s.accent}, transparent)` }} />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 50, height: 50, borderRadius: "var(--r2)", display: "grid", placeItems: "center", flexShrink: 0, background: tint(s.accent, 0.13), color: s.accent, border: "1px solid " + tint(s.accent, 0.32) }}><Sigil name={s.sigil} size={26} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="a-serif" style={{ fontSize: "1.14rem", fontWeight: 700, color: "var(--bone)", lineHeight: 1.15 }}>{s.name}</div>
            <div className="a-mono" style={{ fontSize: "0.58rem", color: "var(--muted)", marginTop: 4, letterSpacing: "0.06em" }}>v{s.version} · {s.author}</div>
          </div>
          <Kebab items={[
            { label: "Open builder", icon: "sliders", onClick: () => onEdit(s.id) },
            { label: "New campaign", icon: "plus", onClick: () => onNewCampaign(s.id) },
            { label: "Duplicate", icon: "copy", onClick: () => onDuplicate(s.id) },
            { sep: true },
            { label: "Delete system", icon: "trash", danger: true, onClick: () => onDelete(s.id) },
          ]} />
        </div>

        <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.55, margin: "13px 0 15px", flex: 1 }}>{s.description}</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 15 }}>
          {facts.map((f, i) => (
            <div key={i} className="a-chip" style={{ borderColor: "var(--border)", background: "var(--faint)" }}>
              <span style={{ color: s.accent }}><Sigil name={f.icon} size={13} /></span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, paddingTop: 13, borderTop: "1px solid var(--faint)" }}>
          <span className="a-mono" style={{ fontSize: "0.62rem", color: "var(--muted)", flex: 1 }}>
            {usedBy === 0 ? "Not yet in play" : usedBy + " campaign" + (usedBy === 1 ? "" : "s") + " on this system"}
          </span>
          <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => onNewCampaign(s.id)}><Sigil name="plus" size={12} /> Use</button>
          <button className="a-btn a-btn-primary a-btn-sm" onClick={() => onEdit(s.id)}><Sigil name="sliders" size={12} /> Edit Rules</button>
        </div>
      </div>
    </div>
  );
};

const SystemsTab = ({ store, api, onEdit, onCreate, onNewCampaign }) => {
  const usedBy = (id) => store.campaigns.filter(c => c.sysId === id).length;
  const duplicate = (id) => {
    const s = store.systems.find(x => x.id === id);
    api.setSystems(ss => [{ ...JSON.parse(JSON.stringify(s)), id: uid("sys"), name: s.name + " (copy)", author: "You", version: "0.1.0" }, ...ss]);
  };
  const remove = (id) => {
    if (usedBy(id) > 0) { alert("Campaigns are still using this system. Move or delete them first."); return; }
    if (confirm("Delete this system? (mockup only)")) api.setSystems(ss => ss.filter(s => s.id !== id));
  };

  return (
    <div className="scroll-y" style={{ height: "100%", overflowY: "auto", padding: "26px 30px 60px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <PanelHead kicker="The Atlas · Rulesets" title="Systems" icon="dice"
          sub="Systems are blueprints: dice, attributes, leveling, economy, the stat-block schema and which app modules switch on. New campaigns copy a system, then evolve it on their own."
          right={<button className="a-btn a-btn-primary" onClick={onCreate}><Sigil name="plus" size={15} /> Create System</button>} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 18 }}>
          {store.systems.map(s => (
            <SystemCard key={s.id} s={s} usedBy={usedBy(s.id)} onEdit={onEdit} onDuplicate={duplicate} onDelete={remove} onNewCampaign={onNewCampaign} />
          ))}
          {/* blank create tile */}
          <button onClick={onCreate} className="a-card" style={{ border: "1.5px dashed var(--border2)", background: "rgba(255,255,255,0.012)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 240, color: "var(--muted)", transition: "all .18s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border3)"; e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.background = "var(--gold-faint)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "rgba(255,255,255,0.012)"; }}>
            <div style={{ width: 50, height: 50, borderRadius: "50%", border: "1.5px solid currentColor", display: "grid", placeItems: "center" }}><Sigil name="wand" size={24} /></div>
            <div className="a-serif" style={{ fontSize: "1rem" }}>Forge a System</div>
            <div className="a-mono" style={{ fontSize: "0.58rem", letterSpacing: "0.08em", maxWidth: 200, textAlign: "center", lineHeight: 1.5 }}>full rules editor — dice to stat blocks</div>
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { SystemsTab });
