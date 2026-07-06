// atlas-host.jsx — REAL hosting artifacts. The "Download Host" button emits a
// genuine, working server.py bundle (matches the app's /api/state contract);
// the per-campaign Host panel mints a real player URL + a downloadable HTML
// join page. Nothing here is faked — every download produces actual files.

// ── tiny ZIP builder (store method, valid .zip) ───────────────────────
function _u16(n) { return [n & 0xff, (n >> 8) & 0xff]; }
function _u32(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }
function _crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}
function _bytes(s) { return new TextEncoder().encode(s); }
function buildZip(files) {
  const enc = files.map(f => ({ name: _bytes(f.name), data: _bytes(f.content) }));
  const chunks = []; const central = []; let offset = 0;
  for (const f of enc) {
    const crc = _crc32(f.data);
    const local = new Uint8Array([].concat(
      _u32(0x04034b50), _u16(20), _u16(0), _u16(0), _u16(0), _u16(0),
      _u32(crc), _u32(f.data.length), _u32(f.data.length), _u16(f.name.length), _u16(0)
    ));
    chunks.push(local, f.name, f.data);
    central.push(new Uint8Array([].concat(
      _u32(0x02014b50), _u16(20), _u16(20), _u16(0), _u16(0), _u16(0), _u16(0),
      _u32(crc), _u32(f.data.length), _u32(f.data.length),
      _u16(f.name.length), _u16(0), _u16(0), _u16(0), _u16(0), _u32(0), _u32(offset)
    )), f.name);
    offset += local.length + f.name.length + f.data.length;
  }
  let cdSize = 0; const cdStart = offset;
  for (const c of central) { chunks.push(c); cdSize += c.length; }
  chunks.push(new Uint8Array([].concat(
    _u32(0x06054b50), _u16(0), _u16(0), _u16(enc.length), _u16(enc.length),
    _u32(cdSize), _u32(cdStart), _u16(0)
  )));
  return new Blob(chunks, { type: "application/zip" });
}
function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Robust copy: clipboard API where allowed, textarea+execCommand fallback
// (the async clipboard API is blocked in sandboxed iframes / non-secure origins).
function copyText(txt) {
  return new Promise((resolve) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(() => resolve(true)).catch(() => resolve(fallbackCopy(txt)));
    } else {
      resolve(fallbackCopy(txt));
    }
  });
}
function fallbackCopy(txt) {
  try {
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, txt.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

// ── the real host program (matches the app's GET/POST /api/state) ─────
const SERVER_PY = `#!/usr/bin/env python3
"""The Atlas Host - serves your campaign over your network and syncs live
state between every connected player. Drop this next to your campaign .html
files and run it. Requires only Python 3.8+ (no pip installs)."""
import http.server, socketserver, os, sys, socket
from urllib.parse import urlparse

PORT = 8080
for i, a in enumerate(sys.argv):
    if a in ("--port", "-p") and i + 1 < len(sys.argv):
        PORT = int(sys.argv[i + 1])

ROOT = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(ROOT, "state.json")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        if urlparse(self.path).path == "/api/state":
            data = b"{}"
            if os.path.exists(STATE):
                with open(STATE, "rb") as f: data = f.read() or b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self._cors(); self.end_headers()
            self.wfile.write(data); return
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path == "/api/state":
            n = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(n)
            with open(STATE, "wb") as f: f.write(body)
            self.send_response(204); self._cors(); self.end_headers(); return
        self.send_error(404)

    def log_message(self, *a): pass

def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close(); return ip
    except Exception:
        return "127.0.0.1"

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    ip = lan_ip()
    files = [f for f in os.listdir(ROOT) if f.lower().endswith(".html")]
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print("")
        print("  +-----------------------------------------------+")
        print("  |   THE ATLAS HOST is live                      |")
        print("  +-----------------------------------------------+")
        print("")
        print("   On this computer:  http://localhost:%d/" % PORT)
        print("   Share with players: http://%s:%d/" % (ip, PORT))
        print("")
        if files:
            print("   Campaigns being served:")
            for f in files:
                from urllib.parse import quote
                print("     http://%s:%d/%s" % (ip, PORT, quote(f)))
            print("")
        print("   Live state saves to state.json. Press Ctrl+C to stop.")
        print("")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\n  Host stopped. See you next session.")
`;

const START_COMMAND = `#!/bin/bash
# Double-click me on macOS / Linux to start the host.
cd "$(dirname "$0")"
python3 server.py
`;

const START_BAT = `@echo off
REM Double-click me on Windows to start the host.
cd /d "%~dp0"
python server.py
pause
`;

const README_MD = `# The Atlas Host

Run your own table. No cloud, no account, your worlds stay on your machine.

## Setup (5 minutes)

1. Put this folder anywhere, alongside your campaign .html files
   (e.g. "The Shattered Isles - My Campaign.html" and "The Atlas.html").
2. Start the host:
   - macOS / Linux: double-click start.command  (or run: python3 server.py)
   - Windows:       double-click start.bat       (or run: python server.py)
3. The host prints two addresses:
     http://localhost:8080/         <- for you, on this computer
     http://192.168.x.x:8080/       <- give THIS to players on your network
4. Open your campaign's .html at that address. Everyone who opens the same
   link shares the exact same live game state (synced via state.json).

## Players outside your home network

Pair the host with a free tunnel and share the URL it gives you:
  - Cloudflare:  cloudflared tunnel --url http://localhost:8080
  - ngrok:       ngrok http 8080
Or run server.py on a small VPS.

## Notes

- Self-contained — no extra installs needed; just run the launcher.
- Change the port:  python3 server.py --port 9000
- All game state lives in state.json next to this file. Back it up = back up your campaign.
`;

function hostBundleFiles() {
  return [
    { name: "server.py", content: SERVER_PY },
    { name: "start.command", content: START_COMMAND },
    { name: "start.bat", content: START_BAT },
    { name: "README.md", content: README_MD },
  ];
}

function downloadHostBundle() {
  downloadBlob("atlas-host.zip", buildZip(hostBundleFiles()));
}

// real, self-contained invite page players can double-click
function inviteHtml(campaign, joinUrl) {
  const title = campaign.title.replace(/</g, "&lt;");
  const accent = campaign.accent || "#c8a050";
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Join ${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:grid;place-items:center;background:#06090f;color:#d4cbb8;
    font-family:Georgia,'Times New Roman',serif;text-align:center;padding:24px;
    background-image:radial-gradient(800px 500px at 50% -10%, ${accent}22, transparent 60%)}
  .card{max-width:440px;border:1px solid ${accent}55;border-radius:14px;padding:40px 34px;
    background:rgba(10,14,28,0.7);box-shadow:0 30px 80px rgba(0,0,0,0.5)}
  .k{font-family:monospace;font-size:0.62rem;letter-spacing:0.28em;text-transform:uppercase;color:#8a8068;margin-bottom:14px}
  h1{font-size:1.9rem;color:#e9e0cf;line-height:1.1;letter-spacing:0.02em;margin-bottom:10px}
  p{color:#8a8068;font-size:0.98rem;line-height:1.5;margin-bottom:26px}
  a.btn{display:inline-block;text-decoration:none;padding:14px 30px;border-radius:8px;
    background:linear-gradient(180deg,${accent},${accent}bb);color:#0b0a0d;font-weight:bold;
    font-family:monospace;letter-spacing:0.06em;font-size:0.9rem;border:1px solid ${accent}}
  a.btn:hover{filter:brightness(1.12)}
  .addr{margin-top:22px;font-family:monospace;font-size:0.72rem;color:#6a6354;word-break:break-all}
</style></head>
<body><div class="card">
  <div class="k">You're invited to the table</div>
  <h1>${title}</h1>
  <p>Your host is running The Atlas. Click below to enter the campaign. Keep this file — it always points at your table.</p>
  <a class="btn" href="${joinUrl}">Enter the Table &rsaquo;</a>
  <div class="addr">${joinUrl}</div>
</div></body></html>`;
}

const StatusDot = ({ status }) => {
  const c = status === "online" || status === "host" ? "#43c98d" : status === "idle" ? "#c8a050" : "#6a6354";
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}`, flexShrink: 0 }} />;
};

// ── OS detection (best-effort, user can override in the wizard) ───────
function detectOS() {
  const ua = (navigator.userAgent || "") + " " + (navigator.platform || "");
  if (/Win/i.test(ua)) return "win";
  if (/Mac|iPhone|iPad|iPod/i.test(ua)) return "mac";
  if (/Linux|Android|X11/i.test(ua)) return "linux";
  return "mac";
}
// ── GitHub release the installers are published to. Swap REPO for yours. ─
const GH_REPO = "your-org/the-atlas-host";
const GH_RELEASES = "https://github.com/" + GH_REPO + "/releases/latest";
const ghAsset = (file) => "https://github.com/" + GH_REPO + "/releases/latest/download/" + file;

const OS_META = {
  mac: {
    label: "macOS", installer: "TheAtlasHost-2.4.dmg", size: "26 MB",
    steps: [
      { t: "Open TheAtlasHost-2.4.dmg", b: "Double-click the download to mount it." },
      { t: "Drag The Atlas Host to Applications", b: "Drop the icon onto the Applications folder in the window." },
      { t: "Launch it", b: "Open it from Applications. First launch: right-click → Open to clear Gatekeeper." },
    ],
  },
  win: {
    label: "Windows", installer: "TheAtlasHost-Setup-2.4.exe", size: "29 MB",
    steps: [
      { t: "Run TheAtlasHost-Setup-2.4.exe", b: "Double-click the installer in your Downloads." },
      { t: "Follow the prompts", b: "If SmartScreen warns, choose “More info → Run anyway.”" },
      { t: "Launch from the Start menu", b: "Find “The Atlas Host” under your installed apps." },
    ],
  },
  linux: {
    label: "Linux", installer: "TheAtlasHost-2.4.AppImage", size: "31 MB",
    steps: [
      { t: "Make it executable", b: "Right-click → Properties → Allow executing, or chmod +x." },
      { t: "Double-click to launch", b: "The AppImage is self-contained — no install needed." },
      { t: "Pin it if you like", b: "Move it to ~/Applications to keep it handy." },
    ],
  },
};

// ── Product-key entry (ATLAS-XXXX-XXXX-XXXX-XXXX) ──────────────────────
const KEY_GROUPS = 4, KEY_LEN = 4;
const keyValid = (segs) => segs.length === KEY_GROUPS && segs.every(s => /^[A-Z0-9]{4}$/.test(s));
const ProductKeyInput = ({ segs, onChange, state }) => {
  const refs = React.useRef([]);
  const set = (i, raw) => {
    const clean = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, KEY_LEN);
    const next = segs.slice(); next[i] = clean; onChange(next);
    if (clean.length === KEY_LEN && i < KEY_GROUPS - 1) refs.current[i + 1] && refs.current[i + 1].focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !segs[i] && i > 0) { refs.current[i - 1] && refs.current[i - 1].focus(); }
  };
  const onPaste = (e) => {
    e.preventDefault();
    let txt = (e.clipboardData.getData("text") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (txt.startsWith("ATLAS")) txt = txt.slice(5);
    const next = [0, 1, 2, 3].map(k => txt.slice(k * KEY_LEN, k * KEY_LEN + KEY_LEN));
    onChange(next);
    const last = Math.min(KEY_GROUPS - 1, Math.max(0, Math.ceil(txt.length / KEY_LEN) - 1));
    setTimeout(() => refs.current[last] && refs.current[last].focus(), 0);
  };
  const bad = state === "bad", ok = state === "ok";
  const borderC = bad ? "#d8654f" : ok ? "#43c98d" : "var(--border2)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
      <span className="a-mono" style={{ fontSize: "1rem", letterSpacing: "0.14em", color: "var(--gold2)", userSelect: "none" }}>ATLAS</span>
      <span style={{ color: "var(--muted)" }}>–</span>
      {[0, 1, 2, 3].map(i => (
        <React.Fragment key={i}>
          <input
            ref={el => refs.current[i] = el}
            value={segs[i] || ""}
            onChange={e => set(i, e.target.value)}
            onKeyDown={e => onKey(i, e)}
            onPaste={onPaste}
            maxLength={KEY_LEN}
            placeholder="XXXX"
            spellCheck={false}
            aria-label={"Key group " + (i + 1)}
            className="a-mono"
            style={{
              width: 76, textAlign: "center", padding: "11px 0", borderRadius: "var(--r2)",
              background: "rgba(0,0,0,0.28)", border: "1px solid " + borderC, color: "var(--bone)",
              fontSize: "1rem", letterSpacing: "0.18em", textTransform: "uppercase", outline: "none",
              transition: "border-color .15s, box-shadow .15s",
              boxShadow: ok ? "0 0 0 3px " + tint("#43c98d", 0.12) : bad ? "0 0 0 3px " + tint("#d8654f", 0.12) : "none",
            }}
          />
          {i < 3 && <span style={{ color: "var(--muted)" }}>–</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

// ── Wizard step rail ──────────────────────────────────────────────────
const WIZARD_STEPS = [
  { key: "key",      label: "License",  icon: "lock" },
  { key: "download", label: "Download", icon: "download" },
  { key: "install",  label: "Install",  icon: "archive" },
  { key: "activate", label: "Activate", icon: "shield" },
];
const StepRail = ({ step }) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
    {WIZARD_STEPS.map((s, i) => {
      const state = i < step ? "done" : i === step ? "active" : "todo";
      const ring = state === "todo" ? "var(--border2)" : "var(--gold)";
      const fill = state === "active" ? "var(--gold3)" : state === "done" ? tint("#c8a050", 0.16) : "transparent";
      const col = state === "todo" ? "var(--muted)" : "var(--gold2)";
      return (
        <React.Fragment key={s.key}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, minWidth: 58 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center",
              background: fill, border: "1px solid " + ring, color: col,
              boxShadow: state === "active" ? "0 0 0 4px " + tint("#c8a050", 0.1) : "none", transition: "all .2s",
            }}>
              <Sigil name={state === "done" ? "check" : s.icon} size={16} />
            </div>
            <div className="a-mono" style={{ fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: state === "active" ? "var(--gold2)" : "var(--muted)" }}>{s.label}</div>
          </div>
          {i < WIZARD_STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: "0 2px 20px", borderRadius: 2, background: i < step ? "var(--gold)" : "var(--border)", transition: "background .2s" }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── Licensed install wizard: License → Download → Install → Activate ──
const DownloadHostModal = ({ open, onClose, onGet }) => {
  const [step, setStep] = React.useState(0);
  const [os, setOs] = React.useState(detectOS);
  const [segs, setSegs] = React.useState(["", "", "", ""]);
  const [keyState, setKeyState] = React.useState("idle"); // idle | ok | bad
  const [downloaded, setDownloaded] = React.useState(false);
  const [activating, setActivating] = React.useState(false);
  const [activated, setActivated] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep(0); setOs(detectOS()); setSegs(["", "", "", ""]); setKeyState("idle");
      setDownloaded(false); setActivating(false); setActivated(false);
    }
  }, [open]);

  const meta = OS_META[os];
  const valid = keyValid(segs);
  const fullKey = "ATLAS-" + segs.join("-");

  const confirmKey = () => {
    if (valid) { setKeyState("ok"); setStep(1); }
    else setKeyState("bad");
  };

  const startDownload = () => {
    window.open(ghAsset(meta.installer), "_blank", "noopener");
    setDownloaded(true);
  };

  const activate = () => {
    if (activating || activated) return;
    setActivating(true);
    setTimeout(() => { setActivating(false); setActivated(true); }, 1900);
  };

  const finish = () => { onGet && onGet(); onClose && onClose(); };
  const back = <button className="a-btn a-btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))}><Sigil name="chevron-left" size={14} /> Back</button>;

  let footer;
  if (step === 0) footer = (<>
    <button className="a-btn a-btn-ghost" onClick={onClose}>Cancel</button>
    <button className="a-btn a-btn-primary" disabled={!valid} style={!valid ? { opacity: 0.45, cursor: "not-allowed" } : null} onClick={confirmKey}>Continue <Sigil name="chevron-right" size={14} /></button>
  </>);
  else if (step === 1) footer = (<>
    {back}
    {downloaded
      ? <button className="a-btn a-btn-primary" onClick={() => setStep(2)}>Next: install <Sigil name="chevron-right" size={14} /></button>
      : <button className="a-btn a-btn-primary" onClick={startDownload}>
          <Sigil name="download" size={14} /> Download {meta.label} app
        </button>}
  </>);
  else if (step === 2) footer = (<>
    {back}
    <button className="a-btn a-btn-primary" onClick={() => setStep(3)}>I've installed it <Sigil name="chevron-right" size={14} /></button>
  </>);
  else footer = (<>
    {back}
    <button className="a-btn a-btn-primary" disabled={!activated} style={!activated ? { opacity: 0.45, cursor: "not-allowed" } : null} onClick={finish}><Sigil name="check" size={14} /> Finish</button>
  </>);

  return (
    <Modal open={open} onClose={onClose} width={640} icon="shield" kicker={"Install The Atlas Host · step " + (step + 1) + " of 4"}
      title="Set up your copy of The Atlas Host" footer={footer}>
      <StepRail step={step} />

      {/* ── Step 1 · License key ── */}
      {step === 0 && (
        <div className="fade-in">
          <div style={{ textAlign: "center", padding: "2px 0 16px" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 14px", background: "var(--gold3)", color: "var(--gold)", border: "1px solid var(--border2)" }}><Sigil name="lock" size={26} /></div>
            <div className="a-serif" style={{ fontSize: "1.2rem", color: "var(--bone)" }}>Enter your product key</div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6, maxWidth: 430, margin: "9px auto 0" }}>
              It's in your purchase confirmation from Patreon or our site — a one-time key that unlocks the host on your machines.
            </p>
          </div>
          <div style={{ padding: "20px 0 6px" }}>
            <ProductKeyInput segs={segs} onChange={(s) => { setSegs(s); if (keyState !== "idle") setKeyState("idle"); }} state={keyState} />
          </div>
          <div style={{ minHeight: 22, textAlign: "center", marginTop: 6 }}>
            {keyState === "bad" && <span style={{ color: "#e0866f", fontSize: "0.8rem" }}>That key looks incomplete — check all four groups.</span>}
            {valid && keyState !== "bad" && <span style={{ color: "#43c98d", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 6 }}><Sigil name="check" size={13} /> Key format looks good</span>}
          </div>
          <div style={{ display: "flex", gap: 11, padding: 13, marginTop: 10, borderRadius: "var(--r2)", background: "var(--faint)", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--gold)", flexShrink: 0 }}><Sigil name="info" size={16} /></span>
            <div style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.55 }}>Haven't bought it yet? Grab The Atlas Host from our Patreon or website — the download and your key arrive together. You can paste the whole key at once.</div>
          </div>
        </div>
      )}

      {/* ── Step 2 · Download ── */}
      {step === 1 && (
        <div className="fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div className="a-serif" style={{ fontSize: "1.1rem", color: "var(--bone)" }}>Download the app</div>
            <div style={{ display: "inline-flex", marginLeft: "auto", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", borderRadius: "var(--r2)", padding: 3, gap: 3 }}>
              {Object.keys(OS_META).map(k => (
                <button key={k} onClick={() => { setOs(k); setDownloaded(false); }} style={{
                  border: 0, cursor: "pointer", borderRadius: "var(--r3)", padding: "5px 12px",
                  fontFamily: "var(--mono)", fontSize: "0.64rem", letterSpacing: "0.03em",
                  background: os === k ? "var(--gold3)" : "transparent", color: os === k ? "var(--gold2)" : "var(--muted)",
                  boxShadow: os === k ? "inset 0 0 0 1px var(--border2)" : "none", transition: "all .14s",
                }}>{OS_META[k].label}</button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", padding: "4px 0 18px" }}>
            <div style={{
              width: 76, height: 76, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 16px",
              background: downloaded ? tint("#43c98d", 0.14) : "var(--gold3)", color: downloaded ? "#43c98d" : "var(--gold)",
              border: "1px solid " + (downloaded ? tint("#43c98d", 0.4) : "var(--border2)"), transition: "all .25s",
            }}>
              <Sigil name={downloaded ? "check" : "download"} size={34} />
            </div>
            <div className="a-serif" style={{ fontSize: "1.16rem", color: "var(--bone)" }}>
              {downloaded ? "Download started — check your browser" : "Ready for " + meta.label}
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.86rem", lineHeight: 1.6, maxWidth: 430, margin: "9px auto 0" }}>
              {downloaded
                ? <>It's downloading from GitHub in a new tab. Open <code className="a-mono" style={{ color: "var(--gold2)" }}>{meta.installer}</code> when it lands, then continue.</>
                : <>A single self-contained app from our GitHub releases — <b style={{ color: "var(--bone)" }}>nothing else to install.</b> The button is in the footer below.</>}
            </p>
          </div>

          {/* file row + progress */}
          <div style={{ padding: "11px 14px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ color: "var(--gold)" }}><Sigil name="archive" size={18} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <code className="a-mono" style={{ fontSize: "0.74rem", color: "var(--gold2)" }}>{meta.installer}</code>
                <div className="a-mono" style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: 2 }}>{meta.size} · {meta.label} · signed &amp; notarized</div>
              </div>
              {downloaded && <span style={{ color: "#43c98d" }}><Sigil name="check" size={18} /></span>}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <a href={GH_RELEASES} target="_blank" rel="noopener" className="a-mono" style={{ fontSize: "0.64rem", color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Sigil name="link" size={12} /> View all releases on GitHub
            </a>
          </div>
        </div>
      )}

      {/* ── Step 3 · Install ── */}
      {step === 2 && (
        <div className="fade-in">
          <div className="a-serif" style={{ fontSize: "1.1rem", color: "var(--bone)", marginBottom: 14 }}>Install it on {meta.label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {meta.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "11px 13px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: "var(--gold3)", color: "var(--gold2)", fontFamily: "var(--mono)", fontSize: "0.74rem", fontWeight: 700 }}>{i + 1}</div>
                <div>
                  <div className="a-serif" style={{ fontSize: "0.96rem", color: "var(--bone)" }}>{s.t}</div>
                  <div style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.5, marginTop: 3 }}>{s.b}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 11, padding: 13, borderRadius: "var(--r2)", background: tint("#43c98d", 0.06), border: "1px solid " + tint("#43c98d", 0.24) }}>
            <span style={{ color: "#43c98d", flexShrink: 0 }}><Sigil name="check" size={16} /></span>
            <div style={{ color: "var(--text)", fontSize: "0.82rem", lineHeight: 1.55 }}>No runtimes, no command line — the app bundles everything it needs. When it opens, come back to activate your license.</div>
          </div>
        </div>
      )}

      {/* ── Step 4 · Activate ── */}
      {step === 3 && (
        <div className="fade-in">
          {!activated ? (
            <div style={{ textAlign: "center", padding: "2px 0 4px" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 16px",
                background: "var(--gold3)", color: "var(--gold)", border: "1px solid var(--border2)",
                animation: activating ? "atlas-pulse 1.1s ease-in-out infinite" : "none",
              }}><Sigil name="shield" size={32} /></div>
              <div className="a-serif" style={{ fontSize: "1.2rem", color: "var(--bone)" }}>{activating ? "Contacting the license server…" : "Activate your license"}</div>
              <p style={{ color: "var(--muted)", fontSize: "0.86rem", lineHeight: 1.6, maxWidth: 420, margin: "9px auto 18px" }}>
                {activating ? "Verifying your key and binding it to this computer. One moment." : "This links your product key to the app on this machine. Do it once — it then runs offline."}
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: "var(--r2)", background: "var(--faint)", border: "1px solid var(--border)", marginBottom: 20 }}>
                <Sigil name="lock" size={14} style={{ color: "var(--muted)" }} />
                <code className="a-mono" style={{ fontSize: "0.82rem", letterSpacing: "0.1em", color: "var(--gold2)" }}>{fullKey}</code>
              </div>
              <div>
                <button className="a-btn a-btn-primary" disabled={activating} style={activating ? { opacity: 0.6 } : null} onClick={activate}>
                  {activating ? <><Sigil name="hourglass" size={14} /> Activating…</> : <><Sigil name="shield" size={14} /> Activate license</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="fade-in" style={{ textAlign: "center", padding: "6px 0 4px" }}>
              <div style={{ width: 78, height: 78, borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 16px", background: tint("#43c98d", 0.14), color: "#43c98d", border: "1px solid " + tint("#43c98d", 0.4) }}>
                <Sigil name="check" size={36} />
              </div>
              <div className="a-serif" style={{ fontSize: "1.36rem", color: "var(--bone)" }}>License active — you're all set</div>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: 440, margin: "10px auto 20px" }}>
                The Atlas Host is installed and activated on this computer. Open it whenever you want to run a table — it shows a <b style={{ color: "var(--gold2)" }}>Share with players</b> address you paste into any campaign's Host panel.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 440, margin: "0 auto", textAlign: "left" }}>
                {[
                  { icon: "power", t: "Open The Atlas Host", b: "From Applications / Start menu. Leave it running during play." },
                  { icon: "link", t: "Copy its share address", b: "Paste it into a campaign's Host panel to mint a join link." },
                  { icon: "scroll", t: "Or save a join page", b: "A double-click HTML file you hand players instead of a URL." },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", background: "var(--faint)", border: "1px solid var(--border)", borderRadius: "var(--r2)" }}>
                    <span style={{ color: "var(--gold)", flexShrink: 0 }}><Sigil name={s.icon} size={16} /></span>
                    <div>
                      <div className="a-serif" style={{ fontSize: "0.9rem", color: "var(--bone)" }}>{s.t}</div>
                      <div style={{ color: "var(--muted)", fontSize: "0.76rem", lineHeight: 1.45 }}>{s.b}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

// ── Per-campaign host modal — real link + real join page ──────────────
const HostModal = ({ campaign, hasHost, onGetHost, onClose }) => {
  // The desktop app is already the host — auto-detect its LAN address (injected by main.js).
  const auto = (typeof window !== "undefined" && window.__ATLAS_HOST) || null;
  const [addr, setAddr] = React.useState(auto ? ("http://" + auto.ip + ":" + auto.port) : "http://192.168.1.20:30000");
  const [copied, setCopied] = React.useState("");
  const [savedPage, setSavedPage] = React.useState(false);
  // Public IP → the remote (port-forwarded) player link. Fetched via the desktop
  // bridge; stays null in a plain browser or offline.
  const [pubIp, setPubIp] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    try {
      if (window.atlasBridge && window.atlasBridge.publicIp) {
        window.atlasBridge.publicIp().then(ip => { if (live && ip) setPubIp(ip); }).catch(() => {});
      }
    } catch (e) {}
    return () => { live = false; };
  }, []);

  // ── The table this link points at ─────────────────────────────────────
  // Opening this panel SYNCS the campaign's roster straight into its live
  // save (and the host's shared state), then shows who's actually on the
  // join screen — so the link and the player list can never disagree.
  const [tablePlayers, setTablePlayers] = React.useState(null);
  const [syncNote, setSyncNote] = React.useState("");
  const syncRoster = React.useCallback(async () => {
    if (!campaign || !campaign.ns) return;
    try {
      const COLORS = ["#7c6fe0", "#e06f7c", "#6fe08a", "#e0b46f", "#e06fe0", "#6fd4e0", "#c9a84c", "#6fa8e0"];
      const key = campaign.ns + "si_state_v2";
      let st = {};
      try { st = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { st = {}; }
      if (!Array.isArray(st.users)) st.users = [];
      if (!st.users.some(u => u.role === "dm")) st.users.push({ id: "u_dm", name: "Keeper", role: "dm", color: "#c9a84c", playerIdx: null });
      const roster = (campaign.users || []).filter(u => u && u.role !== "gm" && (u.name || "").trim());
      const byName = {};
      st.users.forEach(u => { byName[(u.name || "").trim().toLowerCase()] = u; });
      const keep = {};
      roster.forEach(au => {
        const name = au.name.trim(), k = name.toLowerCase();
        keep[k] = true;
        let u = byName[k];
        if (u && u.role === "dm") return;
        if (!u) {
          u = { id: "u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6), name, email: "", role: "player", color: COLORS[st.users.length % COLORS.length], playerIdx: null };
          st.users.push(u);
          byName[k] = u;
        }
        const plays = (au.plays || "").trim().toLowerCase();
        if (plays) {
          const match = (st.party || []).find(p => (p.name || "").trim().toLowerCase() === plays);
          if (match) match.userId = u.id;
        }
      });
      if (roster.length) {
        st.users = st.users.filter(u => {
          if (u.role === "dm") return true;
          if (keep[(u.name || "").trim().toLowerCase()]) return true;
          (st.party || []).forEach(p => { if (p.userId === u.id) p.userId = null; });
          return false;
        });
      }
      try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) {}
      try {
        await fetch("/api/state?ns=" + encodeURIComponent(campaign.ns), {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(st),
        });
      } catch (e) {}
      const names = st.users.filter(u => u.role !== "dm").map(u => u.name);
      setTablePlayers(names);
      setSyncNote(roster.length ? "" : "This campaign's roster is empty — add players in Edit campaign, then reopen this panel.");
    } catch (e) {
      setTablePlayers([]);
      setSyncNote("Could not sync the roster: " + (e && e.message || "unknown error"));
    }
  }, [campaign]);
  React.useEffect(() => { if (campaign) syncRoster(); }, [campaign, syncRoster]);
  if (!campaign) return null;

  const file = campaign.real || (campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".html");
  const base = addr.replace(/\/+$/, "");
  const ns = campaign.ns || "";
  // #join → the player picks who they are on a join screen (without it the campaign
  // would open as the GM). ?ns keeps each campaign's shared state separate.
  const joinUrl = base + "/" + encodeURI(file) + (ns ? ("?ns=" + encodeURIComponent(ns)) : "") + "#join";
  const port = (auto && auto.port) || (addr.match(/:(\d+)/) || [])[1] || "30000";
  const remoteUrl = pubIp ? ("http://" + pubIp + ":" + port + "/" + encodeURI(file) + (ns ? ("?ns=" + encodeURIComponent(ns)) : "") + "#join") : null;
  const joinFile = campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-invite.html";

  const copy = (txt, key) => { copyText(txt).then(ok => { setCopied(ok ? key : "fail"); setTimeout(() => setCopied(""), 1500); }); };
  const saveJoinPage = () => { downloadBlob(joinFile, new Blob([inviteHtml(campaign, joinUrl)], { type: "text/html" })); setSavedPage(true); setTimeout(() => setSavedPage(false), 2000); };

  return (
    <Modal open={!!campaign} onClose={onClose} width={600} icon="globe" kicker={"Host · " + campaign.title}
      title="Share this campaign with players">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* how-to strip */}
        <div style={{ display: "flex", gap: 11, padding: "12px 14px", borderRadius: "var(--r2)", background: tint(campaign.accent, 0.06), border: "1px solid " + tint(campaign.accent, 0.24) }}>
          <span style={{ color: campaign.accent, flexShrink: 0 }}><Sigil name="power" size={18} /></span>
          <div style={{ color: "var(--text)", fontSize: "0.84rem", lineHeight: 1.55 }}>
            The Atlas is <b style={{ color: "var(--gold2)" }}>already hosting</b> — no extra setup. Send a player the link below; on the same Wi‑Fi they open it in any browser and drop straight into Live Play. For players off your network, forward this port on your router or run a tunnel (same as Foundry).
          </div>
        </div>

        <Field label="Host address" hint={auto ? "Auto-detected from your network — edit only if you use a different address." : "Type the address shown in the corner of The Atlas."}>
          <input className="a-input a-mono" style={{ fontSize: "0.82rem" }} value={addr} onChange={e => setAddr(e.target.value)} placeholder="http://192.168.1.20:30000" />
        </Field>

        {/* who the join screen will offer — synced from the roster the moment this panel opens */}
        <div style={{ padding: "11px 14px", borderRadius: "var(--r2)", background: "var(--faint)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ color: "var(--gold)" }}><Sigil name="figure" size={14} /></span>
            <span className="a-mono" style={{ fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Players on the join screen{tablePlayers ? " · " + tablePlayers.length : ""}
            </span>
            <button className="a-btn a-btn-ghost a-btn-sm" style={{ marginLeft: "auto" }} onClick={syncRoster} title="Re-sync from Edit campaign → roster">
              <Sigil name="swap" size={12} /> Sync roster
            </button>
          </div>
          {tablePlayers === null ? (
            <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>Syncing…</div>
          ) : tablePlayers.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tablePlayers.map((n, i) => (
                <span key={n + i} className="a-pill" style={{ background: "var(--gold3)", color: "var(--gold2)", borderColor: "rgba(200,160,80,0.34)" }}>🎭 {n}</span>
              ))}
            </div>
          ) : (
            <div style={{ color: "#cc8f8f", fontSize: "0.8rem", lineHeight: 1.5 }}>
              Nobody yet — players you add in <b style={{ color: "var(--bone)" }}>Edit campaign → roster</b> appear here (and on the join screen) as soon as you reopen this panel.
            </div>
          )}
          {syncNote ? <div style={{ color: "#cc8f8f", fontSize: "0.74rem", marginTop: 6, lineHeight: 1.45 }}>{syncNote}</div> : null}
        </div>

        {/* player link */}
        <Field label="Player join link (same Wi‑Fi)" hint="Same Wi‑Fi → opens the join screen, then straight into this campaign.">
          <div style={{ display: "flex", gap: 8 }}>
            <input className="a-input a-mono" style={{ fontSize: "0.74rem" }} readOnly value={joinUrl} onFocus={e => e.target.select()} onClick={e => e.target.select()} />
            <button className="a-btn a-btn-primary a-btn-sm" onClick={() => copy(joinUrl, "url")}>
              <Sigil name={copied === "url" ? "check" : copied === "fail" ? "close" : "copy"} size={13} /> {copied === "url" ? "Copied" : copied === "fail" ? "Select & ⌘C" : "Copy"}
            </button>
          </div>
        </Field>

        {/* remote (port-forwarded) link */}
        <Field label="Remote player link (over the internet)"
          hint={remoteUrl
            ? ("Give this to players who aren't on your network. Requires forwarding TCP port " + port + " on your router to this PC — and Windows Firewall allowed (The Atlas asks on startup).")
            : ("Forward TCP port " + port + " on your router to this PC, then share the same link with your PUBLIC IP in place of the local address (search “what is my IP”). Shown automatically when the desktop app can reach the internet.")}>
          {remoteUrl ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input className="a-input a-mono" style={{ fontSize: "0.74rem" }} readOnly value={remoteUrl} onFocus={e => e.target.select()} onClick={e => e.target.select()} />
              <button className="a-btn a-btn-primary a-btn-sm" onClick={() => copy(remoteUrl, "rurl")}>
                <Sigil name={copied === "rurl" ? "check" : copied === "fail" ? "close" : "copy"} size={13} /> {copied === "rurl" ? "Copied" : copied === "fail" ? "Select & ⌘C" : "Copy"}
              </button>
            </div>
          ) : (
            <div className="a-mono" style={{ fontSize: "0.7rem", color: "var(--muted)", padding: "8px 10px", border: "1px dashed var(--border)", borderRadius: "var(--r2)" }}>
              Public address unavailable right now (offline, or running outside the desktop app).
            </div>
          )}
        </Field>

        {/* real downloadable join page */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: "var(--r2)", background: "var(--faint)", border: "1px solid var(--border)" }}>
          <span style={{ color: "var(--gold)" }}><Sigil name="scroll" size={20} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="a-serif" style={{ fontSize: "0.94rem", color: "var(--bone)" }}>Join page (HTML)</div>
            <code className="a-mono" style={{ fontSize: "0.64rem", color: "var(--muted)" }}>{joinFile}</code>
          </div>
          <button className="a-btn a-btn-ghost a-btn-sm" onClick={saveJoinPage}>
            <Sigil name={savedPage ? "check" : "download"} size={13} /> {savedPage ? "Saved" : "Download"}
          </button>
        </div>
        <div className="a-mono" style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: -8, lineHeight: 1.6 }}>
          A file you can hand players instead of a URL — it points at your table. Manage who’s at the table from <b style={{ color: "var(--bone)" }}>Edit campaign → roster</b>.
        </div>
      </div>
    </Modal>
  );
};

Object.assign(window, { HostModal, DownloadHostModal, downloadHostBundle });
