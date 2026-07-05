// atlas-ui.jsx — shared primitives + persisted store for the launcher.

const ATLAS_KEY = "atlas-mock-v3";

// Lightweight store: campaigns + systems, persisted to a private namespace so
// the mockup remembers edits across refresh without touching the real app's data.
function loadAtlas() {
  try {
    const raw = localStorage.getItem(ATLAS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.campaigns && p.systems) {
        // Migration: backfill each campaign's localStorage namespace (added later) so the
        // roster reads the right live save. Match a persisted campaign to its seed by id,
        // else derive the namespace from its title the same way new campaigns did.
        let changed = false;
        p.campaigns.forEach(c => {
          if (c.ns) return;
          const seed = CAMPAIGNS.find(s => s.id === c.id);
          c.ns = (seed && seed.ns) ||
            ("si_" + (c.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "::");
          changed = true;
        });
        // De-collide: name-derived namespaces meant two worlds with the same name
        // shared one live save (and a re-created world resurrected the old one).
        // The OLDEST world keeps the namespace (and therefore the existing save);
        // newer twins are re-namespaced and start fresh. New campaigns now mint
        // unique namespaces, so this runs at most once per legacy collision.
        const claimed = new Set();
        for (let i = p.campaigns.length - 1; i >= 0; i--) { // list is newest-first; walk oldest-first
          const c = p.campaigns[i];
          if (!c.ns) continue;
          if (claimed.has(c.ns)) {
            c.ns = c.ns.replace(/::$/, "") + "_" + Math.random().toString(36).slice(2, 8) + "::";
            changed = true;
          }
          claimed.add(c.ns);
        }
        // Persist immediately — a re-derived or re-minted namespace must survive
        // the next load, or the campaign would point at a different save each time.
        if (changed) { try { localStorage.setItem(ATLAS_KEY, JSON.stringify(p)); } catch (e) {} }
        return p;
      }
    }
  } catch (e) {}
  return {
    campaigns: JSON.parse(JSON.stringify(CAMPAIGNS)),
    systems: JSON.parse(JSON.stringify(SYSTEM_TEMPLATES)),
  };
}

const useAtlasStore = () => {
  const [data, setData] = React.useState(loadAtlas);
  const persist = React.useCallback((next) => {
    setData(next);
    try { localStorage.setItem(ATLAS_KEY, JSON.stringify(next)); } catch (e) {}
  }, []);
  const api = React.useMemo(() => ({
    setCampaigns: (fn) => persist({ ...data, campaigns: typeof fn === "function" ? fn(data.campaigns) : fn }),
    setSystems: (fn) => persist({ ...data, systems: typeof fn === "function" ? fn(data.systems) : fn }),
    reset: () => { try { localStorage.removeItem(ATLAS_KEY); } catch (e) {} persist({ campaigns: JSON.parse(JSON.stringify(CAMPAIGNS)), systems: JSON.parse(JSON.stringify(SYSTEM_TEMPLATES)) }); },
  }), [data, persist]);
  return [data, api];
};

// ── Modal ─────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, kicker, icon, width = 560, children, footer }) => {
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="a-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className="a-modal" style={{
        width, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, var(--surface3), var(--surface2))",
        border: "1px solid var(--border2)", borderRadius: "var(--r)",
        boxShadow: "0 30px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
          {icon && <span style={{ color: "var(--gold)" }}><Sigil name={icon} size={20} /></span>}
          <div style={{ flex: 1, minWidth: 0 }}>
            {kicker && <div className="a-kicker" style={{ marginBottom: 3 }}>{kicker}</div>}
            <div className="a-serif" style={{ fontSize: "1.12rem", fontWeight: 700, color: "var(--bone)" }}>{title}</div>
          </div>
          <button className="a-iconbtn" onClick={onClose} title="Close"><Sigil name="close" size={16} /></button>
        </div>
        <div className="scroll-y" style={{ padding: 18, overflowY: "auto" }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 18px", borderTop: "1px solid var(--border)" }}>{footer}</div>}
      </div>
    </div>
  );
};

