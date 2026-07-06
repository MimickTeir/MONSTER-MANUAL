// The Atlas — desktop wrapper + built-in game host (Foundry-style).
//
// The DM window loads over a FIXED custom protocol (app://atlas/…) so its origin —
// and therefore its localStorage — never changes between launches (all campaign data
// lives there). Alongside it we run a real HTTP server bound to the LAN on a fixed
// port so PLAYERS can join from a browser on the same network (or over the internet if
// the DM forwards the port / tunnels, exactly like Foundry).
//
// Both transports serve a shared /api/state endpoint backed by per-campaign files in
// userData, so the DM (app://) and players (http://<lan-ip>:PORT) stay in sync.

const { app, BrowserWindow, protocol, shell, Menu, net, session, ipcMain, dialog } = require('electron');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { pathToFileURL } = require('url');

// Bump every build. Injected (from main.js, which the installer always replaces) as a
// visible tag + window.__ATLAS_BUILD so the running version is unambiguous.
const BUILD = 'v28 · 2026-07-06';

const SCHEME = 'app';
const HOST = 'atlas';
const ORIGIN = `${SCHEME}://${HOST}`;
const HTTP_PORT = 30000;            // preferred LAN port (Foundry uses 30000)
let   ACTUAL_PORT = HTTP_PORT;      // resolved after listen (may differ if 30000 is busy)

const APP_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, 'app');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

function resolveSafe(urlPath) {
  let p = decodeURIComponent((urlPath || '/').split('?')[0].split('#')[0]);
  if (p === '/' || p === '') p = '/The Atlas.html';
  const filePath = path.normalize(path.join(APP_ROOT, p));
  if (!filePath.startsWith(APP_ROOT)) return null; // block traversal
  return filePath;
}

// ── Shared game-state store (the /api/state backend) ──────────────────────
// One JSON file per campaign namespace, so multiple campaigns don't collide.
const STATE_DIR = path.join(app.getPath('userData'), 'atlas-states');
function _stateFile(ns) {
  const safe = String(ns || 'default').replace(/[^a-zA-Z0-9_.:-]/g, '_') || 'default';
  return path.join(STATE_DIR, safe + '.json');
}
function getState(ns) { try { return fs.readFileSync(_stateFile(ns), 'utf8'); } catch (e) { return '{}'; } }
function setState(ns, body) { try { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(_stateFile(ns), body); return true; } catch (e) { return false; } }

// Build the small HTML build-tag + global injected into every served page.
function buildTag() {
  const host = { ip: lanIp(), port: ACTUAL_PORT };
  return '<div id="__atlas_build" style="position:fixed;bottom:2px;left:5px;z-index:2147483647;font:10px/1 monospace;color:#c9a84c;opacity:.45;pointer-events:none;user-select:none">Atlas ' + BUILD + '</div>'
    + '<script>window.__ATLAS_BUILD=' + JSON.stringify(BUILD) + ';window.__ATLAS_HOST=' + JSON.stringify(host) + ';window.__ATLAS_HTTP_PORT=' + ACTUAL_PORT + ';try{console.log("[Atlas] build",window.__ATLAS_BUILD,"host",window.__ATLAS_HOST);}catch(e){}</script>';
}

// ── Custom-protocol handler (the DM window) ───────────────────────────────
function registerProtocol() {
  protocol.handle(SCHEME, async (request) => {
    try {
      const u = new URL(request.url);
      // Shared state API (relative /api/state from the campaign).
      if (u.pathname === '/api/state') {
        const ns = u.searchParams.get('ns') || 'default';
        if (request.method === 'POST') {
          const body = await request.text();
          setState(ns, body);
          return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
        }
        return new Response(getState(ns), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
      }
      const filePath = resolveSafe(u.pathname);
      if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        return new Response('Not found', { status: 404 });
      }
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html') {
        let html = fs.readFileSync(filePath, 'utf8');
        const tag = buildTag();
        html = html.includes('</body>') ? html.replace(/<\/body>(?![\s\S]*<\/body>)/, tag + '</body>') : (html + tag);
        return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
      }
      const res = await net.fetch(pathToFileURL(filePath).toString());
      const headers = new Headers(res.headers);
      if (MIME[ext]) headers.set('content-type', MIME[ext]);
      headers.set('cache-control', 'no-store');
      return new Response(res.body, { status: 200, headers });
    } catch (e) {
      return new Response('Server error: ' + e.message, { status: 500 });
    }
  });
}

