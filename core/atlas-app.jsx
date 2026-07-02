// atlas-app.jsx — launcher shell: brand, top nav, routing, launch veil, mount.

const TABS = [
  { id: "campaigns", label: "Campaigns", icon: "compass" },
  { id: "bestiary", label: "Bestiary", icon: "claw" },
  { id: "systems", label: "Systems", icon: "dice" },
  { id: "cartographer", label: "Cartographer", icon: "scroll" },
];

// ── Cartographer (placeholder) ──────────────────────────────────────────
// Future home of the in-app map maker — draw/import maps and link them to
// campaigns, locations, and encounters. Stubbed for now so the tab exists.
const CartographerTab = () => (
  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
    <div style={{ textAlign: "center", maxWidth: 460 }}>
      <div style={{ width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 20px", background: "var(--gold3, rgba(201,168,76,.1))", border: "1px solid var(--border2, rgba(201,168,76,.28))", color: "var(--gold, #c9a84c)" }}>
        <Sigil name="scroll" size={34} />
      </div>
      <div className="a-serif" style={{ fontSize: "1.5rem", color: "var(--bone, #e0d6c0)", marginBottom: 10 }}>Cartographer</div>
      <p style={{ color: "var(--muted, #8a8068)", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 18px" }}>
        A map-making studio is coming here — draw or import world, region, and battle maps, then link them straight to your campaigns, locations, and encounters.
      </p>
      <span className="a-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold2, #9a8348)", border: "1px solid var(--border, rgba(201,168,76,.2))", borderRadius: 20, padding: "5px 14px" }}>
        Coming soon
      </span>
    </div>
  </div>
);

// Each campaign keeps its live save under a "<ns>…" localStorage namespace. When a
// world is deleted (or a stray/blank one was opened in the past), its save can linger
// as an orphan. This removes every campaign-save namespace not claimed by a current
// campaign — so the launcher only carries the worlds it actually lists.
function purgeOrphanSaves(campaigns) {
  try {
    const known = new Set((campaigns || []).map(c => c.ns).filter(Boolean));
    // Collect distinct namespaces from any "<ns>si_state_v2" key in storage.
    const orphanNs = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k && k.match(/^(.*::)si_state_v2$/);
      if (m && !known.has(m[1])) orphanNs.add(m[1]);
    }
    if (orphanNs.size === 0) { alert("No orphaned campaign saves — only your listed worlds are stored."); return; }
    const list = [...orphanNs];
    if (!confirm("Remove " + list.length + " orphaned campaign save" + (list.length > 1 ? "s" : "") +
      " from browser storage?\n\n" + list.join("\n") + "\n\nThis cannot be undone.")) return;
    // Remove every key under each orphaned namespace.
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && list.some(ns => k.indexOf(ns) === 0)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    alert("Removed " + toRemove.length + " orphaned key" + (toRemove.length > 1 ? "s" : "") + ".");
  } catch (e) { alert("Could not clean up: " + e.message); }
}

// Cinematic veil shown when entering a campaign.
const LaunchVeil = ({ campaign, onDone }) => {
  React.useEffect(() => {
    if (!campaign) return;
    const t = setTimeout(() => {
      if (campaign.real) {
        try {
          let url = campaign.real;
          // The only real campaign file is the shared engine. Any custom world
          // (its own namespace) routes through it — including legacy worlds saved
          // with a per-world file path that was never actually created on disk.
          const ENGINE = "campaigns/The Shattered Isles/The Shattered Isles - My Campaign.html";
          if (campaign.ns && campaign.ns !== "siCampaign::" && url !== ENGINE) url = ENGINE;
          // Encode the file path ONCE (it has spaces); append already-encoded query
          // params after — never re-wrap the whole thing, or the % gets re-escaped.
          url = encodeURI(url);
          const params = [];
          // Identity is chosen here in The Atlas and handed to the campaign on the URL.
          if (campaign._enterAs) params.push("as=" + encodeURIComponent(campaign._enterAs));
          // Each world rides the shared engine under its own save namespace + display name.
          if (campaign.ns) params.push("ns=" + encodeURIComponent(campaign.ns));
          if (campaign.title) params.push("world=" + encodeURIComponent(campaign.title));
          if (params.length) url += "?" + params.join("&");
          window.location.href = url;
          return;
        } catch (e) {}
      }
      onDone();
    }, campaign.real ? 1300 : 1700);
    return () => clearTimeout(t);
  }, [campaign]);
  if (!campaign) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "radial-gradient(120% 120% at 50% 40%, " + tint(campaign.accent, 0.14) + ", #04060b 70%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, animation: "fi .3s ease" }}>
      <div style={{ color: campaign.accent, animation: "spin 2.4s linear infinite" }}><Sigil name={campaign.cover.sigil} size={64} stroke={1.1} /></div>
      <div style={{ textAlign: "center" }}>
        <div className="a-kicker" style={{ marginBottom: 8 }}>Entering</div>
        <div className="a-display" style={{ fontSize: "1.9rem", color: "var(--bone)" }}>{campaign.title}</div>
        <div className="a-mono" style={{ fontSize: "0.66rem", color: "var(--muted)", marginTop: 12 }}>
          {campaign.real ? ("Opening your live campaign" + (campaign._enterAsLabel ? " as " + campaign._enterAsLabel : "") + "…") : "Loading world · " + campaign.sysName + " · day " + campaign.day}
        </div>
      </div>
      {!campaign.real && (
        <button className="a-btn a-btn-ghost a-btn-sm" style={{ marginTop: 10 }} onClick={onDone}>Cancel — this is a mockup</button>
      )}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
};

const App = () => {
  const [store, api] = useAtlasStore();
  const [tab, setTab] = React.useState(() => { try { const t = localStorage.getItem("atlas-tab"); return TABS.some(x => x.id === t) ? t : "campaigns"; } catch (e) { return "campaigns"; } });
  const [builder, setBuilder] = React.useState(null);   // system object being edited, or null
  const [launching, setLaunching] = React.useState(null);
  const [seedSysId, setSeedSysId] = React.useState(null);
  const [hostCampaign, setHostCampaign] = React.useState(null);   // campaign being hosted, or null
  const [getHostOpen, setGetHostOpen] = React.useState(false);    // "download the host" modal
  const [hasHost, setHasHost] = React.useState(() => { try { return localStorage.getItem("atlas-has-host") === "1"; } catch (e) { return false; } });

  const getHost = () => { setHasHost(true); try { localStorage.setItem("atlas-has-host", "1"); } catch (e) {} setGetHostOpen(false); };

  const go = (t) => { setTab(t); try { localStorage.setItem("atlas-tab", t); } catch (e) {} };

  const openSystem = (id) => { const s = store.systems.find(x => x.id === id); if (s) setBuilder(s); };
  const createSystem = () => setBuilder({ ...JSON.parse(JSON.stringify(SYS_BLANK)), id: null, _new: true, name: "", abbr: "NEW", author: "You", version: "0.1.0", tagline: "", description: "" });
  const newCampaignFromSystem = (id) => { setSeedSysId(id); go("campaigns"); };

  const saveSystem = (sys) => {
    api.setSystems(ss => ss.some(s => s.id === sys.id) ? ss.map(s => s.id === sys.id ? sys : s) : [sys, ...ss]);
    setBuilder(null);
    go("systems");
  };

  return (
    <>
      {/* top bar */}
      <header style={{ display: "flex", alignItems: "center", gap: 20, padding: "0 22px", height: 60, borderBottom: "1px solid var(--border)", background: "rgba(4,6,12,0.82)", backdropFilter: "blur(10px)", flexShrink: 0, zIndex: 50, position: "relative" }}>
        <button onClick={() => go("campaigns")} style={{ display: "flex", alignItems: "center", gap: 12, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, background: "linear-gradient(135deg,#e3b96e,#8b6a2f 60%,#5f4720)", color: "#0b0a0d", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.4)" }}><Sigil name="compass" size={21} stroke={1.6} /></div>
          <div style={{ textAlign: "left", lineHeight: 1 }}>
            <div className="a-serif" style={{ fontSize: "1.06rem", fontWeight: 700, color: "var(--bone)", letterSpacing: "0.04em" }}>The Atlas</div>
            <div className="a-kicker" style={{ fontSize: "0.5rem", marginTop: 4, color: "var(--gold)" }}>Campaign Launcher</div>
          </div>
        </button>

        <nav style={{ display: "flex", gap: 4, marginLeft: 18 }}>
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => go(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 15px", border: 0, borderRadius: "var(--r2)", cursor: "pointer", background: on ? "var(--gold3)" : "transparent", color: on ? "var(--gold2)" : "var(--muted)", fontFamily: "var(--serif)", fontSize: "0.82rem", letterSpacing: "0.03em", boxShadow: on ? "inset 0 0 0 1px var(--border2)" : "none", transition: "all .15s" }}
                onMouseEnter={e => { if (!on) { e.currentTarget.style.background = "var(--faint)"; e.currentTarget.style.color = "var(--text)"; } }} onMouseLeave={e => { if (!on) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; } }}>
                <Sigil name={t.icon} size={15} /> {t.label}
              </button>
            );
          })}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="a-chip" style={{ color: "var(--muted)" }}><Sigil name="figure" size={13} /> {store.campaigns.length} campaigns</span>
        </div>
      </header>

      {/* body */}
      <main style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {tab === "campaigns" && <CampaignsTab store={store} api={api} onLaunch={setLaunching} onOpenSystem={openSystem} onHost={setHostCampaign} seedSysId={seedSysId} onSeedConsumed={() => setSeedSysId(null)} />}
        {tab === "bestiary" && <BestiaryTab />}
        {tab === "systems" && <SystemsTab store={store} api={api} onEdit={openSystem} onCreate={createSystem} onNewCampaign={newCampaignFromSystem} />}
        {tab === "cartographer" && <CartographerTab />}
      </main>

      {builder && <SystemBuilder system={builder} onSave={saveSystem} onCancel={() => setBuilder(null)} />}
      <HostModal campaign={hostCampaign} onClose={() => setHostCampaign(null)} />
      <LaunchVeil campaign={launching} onDone={() => setLaunching(null)} />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
