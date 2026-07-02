# Desktop build (The Atlas — Electron + NSIS)

`desktop/` is the electron-builder project. Layout expected at build time:

```
desktop/
  main.js            ← Electron wrapper (bump the BUILD constant every build)
  package.json       ← electron-builder NSIS config (this file)
  scripts/setIcon.js ← afterPack icon stamp via resedit (signAndEditExecutable:false)
  build/icon.ico
  app/               ← the app payload = repo root files:
                       "The Atlas.html", "README - BETA.txt", core/, campaigns/
  electron-dist/     ← unpacked Electron 32.3.3 win-x64 dist (referenced by
                       build.electronDist; obtain by extracting a previous
                       installer: 7z x Setup.exe → 7z x '$PLUGINSDIR/app-64.7z',
                       drop resources/app + app.asar, rename "The Atlas.exe" →
                       electron.exe)
```

Egress-blocked environments (GitHub 403): seed the electron-builder cache
instead of downloading —

- `~/.cache/electron-builder/nsis/nsis-3.0.4.1/`: `Contrib`, `Include`,
  `Plugins`, `Stubs` from apt's `nsis` (/usr/share/nsis), `linux/makensis`
  from /usr/bin/makensis, and `elevate.exe` from a previous installer's
  resources/.
- `~/.cache/electron-builder/nsis/nsis-resources-3.4.1/plugins/x86-unicode/`:
  the DLLs from a previous installer's extracted `$PLUGINSDIR`
  (StdUtils, System, UAC, WinShell, nsDialogs, nsExec, nsis7z).
- `npm install` with `ELECTRON_SKIP_BINARY_DOWNLOAD=1` (electronDist makes the
  zip unnecessary).

Build:

```
export WINEPREFIX=/root/.wine32 WINEARCH=win32 WINEDEBUG=-all   # wine32 via apt
npx electron-builder --win nsis
```

Deliver: split dist/The-Atlas-Setup-*.exe into 25 MB parts
(`split -b 25000000 -d … AtlasSetup.part`), verify sha256 after `cat`-ing the
parts back together. Reassemble on Windows:
`copy /b AtlasSetup.part00+part01+part02+part03 AtlasSetup.exe`.

Version history: v15 = authoritative feature base · v16 = v15 + tag bump ·
v17 = v15 + Librarian import fixes (flex-shrink card crush, pdf.js lazy-load).