// ── LAN HTTP server (players join from a browser) ─────────────────────────
function startHttpServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://localhost');
        // CORS: allow browsers on the LAN.
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        if (u.pathname === '/api/state') {
          const ns = u.searchParams.get('ns') || 'default';
          if (req.method === 'POST') {
            let body = '';
            req.on('data', c => { body += c; if (body.length > 60 * 1024 * 1024) req.destroy(); });
            req.on('end', () => { setState(ns, body); res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end('{"ok":true}'); });
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(getState(ns));
          return;
        }

        // Players connect over HTTP; the Atlas launcher (campaign shelf) is DM-only.
        // They should only ever open the campaign link their GM shares.
        if (u.pathname === '/' || /\/The Atlas\.html$/i.test(decodeURIComponent(u.pathname))) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end('<!doctype html><meta charset="utf-8"><title>The Atlas — Player Link</title><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#0d0b14;color:#c9a84c;font-family:system-ui,sans-serif;text-align:center"><div><div style="font-size:2rem">⚓ The Atlas</div><p style="color:#9a8f7a;max-width:26rem;line-height:1.5">Open the campaign link your Game Master shared with you — this address hosts their live game.</p></div></body>');
          return;
        }

        const filePath = resolveSafe(u.pathname);
        if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.html') {
          let html = fs.readFileSync(filePath, 'utf8');
          const tag = buildTag();
          html = html.includes('</body>') ? html.replace(/<\/body>(?![\s\S]*<\/body>)/, tag + '</body>') : (html + tag);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(html); return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) { try { res.writeHead(500); res.end('err'); } catch (_) {} }
    });
    server.on('error', (e) => {
      if (e && e.code === 'EADDRINUSE' && ACTUAL_PORT < HTTP_PORT + 20) { ACTUAL_PORT++; setTimeout(() => server.listen(ACTUAL_PORT, '0.0.0.0'), 40); }
      else resolve(null);
    });
    server.listen(ACTUAL_PORT, '0.0.0.0', () => { ACTUAL_PORT = server.address().port; resolve(server); });
  });
}

// First non-internal IPv4 address (for the player share link).
function lanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return '127.0.0.1';
}

// Expose host info to the renderer (host panel builds the share link from this).
ipcMain.handle('atlas-host-info', () => ({ ip: lanIp(), port: ACTUAL_PORT, build: BUILD }));

// After a native alert()/confirm() the renderer widget is left unfocused
// (electron#20400) — typing dies until the window is refocused. The pages call
// this (via preload) right after each dialog; a blur+focus cycle resets it.
ipcMain.handle('atlas-fix-focus', (e) => {
  try {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win && !win.isDestroyed()) { win.blur(); win.focus(); win.webContents.focus(); }
  } catch (err) {}
});

// Public IP for the host panel's remote (port-forwarded) player link.
ipcMain.handle('atlas-public-ip', async () => {
  try {
    const res = await net.fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json();
    return (j && typeof j.ip === 'string') ? j.ip : null;
  } catch (e) { return null; }
});

// ── Windows Firewall ────────────────────────────────────────────────────────
// Inbound to the game port is blocked unless the app is allowed through the
// firewall — the #1 reason "players can't join / port forwarding doesn't
// work". If Windows' own first-run prompt was dismissed (or the network is
// marked Public), nothing ever asks again. On startup, if our rule is
// missing, offer to add one (a single UAC consent); "Not now" is remembered.
function ensureFirewallRule(win) {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  const RULE = 'The Atlas Game Host';
  const marker = path.join(app.getPath('userData'), 'firewall-declined');
  exec('netsh advfirewall firewall show rule name="' + RULE + '"', async (err, stdout) => {
    try {
      if (stdout && stdout.indexOf(RULE) !== -1) return;         // rule already present
      if (fs.existsSync(marker)) return;                          // user said "Not now"
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Allow connections', 'Not now'],
        defaultId: 0, cancelId: 1,
        title: 'Let players reach your table',
        message: 'Allow The Atlas through Windows Firewall?',
        detail: 'Players on your network — and remote players you port-forward for — connect to this PC on port ' + ACTUAL_PORT + '. ' +
                'Windows is currently free to block those connections. Click Allow and approve the one-time administrator prompt to add the firewall rule.',
      });
      if (response !== 0) { try { fs.writeFileSync(marker, 'declined'); } catch (e2) {} return; }
      const bat = path.join(app.getPath('userData'), 'atlas-firewall.bat');
      fs.writeFileSync(bat,
        '@echo off\r\n' +
        'netsh advfirewall firewall delete rule name="' + RULE + '" >nul 2>&1\r\n' +
        'netsh advfirewall firewall add rule name="' + RULE + '" dir=in action=allow program="' + process.execPath + '" enable=yes profile=any\r\n');
      exec('powershell -NoProfile -Command "Start-Process -FilePath \'' + bat.replace(/'/g, "''") + '\' -Verb RunAs -WindowStyle Hidden"');
    } catch (e3) {}
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 680,
    backgroundColor: '#0d0b14', title: 'The Atlas', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.loadURL(`${ORIGIN}/The%20Atlas.html`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ORIGIN)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  return win;
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try { await session.defaultSession.clearCache(); } catch (e) {}
  registerProtocol();
  await startHttpServer();          // players can now join at http://<lan-ip>:ACTUAL_PORT
  const mainWin = createWindow();
  ensureFirewallRule(mainWin);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
