# Monster Manual — Worldbuilding Codex

A TTRPG worldbuilding tool for managing 1,200 creatures and 240 flora across 20 gods, 12 biomes, and challenge ratings 1–30. Cloud-synced via Firebase — edit on any device.

## Features

- **1,200 pre-populated real-world fauna** spread evenly across all types and CR 1–30
- **240 flora** — 20 plants per biome, one for each god domain
- **Full stat block editor** with auto-fill from Quick Monster Builder reference
- **Firebase cloud sync** — every edit saves instantly, works across phone/PC/tablet
- **Search & filter** by god, biome, classification, CR range, and name
- **Fauna tome** — browse by classification with full stat block display
- **Flora browser** — view and edit plants by biome and god
- **Offline fallback** — localStorage cache so you never lose work

## Firebase Setup (2 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** (any name, disable Analytics)
3. Sidebar: **Build → Realtime Database**
4. Click **Create Database**, pick any region, choose **Start in test mode**
5. Click **gear icon → Project Settings**
6. Scroll down, click **</>** (Web) to register a web app
7. Name it anything, **copy the firebaseConfig object**
8. Open the Monster Manual and paste the config when prompted

> **Test mode** rules expire after 30 days. To keep it permanent, go to Realtime Database → Rules and set:
> ```json
> {
>   "rules": {
>     ".read": true,
>     ".write": true
>   }
> }
> ```
> This is safe for a personal project only you use.

## Deploy to GitHub Pages

1. Create a new repo on GitHub
2. Upload `index.html`, `README.md`, and `.nojekyll`
3. **Settings → Pages → Source: main branch, / (root)**
4. Site goes live at `https://yourusername.github.io/repo-name/`

## Local Use

Just open `index.html` in any browser. No server needed.

## Tech

- React 18 + Babel (CDN, no build step)
- Firebase Realtime Database (free Spark plan)
- localStorage as offline cache
- Single file deployment (~200KB)
