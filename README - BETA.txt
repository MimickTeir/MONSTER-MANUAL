THE ATLAS — Shattered Isles Campaign  ·  BETA (2026-06-30)
============================================================

WHAT'S IN THIS BUILD
  - The Atlas.html ................ the launcher / campaign hub
  - campaigns/The Shattered Isles/ . the campaign app + art assets
  - core/ ........................ shared engine scripts (do not move)

Keep this folder structure intact — the files reference each other by
relative path. Moving a file out on its own will break it.


HOW TO OPEN IT
------------------------------------------------------------
Two ways, depending on what you want to do:

1) JUST THE CAMPAIGN (quickest)
   Double-click:
     campaigns/The Shattered Isles/The Shattered Isles - My Campaign.html
   This opens directly in your browser. An internet connection is only
   needed for the display fonts and the PDF-import feature; everything
   else works offline. Your data saves to that browser via localStorage.

2) THE FULL LAUNCHER (The Atlas hub + Forge mode)
   The Atlas.html must be served from a local web server — opening it by
   double-click will show a blank page (browsers block its scripts on
   file://). From inside this folder, run ONE of:

     Python:   python3 -m http.server 4500
     Node:     npx http-server -p 4500

   Then visit:  http://localhost:4500/The%20Atlas.html


CHANGES IN THIS BETA
------------------------------------------------------------
  - Lore Codex now renders **bold** / *italic* markdown formatting.
  - "Add Character" picker now closes after creating a blank sheet.
  - Restored the missing ship-interior background art.
  - Map tab re-added to the navigation as a placeholder
    (full map feature is still being reworked).

NOTE: This is a beta. Save/back up anything important — localStorage is
tied to the specific browser and folder location you open it from.
