// atlas-bestiary.jsx — Atlas-level shared creature library (the Forge's new home).
//
// One global pool, stored under the un-namespaced localStorage key
// `atlas_bestiary_v1`. Every campaign mirrors this pool (read-only) into its own
// state on load, so the Encounter Builder "pulls from the Atlas". Editing happens
// only here, by opening the Forge — campaigns can't change it.

const ATLAS_BESTIARY_KEY = "atlas_bestiary_v1";
// The slices of campaign state that make up the bestiary.
const BESTIARY_SLICES = ["divineBeasts", "homebrewMonsters", "bestiaryCreatures", "bestiaryCats", "bestiaryHidden", "dbCategories"];
// The Forge runs the shared engine under its own dedicated save namespace.
const BESTIARY_NS = "atlasBestiary::";
const ENGINE_FILE = "campaigns/The Shattered Isles/The Shattered Isles - My Campaign.html";

function atlasReadBestiary() {
  try { return JSON.parse(localStorage.getItem(ATLAS_BESTIARY_KEY) || "null"); } catch (e) { return null; }
}

// One-time seed: if the global library doesn't exist yet, lift the canonical
// Shattered Isles bestiary up into it. (The Atlas has no namespace shim, so it
// reads the campaign's raw "siCampaign::si_state_v2" key directly.)
function atlasMigrateBestiary() {
  if (atlasReadBestiary()) return;
  try {
    const raw = localStorage.getItem("siCampaign::si_state_v2");
    if (!raw) { localStorage.setItem(ATLAS_BESTIARY_KEY, "{}"); return; }
    const st = JSON.parse(raw);
    const out = {};
    BESTIARY_SLICES.forEach(k => { if (st[k] !== undefined) out[k] = st[k]; });
    localStorage.setItem(ATLAS_BESTIARY_KEY, JSON.stringify(out));
  } catch (e) {}
}

function atlasBestiaryCounts() {
  const g = atlasReadBestiary() || {};
  const divine = (g.divineBeasts || []).length;
  const homebrew = (g.homebrewMonsters || []).length;
  const bc = g.bestiaryCreatures || {};
  let customCreatures = 0, customGroups = 0;
  Object.keys(bc).forEach(k => { const n = (bc[k] || []).length; customCreatures += n; if (n > 0) customGroups++; });
  return { divine, homebrew, customCreatures, customGroups, total: divine + homebrew + customCreatures };
}

function forgeSrc() {
  return encodeURI(ENGINE_FILE) +
    "?mode=forge&ns=" + encodeURIComponent(BESTIARY_NS) +
    "&world=" + encodeURIComponent("The Atlas Bestiary") +
    "&as=dm";
}

function openTheForge() { window.location.href = forgeSrc(); }

// Atlas-styled veil shown while the embedded Forge boots. Fully opaque so the
// campaign UI never shows through during boot.
const BestiaryLoading = () => (
  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, backgroundColor: "var(--bg)", backgroundImage: "radial-gradient(120% 120% at 50% 35%, rgba(200,160,80,0.08), rgba(6,9,15,0) 70%)", zIndex: 5 }}>
    <div style={{ color: "var(--gold)", animation: "spin 2.4s linear infinite" }}><Sigil name="claw" size={52} stroke={1} /></div>
    <div style={{ textAlign: "center" }}>
      <div className="a-kicker" style={{ marginBottom: 8 }}>Shared Library</div>
      <div className="a-display" style={{ fontSize: "1.4rem", color: "var(--bone)" }}>Opening the Forge</div>
    </div>
    <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
  </div>
);

const BestiaryTab = () => {
  // Seed the shared library from the canonical campaign on first view (idempotent).
  atlasMigrateBestiary();
  const [ready, setReady] = React.useState(false);
  const frameRef = React.useRef(null);

  React.useEffect(() => {
    const f = frameRef.current;
    if (!f) return;
    let done = false;
    const reveal = () => { if (done) return; done = true; setReady(true); };
    // Reveal only once the Forge has booted into the rendered Bestiary, so the
    // user never sees the campaign UI flash through during boot.
    const ready = () => {
      try {
        const d = f.contentDocument;
        if (!d) return false;
        if (d.documentElement.getAttribute("data-atlas-mode") !== "forge") return false;
        const panel = d.getElementById("tab-divine-beasts");
        const subnav = d.getElementById("db-subnav");
        return !!(panel && panel.classList.contains("active") && subnav && subnav.childElementCount > 0);
      } catch (e) { return false; }
    };
    const iv = setInterval(() => { if (ready()) { clearInterval(iv); reveal(); } }, 120);
    // Safety net so the veil never sticks if something goes sideways.
    const t = setTimeout(() => { clearInterval(iv); reveal(); }, 7000);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)" }}>
      <iframe
        ref={frameRef}
        title="The Atlas Bestiary"
        src={forgeSrc()}
        style={{ width: "100%", height: "100%", border: 0, display: "block", background: "var(--bg)" }}
      />
      {!ready && <BestiaryLoading />}
    </div>
  );
};