// ── Toggle ────────────────────────────────────────────────────────────
const Toggle = ({ on, onChange }) => (
  <div className={"a-toggle" + (on ? " on" : "")} onClick={() => onChange && onChange(!on)} role="switch" aria-checked={on} />
);

// ── Field (label + control) ───────────────────────────────────────────
const Field = ({ label, hint, children, style }) => (
  <div style={style}>
    {label && <label className="a-label">{label}</label>}
    {children}
    {hint && <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)", marginTop: 5, lineHeight: 1.5 }}>{hint}</div>}
  </div>
);

// ── Segmented control ─────────────────────────────────────────────────
const Segmented = ({ value, options, onChange, size = "md" }) => (
  <div style={{ display: "inline-flex", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: 3, gap: 3 }}>
    {options.map((o) => {
      const v = typeof o === "string" ? o : o.value;
      const lbl = typeof o === "string" ? o : o.label;
      const active = v === value;
      return (
        <button key={v} onClick={() => onChange(v)} style={{
          border: 0, cursor: "pointer", borderRadius: "var(--r3)",
          padding: size === "sm" ? "4px 10px" : "6px 13px",
          fontFamily: "var(--mono)", fontSize: size === "sm" ? "0.62rem" : "0.68rem", letterSpacing: "0.03em",
          background: active ? "var(--gold3)" : "transparent",
          color: active ? "var(--gold2)" : "var(--muted)",
          boxShadow: active ? "inset 0 0 0 1px var(--border2)" : "none", transition: "all .14s",
        }}>{lbl}</button>
      );
    })}
  </div>
);

// ── Kebab menu ────────────────────────────────────────────────────────
const Kebab = ({ items }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="a-iconbtn" style={{ width: 30, height: 30 }} onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} title="More"><Sigil name="dots" size={16} /></button>
      {open && (
        <div className="fade-in" style={{
          position: "absolute", right: 0, top: 36, zIndex: 60, minWidth: 168,
          background: "var(--surface3)", border: "1px solid var(--border2)", borderRadius: "var(--r2)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.6)", padding: 5,
        }}>
          {items.map((it, i) => it.sep ? (
            <div key={i} style={{ height: 1, background: "var(--border)", margin: "5px 4px" }} />
          ) : (
            <button key={i} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick && it.onClick(); }} style={{
              display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px", border: 0,
              background: "transparent", color: it.danger ? "#e07788" : "var(--text)", cursor: "pointer",
              fontFamily: "var(--mono)", fontSize: "0.7rem", borderRadius: "var(--r3)", textAlign: "left",
            }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--faint)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              {it.icon && <Sigil name={it.icon} size={15} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Section heading inside panels ─────────────────────────────────────
const PanelHead = ({ kicker, title, sub, right, icon }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 18 }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      {kicker && <div className="a-kicker" style={{ marginBottom: 7 }}>{kicker}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        {icon && <span style={{ color: "var(--gold)" }}><Sigil name={icon} size={24} /></span>}
        <h1 className="a-display" style={{ fontSize: "1.7rem", lineHeight: 1 }}>{title}</h1>
      </div>
      {sub && <div style={{ color: "var(--muted)", fontSize: "0.95rem", marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

// ── Small stat readout ────────────────────────────────────────────────
const MiniStat = ({ value, label, accent }) => (
  <div style={{ textAlign: "center" }}>
    <div className="a-mono" style={{ fontSize: "1.15rem", fontWeight: 700, color: accent || "var(--gold)", lineHeight: 1 }}>{value}</div>
    <div className="a-kicker" style={{ fontSize: "0.54rem", marginTop: 4 }}>{label}</div>
  </div>
);

// Convert hex accent to a translucent rgba.
function tint(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function uid(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 8); }

Object.assign(window, {
  useAtlasStore, Modal, Toggle, Field, Segmented, Kebab, PanelHead, MiniStat, tint, uid, ATLAS_KEY,
});
