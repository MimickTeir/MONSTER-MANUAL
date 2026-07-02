// ════════════════════════════════════════════════════════════════════════
//  librarian.js — The Librarian: a local (no-AI) archivist for the Codex
//  Drop-in module for The Shattered Isles campaign hub.
//
//  Reads the LIVE codex (state.loreEntries) the Lore tab renders, respecting
//  GM mode and per-entry reveals. Answers recall questions with clickable
//  citations, cross-checks the canon, and drafts entries that save straight
//  back into state.loreEntries in the exact shape the Codex uses.
//
//  Works against the bundled app's codex entry shape:
//    { id, title, subtitle, type (CODEX_DOC_TYPES id), bodyBlocks[], tags[],
//      collections[], revealed, status, ... }
//  …and stays backward-compatible with the older flat shape
//    { id, name, summary, body, type, revealed, paraReveals }.
//
//  Depends on globals the app already defines (all accessed defensively):
//    state, state.loreEntries, gmMode, currentTab, saveState(),
//    renderLore(), openLoreEntry(id), CODEX_TYPE_MAP / CODEX_DOC_TYPES,
//    _markdownToBlocks(), _countWords(), _firstPText(), _cxTrackRecent()
//
//  Load AFTER the app's main script (anywhere near the end of <body>):
//    <script src="librarian.js"></script>
//
//  Runs entirely in the browser — NO language model and NO network. Recall is
//  full-text search with field weighting; continuity is a structural audit of
//  links and stubs; the world brief and entry stubs are assembled from real
//  entries. Anything it files is created hidden, in the codex's own shape.
// ════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────────────────
  const CFG = Object.assign(
    { endpoint: null, maxContextEntries: 14, maxBodyChars: 1800 },
    window.LIBRARIAN_CONFIG || {}
  );

  // ── Safe global accessors ──────────────────────────────────────────────
  // The host app declares `state`, `gmMode`, `currentTab` with `let`, so they
  // are NOT window properties — but a sibling classic <script> shares the
  // global lexical scope, so we can read them by bare name behind try/catch.
  function appState() {
    try { return (typeof state !== "undefined" && state) || null; } catch (e) { return null; }
  }
  function entries() {
    const s = appState();
    return (s && Array.isArray(s.loreEntries) && s.loreEntries) || [];
  }
  function isGM() {
    try { return typeof gmMode !== "undefined" && !!gmMode; } catch (e) { return false; }
  }
  function onLoreTab() {
    try { return typeof currentTab !== "undefined" && currentTab === "lore"; } catch (e) { return false; }
  }
  function persist() {
    try { if (typeof saveState === "function") saveState(); } catch (e) {}
  }
  function typeMap() {
    try { if (typeof CODEX_TYPE_MAP !== "undefined" && CODEX_TYPE_MAP) return CODEX_TYPE_MAP; } catch (e) {}
    try { if (typeof LORE_TYPE_MAP !== "undefined" && LORE_TYPE_MAP) return LORE_TYPE_MAP; } catch (e) {}
    return {};
  }
  // Valid authorable type ids for the live codex (drop the synthetic "all").
  function codexTypeIds() {
    try {
      if (typeof CODEX_DOC_TYPES !== "undefined" && Array.isArray(CODEX_DOC_TYPES)) {
        return CODEX_DOC_TYPES.map((t) => t.id).filter((id) => id !== "all");
      }
    } catch (e) {}
    return ["location", "npc", "faction", "item", "concept", "event", "history"];
  }

  // ── Entry-shape normalisers (work for codex OR legacy entries) ──────────
  function eName(e)    { return (e && (e.title || e.name)) || "Untitled"; }
  function eSummary(e) { return (e && (e.subtitle || e.summary || e.excerpt)) || ""; }
  function eTags(e)    { return (e && Array.isArray(e.tags) && e.tags) || []; }
  function eTypeLabel(e) {
    const tm = typeMap();
    return (e && tm[e.type] && tm[e.type].label) || (e && e.type) || "Entry";
  }
  function eTypeIcon(e) {
    const tm = typeMap();
    return (e && tm[e.type] && tm[e.type].icon) || "✦";
  }
  // Flatten codex bodyBlocks (or a legacy markdown body) to plain markdown-ish text.
  function eBodyText(e) {
    if (!e) return "";
    if (Array.isArray(e.bodyBlocks) && e.bodyBlocks.length) {
      return e.bodyBlocks
        .map((b) => {
          const txt = (b && b.text) || "";
          if (b && b.kind === "h") return "## " + txt;
          if (b && b.kind === "callout") return "> " + txt;
          return txt;
        })
        .filter((s) => s.trim())
        .join("\n\n");
    }
    return e.body || "";
  }

  // Entries the current viewer is allowed to see.
  function visibleEntries() {
    const all = entries();
    if (isGM()) return all;
    return all.filter((e) => e.revealed || e.status === "canon");
  }

  // The text body a viewer may read (respects per-paragraph reveals if present).
  function readableBody(e) {
    const full = eBodyText(e);
    if (isGM()) return full;
    const pr = e && e.paraReveals;
    if (!pr || !Object.keys(pr).length) return full; // codex gates at entry level
    const paras = full.split(/\n\n+/).filter((p) => p.trim());
    return paras.filter((_, i) => pr[i]).join("\n\n");
  }

  function findByName(name) {
    const raw = (name || "").trim();
    const n = raw.toLowerCase();
    if (!n) return null;
    const vis = visibleEntries();

    // 1) exact title/name match.
    let hit = vis.find((e) => eName(e).toLowerCase() === n);
    if (hit) return hit;

    // 2) prefix-before-comma match — "Stephanie Gibi-san" → "Stephanie Gibi-san, High Chieftain".
    hit = vis.find((e) => {
      const en = eName(e).toLowerCase();
      return en === n || en.split(/[,—–(]/)[0].trim() === n;
    });
    if (hit) return hit;

    // 3) the citation is a longer phrase that starts with an entry's core name
    //    ("The Karruk Cog" → "The Karruk …"), or vice-versa (one contains the other).
    const core = (s) => s.toLowerCase().replace(/^the\s+/, "").split(/[,—–(]/)[0].trim();
    const nc = core(raw);
    if (nc.length >= 4) {
      hit = vis.find((e) => {
        const ec = core(eName(e));
        return ec.length >= 4 && (ec === nc || ec.startsWith(nc) || nc.startsWith(ec));
      });
      if (hit) return hit;
    }
    return null;
  }

  // ── Build the world-bible system prompt from real entries ──────────────
  function buildSystemPrompt(userText) {
    const vis = visibleEntries();

    // Compact index of everything the viewer can see.
    const index = vis
      .map((e) => `- ${eName(e)} [${eTypeLabel(e)}]${eSummary(e) ? " — " + eSummary(e) : ""}`)
      .join("\n");

    // Full bodies for the entries most relevant to the question.
    const q = (userText || "").toLowerCase();
    const qWords = q.split(/\W+/).filter((w) => w.length > 3);
    const scored = vis
      .map((e) => {
        const hay = (eName(e) + " " + eSummary(e) + " " + eBodyText(e) + " " + eTags(e).join(" ")).toLowerCase();
        let score = 0;
        qWords.forEach((w) => { if (hay.includes(w)) score += 1; });
        const nm = eName(e).toLowerCase();
        if (q && nm && q.includes(nm)) score += 5;
        return { e, score };
      })
      .sort((a, b) => b.score - a.score);

    const chosen = scored.filter((s) => s.score > 0).slice(0, CFG.maxContextEntries);
    // If nothing matched, include the most recently-updated handful for grounding.
    const fallback = vis.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 6);
    const bodies = (chosen.length ? chosen.map((s) => s.e) : fallback)
      .map((e) => {
        const body = readableBody(e).slice(0, CFG.maxBodyChars);
        return `### ${eName(e)} (${eTypeLabel(e)}${(e.revealed || e.status === "canon") ? "" : ", GM-only"})\n${body || "(no content yet)"}`;
      })
      .join("\n\n");

    const gmLine = isGM()
      ? "You are speaking to the GAME MASTER. You may reference GM-only entries and secrets."
      : "You are speaking to a PLAYER. NEVER reveal anything not in the entries below — they only contain revealed material. If asked about something hidden, say it is not yet recorded in the codex.";

    const types = codexTypeIds().join(", ");

    return [
      "You are THE LIBRARIAN — the AI archivist and co-creator of the world codex for the tabletop campaign \"The Shattered Isles\" (a grimdark post-apocalyptic sky-faring D&D 5e world).",
      "You speak calmly, precisely, a touch archaically — a senior archivist who has read every page. Keep answers tight: usually one short paragraph. Never use modern slang or emoji.",
      gmLine,
      "",
      "CITATION RULE: whenever a statement draws on a codex entry, cite it inline using double brackets exactly matching the entry's title, e.g. [[The Sundering]]. Only cite entries that appear in the list below — never invent entry names.",
      "",
      "AUTHORING RULE: when the keeper asks you to draft, expand, create, or stub a NEW entry (or rewrite an existing one), FIRST give a one-line note, THEN output a single fenced block tagged codex-entry containing JSON with keys: name, type (one of: " + types + "), summary (<=120 chars), body (markdown using ## headings), tags (array). Example:",
      "```codex-entry",
      '{"name":"Patch","type":"char","summary":"Defrocked engine-priest who keeps pirate keels flying.","body":"## Background\\n...","tags":["engineer","outlaw"]}',
      "```",
      "Do not output a codex-entry block unless authoring was requested.",
      "",
      "=== CODEX INDEX (everything currently visible) ===",
      index || "(the codex is empty)",
      "",
      "=== RELEVANT ENTRIES (full text) ===",
      bodies || "(no entries yet)",
    ].join("\n");
  }

  // ── The AI transport ───────────────────────────────────────────────────
  const LibrarianAI = {
    async complete({ system, messages }) {
      // 1) Prototype host (this environment).
      if (window.claude && typeof window.claude.complete === "function") {
        const prompt =
          system +
          "\n\n=== CONVERSATION ===\n" +
          messages.map((m) => (m.role === "user" ? "Keeper: " : "Librarian: ") + m.content).join("\n") +
          "\nLibrarian:";
        return await window.claude.complete(prompt);
      }
      // 2) Your own backend (set window.LIBRARIAN_CONFIG.endpoint).
      if (CFG.endpoint) {
        const res = await fetch(CFG.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ system, messages }),
        });
        if (!res.ok) throw new Error("Librarian endpoint error " + res.status);
        const data = await res.json();
        return data.reply || data.text || data.completion || "";
      }
      // 3) No transport available.
      throw new Error("no-transport");
    },
  };

  // ── Conversation state ──────────────────────────────────────────────────
  let convo = []; // {role:'user'|'assistant', content, raw}
  let busy = false;

  const QUICK_PROMPTS = [
    "Who holds power in the Isles?",
    "Audit the codex for loose ends",
    "Find: the Sundering",
    "Paste a passage → “file this”",
    "Give me a world brief",
  ];

  const OPENING =
    "The archive is open, keeper, and every page sits indexed beneath my hand. Ask me to **find** a name or thread, **audit** the canon for broken links and loose ends, assemble a **brief** for a newcomer, or **stub** a new page. Or simply **paste a passage and say *file this*** — I will read its shape, sort it to the right folio, and lay it out as a draft for you to keep. I answer only from what is written here — and I cite every source.";

  // ── DOM: styles ─────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("librarian-styles")) return;
    const css = `
    #lib-fab{position:fixed;right:22px;bottom:22px;z-index:9000;width:54px;height:54px;border-radius:50%;
      background:radial-gradient(circle at 32% 28%,#e8c878,#c8a050 55%,#7a5c22);color:#120c04;border:1px solid rgba(232,200,120,.5);
      cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.5rem;
      box-shadow:0 6px 26px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.35),inset 0 -3px 6px rgba(0,0,0,.4);
      transition:transform .18s,box-shadow .18s;}
    #lib-fab:hover{transform:scale(1.07);box-shadow:0 6px 30px rgba(0,0,0,.6),0 0 18px rgba(201,168,76,.35),inset 0 1px 0 rgba(255,255,255,.35);}
    #lib-fab .lib-badge{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;
      background:#a4322f;color:#fff;font:700 .62rem 'JetBrains Mono',monospace;display:flex;align-items:center;justify-content:center;
      border:2px solid #06090f;}
    #lib-panel{position:fixed;right:22px;bottom:22px;z-index:9001;width:400px;max-width:calc(100vw - 28px);height:600px;max-height:calc(100vh - 44px);
      background:rgba(8,11,20,.98);border:1px solid rgba(201,168,76,.28);border-radius:14px;display:none;flex-direction:column;overflow:hidden;
      box-shadow:0 30px 90px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(12px);}
    #lib-panel.open{display:flex;animation:libIn .2s ease;}
    @keyframes libIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    .lib-head{display:flex;align-items:center;gap:11px;padding:12px 12px 12px 15px;border-bottom:1px solid rgba(201,168,76,.16);
      background:linear-gradient(180deg,rgba(201,168,76,.07),transparent);}
    .lib-ava{width:38px;height:38px;border-radius:50%;flex-shrink:0;background:radial-gradient(circle at 32% 28%,#e8c878,#c8a050 55%,#7a5c22);
      display:flex;align-items:center;justify-content:center;color:#120c04;font-size:1.1rem;position:relative;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 -2px 4px rgba(0,0,0,.4);}
    .lib-ava .dot{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#43c98d;border:2px solid #080b14;box-shadow:0 0 6px #43c98d;}
    .lib-h-name{font-family:'Cinzel',serif;font-weight:700;font-size:.95rem;color:#e0c898;letter-spacing:.03em;line-height:1.1;}
    .lib-h-sub{font-family:'JetBrains Mono',monospace;font-size:.58rem;letter-spacing:.13em;text-transform:uppercase;color:#7a7060;margin-top:3px;}
    .lib-h-sub .ctx{color:#9a8348;}
    .lib-x{margin-left:auto;background:none;border:none;color:#7a7060;width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:1rem;}
    .lib-x:hover{color:#e0c898;background:rgba(255,255,255,.05);}
    .lib-body{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:13px;}
    .lib-body::-webkit-scrollbar{width:8px;}.lib-body::-webkit-scrollbar-thumb{background:rgba(201,168,76,.2);border-radius:4px;}
    .lib-msg{flex-shrink:0;max-width:88%;font-family:'Crimson Text',Georgia,serif;font-size:.95rem;line-height:1.6;}
    .lib-msg.lib-from{align-self:flex-start;background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.18);color:#d8ccb0;
      padding:11px 13px;border-radius:12px 12px 12px 3px;}
    .lib-msg.lib-you{align-self:flex-end;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#cfc6b4;
      padding:10px 13px;border-radius:12px 12px 3px 12px;}
    .lib-msg h3,.lib-msg h4{font-family:'Cinzel',serif;color:#c9a84c;margin:.5rem 0 .2rem;font-size:.95rem;}
    .lib-msg p{margin:.35rem 0;}
    .lib-msg strong{color:#e0c898;}
    .lib-msg em{color:#b0a080;}
    .lib-cite{color:#c9a84c;border-bottom:1px solid rgba(201,168,76,.45);cursor:pointer;}
    .lib-cite:hover{color:#e8c878;background:rgba(201,168,76,.1);}
    .lib-cite.dead{color:#6a5030;border-bottom:1px dotted #5a4020;cursor:default;}
    .lib-byline{font-family:'JetBrains Mono',monospace;font-size:.55rem;letter-spacing:.12em;text-transform:uppercase;color:#5a513f;margin-top:8px;}
    .lib-typing{align-self:flex-start;display:flex;gap:5px;padding:12px 14px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.16);border-radius:12px 12px 12px 3px;}
    .lib-typing i{width:6px;height:6px;border-radius:50%;background:#c9a84c;animation:libPulse 1.2s infinite;}
    .lib-typing i:nth-child(2){animation-delay:.15s}.lib-typing i:nth-child(3){animation-delay:.3s}
    @keyframes libPulse{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
    /* draft entry card */
    /* flex-shrink:0 — cards are flex children of the scrollable .lib-body column;
       their overflow:hidden zeroes the automatic min-height, so without it the
       column CRUSHES them to a sliver (hiding "File all"/"Add to codex") instead
       of scrolling. */
    .lib-draft{flex-shrink:0;align-self:flex-start;width:88%;background:rgba(10,14,28,.9);border:1px solid rgba(201,168,76,.32);border-radius:10px;overflow:hidden;}
    .lib-draft-top{padding:9px 12px;border-bottom:1px solid rgba(201,168,76,.16);display:flex;align-items:center;gap:8px;
      background:rgba(201,168,76,.06);}
    .lib-draft-type{font:.56rem 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#9a8348;border:1px solid rgba(201,168,76,.3);padding:2px 6px;border-radius:4px;}
    .lib-draft-name{font-family:'Cinzel',serif;color:#e0c898;font-size:.92rem;font-weight:700;}
    .lib-draft-body{padding:10px 12px;max-height:180px;overflow-y:auto;font-family:'Crimson Text',serif;font-size:.85rem;line-height:1.55;color:#bdb195;}
    .lib-draft-acts{display:flex;gap:7px;padding:9px 12px;border-top:1px solid rgba(255,255,255,.06);}
    .lib-draft-acts button{font:.68rem 'JetBrains Mono',monospace;padding:5px 11px;border-radius:5px;cursor:pointer;border:1px solid;}
    .lib-add{background:rgba(67,201,141,.12);border-color:rgba(67,201,141,.4);color:#43c98d;}
    .lib-add:hover{background:rgba(67,201,141,.22);}
    .lib-add:disabled{opacity:.5;cursor:default;}
    .lib-disc{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:#888;}
    /* quick prompts */
    .lib-quick{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 4px;}
    .lib-quick button{font-family:'Crimson Text',serif;font-style:italic;font-size:.82rem;text-align:left;color:#a89a78;
      background:none;border:1px solid rgba(201,168,76,.2);border-radius:14px;padding:5px 11px;cursor:pointer;line-height:1.2;}
    .lib-quick button:hover{border-color:rgba(201,168,76,.5);color:#e0c898;background:rgba(201,168,76,.06);}
    /* input */
    .lib-input{flex-shrink:0;display:flex;gap:8px;padding:11px;border-top:1px solid rgba(201,168,76,.16);background:rgba(4,6,15,.6);}
    .lib-input textarea{flex:1;resize:none;min-height:38px;max-height:120px;background:rgba(255,255,255,.05);border:1px solid rgba(201,168,76,.22);
      border-radius:8px;color:#d8ccb0;font-family:'Crimson Text',serif;font-size:.95rem;padding:9px 11px;outline:none;}
    .lib-input textarea:focus{border-color:rgba(201,168,76,.5);}
    .lib-send{flex-shrink:0;width:40px;border-radius:8px;border:1px solid rgba(232,200,120,.4);cursor:pointer;
      background:radial-gradient(circle at 32% 28%,#e8c878,#c8a050 60%,#7a5c22);color:#120c04;font-size:1.05rem;
      display:flex;align-items:center;justify-content:center;}
    .lib-send:disabled{opacity:.5;cursor:default;}
    .lib-attach{flex-shrink:0;width:36px;border-radius:8px;border:1px solid rgba(201,168,76,.28);cursor:pointer;
      background:rgba(201,168,76,.08);color:#c9a84c;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:background .12s;}
    .lib-attach:hover{background:rgba(201,168,76,.2);}
    /* import summary card */
    .lib-import{flex-shrink:0;align-self:flex-start;width:92%;background:rgba(10,14,28,.92);border:1px solid rgba(96,160,200,.34);border-radius:10px;overflow:hidden;}
    .lib-import-top{padding:9px 12px;border-bottom:1px solid rgba(96,160,200,.18);font-family:'Cinzel',serif;color:#bcd6ea;font-size:.9rem;font-weight:700;display:flex;align-items:center;gap:8px;}
    .lib-import-list{padding:8px 12px;max-height:230px;overflow-y:auto;}
    .lib-import-row{display:flex;align-items:center;gap:7px;padding:3px 0;font-size:.78rem;color:#c7bea6;}
    .lib-import-row .t{font:.54rem 'JetBrains Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:#8a9db0;border:1px solid rgba(96,160,200,.3);padding:1px 5px;border-radius:4px;flex-shrink:0;}
    .lib-import-row.sub{padding-left:16px;opacity:.9;}
    .lib-import-acts{display:flex;gap:7px;padding:9px 12px;border-top:1px solid rgba(255,255,255,.06);}
    .lib-import-acts button{font:.68rem 'JetBrains Mono',monospace;padding:6px 12px;border-radius:5px;cursor:pointer;border:1px solid;}
    .lib-warn{margin:0 14px;padding:8px 11px;background:rgba(204,51,68,.08);border:1px solid rgba(204,51,68,.25);border-radius:7px;
      font-family:'JetBrains Mono',monospace;font-size:.62rem;line-height:1.5;color:#cc8888;}
    `;
    const st = document.createElement("style");
    st.id = "librarian-styles";
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── Render helpers ───────────────────────────────────────────────────────
  function esc(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Turn [[Name]] citations into clickable chips; light markdown for the rest.
  function renderMessage(text) {
    let t = esc(text);
    // citations — support [[Name]] and [[Target|Display]] alias form
    t = t.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
      const parts = inner.split("|");
      // inner came from already-escaped text — unescape entities for the lookup.
      const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      const target = unesc(parts[0].trim());
      const display = (parts[1] || parts[0]).trim(); // already escaped — safe as HTML
      const e = findByName(target);
      if (e) return `<span class="lib-cite" data-lore="${e.id}">${display}</span>`;
      return `<span class="lib-cite dead" title="Not in the codex">${display}</span>`;
    });
    t = t
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
    // paragraphs
    t = t
      .split(/\n{2,}/)
      .map((p) => "<p>" + p.replace(/\n/g, "<br>") + "</p>")
      .join("");
    return t;
  }

  // Extract a ```codex-entry {json}``` block, returns {clean, draft|null}
  function extractDraft(text) {
    const m = text.match(/```codex-entry\s*([\s\S]*?)```/);
    if (!m) return { clean: text, draft: null };
    let draft = null;
    try { draft = JSON.parse(m[1].trim()); } catch (e) { draft = null; }
    const clean = text.replace(m[0], "").trim();
    return { clean, draft };
  }

  // ── DOM build ────────────────────────────────────────────────────────────
  let panel, bodyEl, taEl, sendEl, fabEl;

  function build() {
    injectStyles();

    fabEl = document.createElement("button");
    fabEl.id = "lib-fab";
    fabEl.title = "Consult the Librarian";
    fabEl.innerHTML = '<span aria-hidden="true">📖</span><span class="lib-badge" id="lib-badge" style="display:none">1</span>';
    fabEl.addEventListener("click", toggle);
    document.body.appendChild(fabEl);

    panel = document.createElement("div");
    panel.id = "lib-panel";
    panel.innerHTML = `
      <div class="lib-head">
        <div class="lib-ava">📖<span class="dot"></span></div>
        <div>
          <div class="lib-h-name">The Librarian</div>
          <div class="lib-h-sub">Archivist · <span class="ctx" id="lib-ctx">reading the codex</span></div>
        </div>
        <button class="lib-x" id="lib-x" title="Close">✕</button>
      </div>
      <div class="lib-body" id="lib-body"></div>
      <div class="lib-quick" id="lib-quick"></div>
      <div class="lib-input">
        <button class="lib-attach" id="lib-attach" title="Attach a document (.txt .md .docx .pdf) to import">📎</button>
        <input type="file" id="lib-file" accept=".txt,.md,.markdown,.text,.docx,.pdf" style="display:none">
        <textarea id="lib-ta" rows="1" placeholder="Ask the Librarian…  (or paste a passage and say “file this”)"></textarea>
        <button class="lib-send" id="lib-send" title="Send">➤</button>
      </div>
      <div style="padding:6px 12px 10px;border-top:1px solid rgba(255,255,255,.06)">
        <button id="lib-new-btn"
          style="width:100%;padding:7px 10px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);
                 color:#c9a84c;border-radius:6px;font-family:var(--serif-sc,'Cinzel',serif);
                 font-size:.62rem;text-transform:uppercase;letter-spacing:.18em;cursor:pointer;
                 transition:background .12s"
          onmouseover="this.style.background='rgba(201,168,76,.18)'"
          onmouseout="this.style.background='rgba(201,168,76,.08)'">✦ Add to archive</button>
      </div>`;
    document.body.appendChild(panel);

    bodyEl = panel.querySelector("#lib-body");
    taEl = panel.querySelector("#lib-ta");
    sendEl = panel.querySelector("#lib-send");

    panel.querySelector("#lib-x").addEventListener("click", toggle);
    sendEl.addEventListener("click", () => send(taEl.value));
    taEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(taEl.value); }
    });
    taEl.addEventListener("input", () => {
      taEl.style.height = "auto";
      taEl.style.height = Math.min(taEl.scrollHeight, 120) + "px";
    });

    // Delegate citation clicks.
    bodyEl.addEventListener("click", (e) => {
      const c = e.target.closest(".lib-cite[data-lore]");
      if (c) gotoEntry(c.dataset.lore);
    });

    // Add-to-archive button
    panel.querySelector("#lib-new-btn").addEventListener("click", showEntryPicker);

    // Attach a document → extract text → structured import.
    const fileEl = panel.querySelector("#lib-file");
    panel.querySelector("#lib-attach").addEventListener("click", () => fileEl.click());
    fileEl.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = ""; // allow re-picking the same file
      if (f) handleImportFile(f);
    });

    // Opening message + quick prompts.
    convo = [{ role: "assistant", content: OPENING }];
    redraw();
  }

  // ── ADD-TO-ARCHIVE ENTRY PICKER ────────────────────────────────────────────
  function showEntryPicker() {
    const tm = typeMap();
    let types;
    try { types = (typeof CODEX_DOC_TYPES !== 'undefined' ? CODEX_DOC_TYPES : []).filter(t => t.id !== 'all'); } catch(e) { types = []; }
    if (!types.length) types = [
      {id:'char',label:'NPC',icon:'🧑'},{id:'loc',label:'Location',icon:'🗺️'},{id:'faction',label:'Faction',icon:'⚔️'},
      {id:'timeline',label:'Timeline',icon:'📜'},{id:'lore',label:'Lore',icon:'✨'},{id:'item',label:'Item',icon:'⚗️'},{id:'note',label:'Note',icon:'📝'}
    ];

    bodyEl.innerHTML = '';
    const hdr = document.createElement('div');
    hdr.className = 'lib-msg lib-from';
    hdr.innerHTML = '<div style="font-family:\'Cinzel\',serif;font-size:.95rem;color:#e0d6c0;margin-bottom:5px">What shall I record?</div><div style="font-size:.78rem;color:#888">Choose a kind of entry — I will open the page for you.</div>';
    bodyEl.appendChild(hdr);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:7px;padding:10px 12px';
    types.forEach(t => {
      const btn = document.createElement('button');
      btn.style.cssText = 'padding:11px 6px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#ccc;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.78rem;transition:background .12s;font-family:inherit';
      btn.innerHTML = `<span style="font-size:1.2rem">${t.icon}</span><span>${t.label}</span>`;
      btn.addEventListener('mouseover', () => btn.style.background = 'rgba(201,168,76,.12)');
      btn.addEventListener('mouseout',  () => btn.style.background = 'rgba(255,255,255,.04)');
      btn.addEventListener('click', () => _libHandleTypeChoice(t.id));
      grid.appendChild(btn);
    });
    bodyEl.appendChild(grid);

    const back = document.createElement('button');
    back.textContent = '← Cancel';
    back.style.cssText = 'margin:0 12px 8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:#555;border-radius:5px;padding:4px 10px;font-size:.72rem;cursor:pointer';
    back.addEventListener('click', () => redraw());
    bodyEl.appendChild(back);
  }

  function _libHandleTypeChoice(typeId) {
    if (typeId === 'loc' || typeId === 'faction') {
      showSubfolioList(typeId);
    } else {
      try { if (typeof _codexOpenComposer === 'function') _codexOpenComposer({ type: typeId }); } catch(e) {}
      toggle();
    }
  }

  function showSubfolioList(typeId) {
    const tm = typeMap();
    const tinfo = tm[typeId] || { label: typeId, icon: '✦' };
    const existing = entries().filter(e => e.type === typeId);

    bodyEl.innerHTML = '';

    const hdr = document.createElement('div');
    hdr.className = 'lib-msg lib-from';
    hdr.innerHTML = `<div style="font-family:'Cinzel',serif;font-size:.9rem;color:#e0d6c0;margin-bottom:4px">${tinfo.icon} ${tinfo.label}</div><div style="font-size:.78rem;color:#888">Add a sub-folio to an existing ${tinfo.label.toLowerCase()}, or create a new one from scratch.</div>`;
    bodyEl.appendChild(hdr);

    // New top-level entry
    const newBtn = document.createElement('button');
    newBtn.style.cssText = 'width:calc(100% - 24px);margin:8px 12px 4px;padding:8px 12px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);color:#c9a84c;border-radius:7px;cursor:pointer;font-size:.82rem;text-align:left;font-family:inherit';
    newBtn.innerHTML = `✦ New ${tinfo.label.toLowerCase()} entry (standalone)`;
    newBtn.addEventListener('click', () => {
      try { if (typeof _codexOpenComposer === 'function') _codexOpenComposer({ type: typeId }); } catch(e) {}
      toggle();
    });
    bodyEl.appendChild(newBtn);

    if (existing.length) {
      const sep = document.createElement('div');
      sep.style.cssText = 'padding:10px 12px 4px;font-size:.62rem;text-transform:uppercase;letter-spacing:.14em;color:#555;font-family:inherit';
      sep.textContent = `Add sub-folio to existing ${tinfo.label.toLowerCase()}:`;
      bodyEl.appendChild(sep);

      const list = document.createElement('div');
      list.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:0 12px 8px';
      existing.slice(0, 14).forEach(e => {
        const btn = document.createElement('button');
        btn.style.cssText = 'padding:7px 10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#bbb;cursor:pointer;font-size:.82rem;text-align:left;transition:background .1s;font-family:inherit';
        btn.textContent = `${tinfo.icon} ${eName(e)}`;
        if (eSummary(e)) btn.title = eSummary(e);
        btn.addEventListener('mouseover', () => btn.style.background = 'rgba(201,168,76,.1)');
        btn.addEventListener('mouseout',  () => btn.style.background = 'rgba(255,255,255,.04)');
        btn.addEventListener('click', () => {
          try {
            if (typeof _codexOpenComposer === 'function') {
              _codexOpenComposer({ type: typeId, parentEntry: e });
            }
          } catch(err) {}
          toggle();
        });
        list.appendChild(btn);
      });
      bodyEl.appendChild(list);
    }

    const back = document.createElement('button');
    back.textContent = '← Back';
    back.style.cssText = 'margin:0 12px 8px;background:transparent;border:1px solid rgba(255,255,255,.1);color:#555;border-radius:5px;padding:4px 10px;font-size:.72rem;cursor:pointer';
    back.addEventListener('click', () => showEntryPicker());
    bodyEl.appendChild(back);
  }

  function updateCtx() {
    const ctx = panel && panel.querySelector("#lib-ctx");
    if (!ctx) return;
    const n = visibleEntries().length;
    ctx.textContent = `${n} ${n === 1 ? "entry" : "entries"}${isGM() ? " · GM" : ""}`;
  }

  function renderQuick() {
    const q = panel.querySelector("#lib-quick");
    if (convo.length > 1) { q.innerHTML = ""; q.style.display = "none"; return; }
    q.style.display = "flex";
    q.innerHTML = "";
    QUICK_PROMPTS.forEach((p) => {
      const b = document.createElement("button");
      b.textContent = p;
      b.addEventListener("click", () => send(p));
      q.appendChild(b);
    });
  }

  function redraw() {
    if (!bodyEl) return;
    bodyEl.innerHTML = "";
    convo.forEach((m, i) => {
      if (m.role === "assistant") {
        // Message text FIRST, then any card — so the card's action buttons
        // ("File all", "Add to codex") sit BELOW the instruction and stay in view
        // when the panel auto-scrolls to the bottom.
        if (m.content && m.content.trim()) {
          const d = document.createElement("div");
          d.className = "lib-msg lib-from";
          d.innerHTML = renderMessage(m.content) + (i > 0 ? '<div class="lib-byline">— The Librarian</div>' : "");
          bodyEl.appendChild(d);
        }
        if (m.draft) { appendDraftCard(m.draft, m._saved); }
        if (m._import) { appendImportCard(m._import); }
      } else {
        const d = document.createElement("div");
        d.className = "lib-msg lib-you";
        d.innerHTML = renderMessage(m.content);
        bodyEl.appendChild(d);
      }
    });
    if (busy) {
      const t = document.createElement("div");
      t.className = "lib-typing";
      t.innerHTML = "<i></i><i></i><i></i>";
      bodyEl.appendChild(t);
    }
    renderQuick();
    updateCtx();
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function appendDraftCard(draft, saved) {
    const tm = typeMap();
    const tinfo = tm[draft.type] || {};
    const card = document.createElement("div");
    card.className = "lib-draft";
    const bodyHtml = (draft.body || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^## (.+)$/gm, "<h4 style='color:#c9a84c;font-family:Cinzel,serif;margin:.4rem 0 .15rem;font-size:.85rem'>$1</h4>")
      .replace(/\*\*(.+?)\*\*/g, "<strong style='color:#d8c89a'>$1</strong>")
      .replace(/\n/g, "<br>");
    card.innerHTML = `
      <div class="lib-draft-top">
        <span class="lib-draft-type">${(tinfo.icon || "✦")} ${esc(draft.type || "entry")}</span>
        <span class="lib-draft-name">${esc(draft.name || "Untitled")}</span>
      </div>
      <div class="lib-draft-body">${draft.summary ? "<em style='color:#8a7a55'>" + esc(draft.summary) + "</em><br><br>" : ""}${bodyHtml || "<em>(no body)</em>"}</div>
      <div class="lib-draft-acts">
        <button class="lib-add">${saved ? "✓ Filed in codex" : "＋ Add to codex"}</button>
        <button class="lib-disc">Dismiss</button>
      </div>`;
    const addBtn = card.querySelector(".lib-add");
    const discBtn = card.querySelector(".lib-disc");
    if (saved) addBtn.disabled = true;
    addBtn.addEventListener("click", () => {
      const id = commitDraft(draft);
      addBtn.textContent = "✓ Filed in codex";
      addBtn.disabled = true;
      const msg = convo.find((m) => m.draft === draft);
      if (msg) msg._saved = true;
      toast("Filed “" + (draft.name || "entry") + "” in the codex");
      if (id) setTimeout(() => gotoEntry(id), 320);
    });
    discBtn.addEventListener("click", () => {
      const idx = convo.findIndex((m) => m.draft === draft);
      if (idx >= 0) { convo[idx].draft = null; redraw(); }
    });
    bodyEl.appendChild(card);
  }

  // ── Create a real lore entry from a draft (codex shape) ──────────────────
  function commitDraft(draft) {
    const s = appState();
    if (!s) return null;
    if (!Array.isArray(s.loreEntries)) s.loreEntries = [];

    const id = "cx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    const validTypes = codexTypeIds();
    const type = validTypes.includes(draft.type) ? draft.type : (validTypes.includes("note") ? "note" : validTypes[0]);
    const bodyText = draft.body || "";

    // Convert the markdown body into the codex's block model.
    let bodyBlocks;
    try {
      if (typeof _markdownToBlocks === "function") bodyBlocks = _markdownToBlocks(bodyText);
    } catch (e) {}
    if (!bodyBlocks) {
      bodyBlocks = bodyText
        ? bodyText.split(/\n\n+/).filter((p) => p.trim()).map((p) => {
            const h = p.match(/^#{1,3}\s+(.+)/);
            return h ? { kind: "h", text: h[1].trim() } : { kind: "p", text: p.trim() };
          })
        : [{ kind: "p", text: "Begin here." }];
    }

    let wordCount = 0, excerpt = "";
    try { if (typeof _countWords === "function") wordCount = _countWords(bodyBlocks); } catch (e) {}
    try { if (typeof _firstPText === "function") excerpt = _firstPText(bodyBlocks); } catch (e) {}
    if (!excerpt) excerpt = bodyText.slice(0, 140);

    const summary = (draft.summary || "").slice(0, 160);
    const entry = {
      id,
      type,
      title: (draft.name || "Untitled entry").trim(),
      name: (draft.name || "Untitled entry").trim(), // legacy mirror
      subtitle: summary,
      summary: summary,                               // legacy mirror
      body: bodyText,
      bodyBlocks: bodyBlocks,
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      collections: [],
      related: [],
      revealed: false, // drafts arrive hidden — the GM reveals deliberately
      status: "draft",
      era: "",
      region: "",
      img: null,
      paraReveals: {},
      wordCount: wordCount,
      excerpt: excerpt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    s.loreEntries.unshift(entry); // codex prepends newest
    try { if (typeof _cxTrackRecent === "function") _cxTrackRecent(id, "Drafted"); } catch (e) {}
    persist();

    // Refresh the lore tab if it's showing.
    try { if (onLoreTab() && typeof renderLore === "function") renderLore(); } catch (e) {}
    return id;
  }

  // ── Navigate to an entry (switch to the Lore tab first if needed) ────────
  function gotoEntry(id) {
    const wasLore = onLoreTab();
    if (!wasLore) {
      const navItem =
        document.querySelector('.sb-nav-item[data-tab="lore"]') ||
        document.querySelector('#tab-btn-lore') ||
        document.querySelector('.nb-item[data-tab="lore"]');
      if (navItem) navItem.click();
      else { try { if (typeof showTab === "function") showTab("lore"); } catch (e) {} }
    }
    const open = () => { try { if (typeof openLoreEntry === "function") openLoreEntry(id); } catch (e) {} };
    if (wasLore) open();
    else setTimeout(open, 160);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  LOCAL ENGINE — no AI, no network. Deterministic recall + audit + brief
  //  + stub authoring, all assembled from the real codex entries. Emits the
  //  same markdown + [[citation]] + ```codex-entry``` contract the UI parses.
  // ══════════════════════════════════════════════════════════════════════

  const STOP = new Set(
    ("the a an and or of to in on at for with from by is are was were be been being this that " +
     "these those it its as into over under about across after before but not no nor so than then " +
     "them they their our your his her him she he we you i me my your who whom whose what which when " +
     "where why how do does did done has have had will would shall should can could may might must " +
     "very more most some any all each every both few many much other another such own same there " +
     "here tell show find me us about give list any does please new entry page record codex").split(/\s+/)
  );

  function words(text) {
    return ((text || "").toLowerCase().match(/[a-z0-9][a-z0-9'’\-]*/g) || []);
  }
  function keywords(text) {
    return words(text).filter((w) => w.length > 2 && !STOP.has(w));
  }
  function wordCountOf(e) {
    if (e && typeof e.wordCount === "number" && e.wordCount) return e.wordCount;
    return words(eBodyText(e)).length;
  }
  function occurrences(hay, w) {
    let n = 0, i = 0;
    while ((i = hay.indexOf(w, i)) !== -1) { n++; i += w.length; }
    return n;
  }
  function cite(e) { return "[[" + eName(e) + "]]"; }

  // Strip leading question words to isolate the subject of a recall query.
  function subjectOf(text) {
    let t = (text || "").trim();
    t = t.replace(/^\s*(?:find|search(?:\s+for)?|look\s*up|recall|locate|lookup)\s*[:\-]?\s*/i, "");
    t = t.replace(/^\s*(?:who(?:'s|\s+is|\s+are|\s+was|\s+were)?|what(?:'s|\s+is|\s+are|\s+was|\s+were)?|where(?:'s|\s+is|\s+are)?|when(?:'s|\s+is|\s+was)?|tell\s+me\s+about|tell\s+me|show\s+me|describe|do\s+we\s+have|is\s+there|are\s+there|remind\s+me\s+(?:about|of))\s+/i, "");
    t = t.replace(/[?.!]+\s*$/, "").trim();
    return t;
  }

  // First sentence(s) of a body that best match the query keywords.
  function snippetFor(e, kws, max) {
    max = max || 240;
    const body = eBodyText(e).replace(/[#>*_`]/g, "").replace(/\s+/g, " ").trim();
    if (!body) return eSummary(e) || "";
    const sents = body.match(/[^.!?]+[.!?]*/g) || [body];
    let best = sents[0], bestScore = -1;
    sents.forEach((s) => {
      const sl = s.toLowerCase();
      let sc = 0;
      kws.forEach((w) => { if (sl.indexOf(w) !== -1) sc++; });
      if (sc > bestScore) { bestScore = sc; best = s; }
    });
    let out = best.trim();
    if (out.length > max) out = out.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
    return out;
  }

  function rankEntries(text) {
    const phrase = subjectOf(text).toLowerCase();
    const kws = keywords(phrase || text);
    const vis = visibleEntries();
    const ranked = vis
      .map((e) => {
        const name = eName(e).toLowerCase();
        const sub = eSummary(e).toLowerCase();
        const tags = eTags(e).map((t) => String(t).toLowerCase());
        const body = eBodyText(e).toLowerCase();
        let score = 0;
        if (phrase) {
          if (name === phrase) score += 120;
          else if (name.indexOf(phrase) !== -1 || phrase.indexOf(name) !== -1) score += 45;
          if (sub.indexOf(phrase) !== -1) score += 12;
          if (body.indexOf(phrase) !== -1) score += 9;
        }
        kws.forEach((w) => {
          if (name.indexOf(w) !== -1) score += 14;
          if (tags.some((t) => t.indexOf(w) !== -1)) score += 9;
          if (sub.indexOf(w) !== -1) score += 5;
          const c = occurrences(body, w);
          if (c) score += Math.min(c, 5) * 2;
        });
        return { e, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || wordCountOf(b.e) - wordCountOf(a.e));
    return { ranked, kws, phrase };
  }

  // Build a reference graph: how many entries point at each entry (by name).
  function refGraph() {
    const all = isGM() ? entries() : visibleEntries();
    const incoming = {}; // lowercased name -> count
    const linkRe = /\[\[([^\]]+)\]\]/g;
    all.forEach((e) => {
      const seen = new Set();
      const body = eBodyText(e);
      let m;
      while ((m = linkRe.exec(body))) {
        const tgt = findByName(m[1].split("|")[0].trim());
        if (tgt && tgt.id !== e.id) seen.add(tgt.id);
      }
      (Array.isArray(e.related) ? e.related : []).concat(Array.isArray(e.relatedIds) ? e.relatedIds : []).forEach((id) => seen.add(id));
      seen.forEach((id) => {
        const t = all.find((x) => x.id === id);
        if (t) { const k = eName(t).toLowerCase(); incoming[k] = (incoming[k] || 0) + 1; }
      });
    });
    return incoming;
  }

  // ── RECALL ───────────────────────────────────────────────────────────────
  function answerRecall(text) {
    const { ranked, kws, phrase } = rankEntries(text);
    const label = phrase || keywords(text).join(" ") || "that";
    if (!ranked.length) {
      return "I have searched the stacks, keeper, but nothing yet recorded answers to **" + label +
        "**. If it should exist, bid me *stub a new entry* and I will lay the page.";
    }
    const top = ranked[0].e;
    const rest = ranked.slice(1, 6).map((s) => s.e);
    let out = "The codex records " + cite(top) + " — *" + eTypeLabel(top) + "*";
    if (!(top.revealed || top.status === "canon") && isGM()) out += " *(unrevealed)*";
    out += ". " + (snippetFor(top, kws) || eSummary(top) || "The page stands, though its body is yet unwritten.");
    if (rest.length) {
      out += "\n\nOther pages touch on this: " + rest.map(cite).join(", ") + ".";
    }
    return out;
  }

  // ── POWER / WHO-RULES ──────────────────────────────────────────────────
  function answerPower() {
    const vis = visibleEntries();
    const incoming = refGraph();
    const rankByLink = (arr) => arr.sort((a, b) =>
      (incoming[eName(b).toLowerCase()] || 0) - (incoming[eName(a).toLowerCase()] || 0) ||
      wordCountOf(b) - wordCountOf(a));
    const factions = rankByLink(vis.filter((e) => /faction|guild|order|organi/i.test((e.type || "") + " " + eTypeLabel(e))));
    const powerWord = /\b(king|queen|lord|lady|chief|captain|admiral|sovereign|ruler|high|prime|master|matriarch|patriarch|warlord|baron|council|regent|priest)\b/i;
    const leaders = rankByLink(vis.filter((e) =>
      /npc|char|person/i.test((e.type || "") + " " + eTypeLabel(e)) &&
      (powerWord.test(eName(e)) || powerWord.test(eSummary(e)))));
    if (!factions.length && !leaders.length) {
      return "The codex does not yet name who holds power, keeper — no factions or ruling figures are recorded. Bid me *stub a faction* to begin charting the powers of the Isles.";
    }
    let out = "Power in the Isles, as the codex records it:";
    if (factions.length) {
      out += "\n\n**Powers & factions.** " + factions.slice(0, 5).map(cite).join(", ") + ".";
    }
    if (leaders.length) {
      out += "\n\n**Hands that hold it.** " + leaders.slice(0, 6).map(cite).join(", ") + ".";
    }
    out += "\n\nName any of them and I will read you their full page.";
    return out;
  }

  // ── BRIEF / OVERVIEW ─────────────────────────────────────────────────────
  function answerBrief() {
    const vis = visibleEntries();
    if (!vis.length) return "The codex is empty, keeper. There is nothing yet to brief — begin a page and I will keep it.";
    const incoming = refGraph();
    const weight = (e) => (incoming[eName(e).toLowerCase()] || 0) * 6 + Math.min(wordCountOf(e), 400) / 60;
    const byType = (re) => vis.filter((e) => re.test((e.type || "") + " " + eTypeLabel(e)))
                              .sort((a, b) => weight(b) - weight(a));
    const places   = byType(/location|place|city|island|region|site/i);
    const figures  = byType(/npc|char|person|figure/i);
    const factions = byType(/faction|guild|order|organi/i);
    const lore     = byType(/concept|event|history|era|myth|religion|deity/i);

    const lines = [];
    lines.push("**The Shattered Isles, in brief —**");
    if (lore.length)     lines.push("The world is shaped by " + lore.slice(0, 3).map(cite).join(", ") + ".");
    if (factions.length) lines.push("Its powers: " + factions.slice(0, 4).map(cite).join(", ") + ".");
    if (figures.length)  lines.push("Figures of note: " + figures.slice(0, 4).map(cite).join(", ") + ".");
    if (places.length)   lines.push("Places to know: " + places.slice(0, 4).map(cite).join(", ") + ".");
    const counts = {};
    vis.forEach((e) => { const l = eTypeLabel(e); counts[l] = (counts[l] || 0) + 1; });
    const tally = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((k) => counts[k] + " " + k.toLowerCase()).join(", ");
    lines.push("*The archive holds " + vis.length + " " + (vis.length === 1 ? "entry" : "entries") + " — " + tally + ". Name any and I will read it in full.*");
    return lines.join("\n\n");
  }

  // ── AUDIT / CONTINUITY ───────────────────────────────────────────────────
  function answerAudit() {
    const all = isGM() ? entries() : visibleEntries();
    if (!all.length) return "There is nothing to audit yet, keeper — the codex is bare.";
    const incoming = refGraph();
    const linkRe = /\[\[([^\]]+)\]\]/g;

    const broken = [];
    all.forEach((e) => {
      const body = eBodyText(e); let m;
      while ((m = linkRe.exec(body))) {
        const raw = m[1].split("|")[0].trim();
        if (!findByName(raw)) broken.push({ from: e, target: raw });
      }
    });
    const stubs = all.filter((e) => wordCountOf(e) < 25);
    const untagged = all.filter((e) => !eTags(e).length);
    const hasLinkGraph = Object.keys(incoming).length > 0;
    const orphans = !hasLinkGraph ? [] : all.filter((e) => !(incoming[eName(e).toLowerCase()] || 0) && !(((Array.isArray(e.related) && e.related.length) || (Array.isArray(e.relatedIds) && e.relatedIds.length)) || /\[\[/.test(eBodyText(e))));
    const byName = {};
    all.forEach((e) => { const k = eName(e).toLowerCase(); (byName[k] = byName[k] || []).push(e); });
    const dups = Object.keys(byName).filter((k) => byName[k].length > 1);

    const parts = [];
    if (broken.length) {
      const uniq = [];
      broken.forEach((b) => { if (uniq.indexOf(b.target) === -1) uniq.push(b.target); });
      parts.push("**Broken links (" + broken.length + ").** Pages reference entries that do not exist: " +
        uniq.slice(0, 8).map((t) => "“" + t + "”").join(", ") + ". First seen in " + cite(broken[0].from) + ".");
    }
    if (dups.length) {
      parts.push("**Duplicate titles (" + dups.length + ").** More than one page shares a name: " +
        dups.slice(0, 6).map((k) => "“" + eName(byName[k][0]) + "”").join(", ") + ".");
    }
    if (stubs.length) {
      parts.push("**Stubs (" + stubs.length + ").** Barely-written pages awaiting flesh: " +
        stubs.slice(0, 8).map(cite).join(", ") + ".");
    }
    if (orphans.length) {
      parts.push("**Orphans (" + orphans.length + ").** Entries nothing links to and which link nowhere: " +
        orphans.slice(0, 8).map(cite).join(", ") + ".");
    }
    if (!hasLinkGraph) {
      parts.push("**No cross-links yet.** Not one page links to another. Wrap an entry's name in double brackets within another page's body and the codex becomes navigable — and I can trace orphans and loose threads for you.");
    }
    if (untagged.length) {
      parts.push("**Untagged (" + untagged.length + ").** No tags to find them by: " +
        untagged.slice(0, 8).map(cite).join(", ") + ".");
    }
    if (!parts.length) {
      return "I find no loose ends, keeper. Every link resolves, every page is tagged and connected, and none stand orphaned. The canon holds — so far as structure can tell.";
    }
    return "I have audited the canon, keeper. What I can verify by structure:\n\n" + parts.join("\n\n") +
      "\n\n*I check links, tags and connections — not meaning. For true contradictions of fact, point me at two pages and I will set their words side by side.*";
  }

  // ── COMPARE two entries (side-by-side recall) ────────────────────────────
  function answerCompare(a, b) {
    const ea = findByName(a), eb = findByName(b);
    if (!ea || !eb) return null;
    return "Set side by side, keeper:\n\n" +
      "**" + cite(ea) + "** — " + (eSummary(ea) || snippetFor(ea, [], 200) || "(no summary)") + "\n\n" +
      "**" + cite(eb) + "** — " + (eSummary(eb) || snippetFor(eb, [], 200) || "(no summary)") +
      "\n\nRead the two and judge whether their words agree.";
  }

  // ── AUTHOR / STUB a new entry ────────────────────────────────────────────
  function resolveType(text) {
    const ids = codexTypeIds();
    const tm = typeMap();
    const t = (text || "").toLowerCase();
    // direct id / label hit
    for (const id of ids) {
      const label = (tm[id] && tm[id].label ? tm[id].label : id).toLowerCase();
      if (new RegExp("\\b" + id + "\\b").test(t) || new RegExp("\\b" + label + "\\b").test(t)) return id;
    }
    // synonyms → try to map onto an available id
    const syn = [
      [/\b(npc|character|person|figure|someone|man|woman|hero|villain)\b/, ["char", "npc", "character", "person"]],
      [/\b(location|place|city|town|island|region|site|landmark|dungeon)\b/, ["loc", "location", "place", "site"]],
      [/\b(faction|guild|order|organi|group|cult|house|company|crew)\b/, ["faction", "organization", "group"]],
      [/\b(item|artifact|weapon|object|relic|treasure|gear)\b/, ["item", "artifact", "object"]],
      [/\b(event|battle|war|incident|happening|history|era|age|timeline|chronicle)\b/, ["timeline", "event", "history", "era"]],
      [/\b(magic|spell|ritual|arcane|enchant)\b/, ["magic"]],
      [/\b(concept|idea|term|lore|religion|deity|god|rule|myth)\b/, ["lore", "concept", "note"]],
    ];
    for (const [re, prefs] of syn) {
      if (re.test(t)) { for (const p of prefs) if (ids.includes(p)) return p; }
    }
    return ids.includes("note") ? "note" : ids[0];
  }
  function extractName(text) {
    var quote = /[`'"\u2018\u2019\u201c\u201d]/g;
    var m = text.match(/(?:named|called|titled|entitled)\s+(.{2,60})/i);
    if (m) return m[1].replace(quote, "").split(/[,.\n]/)[0].trim();
    m = text.match(/[\u2018\u2019\u201c\u201d'"]([^'"\u2018\u2019\u201c\u201d\n]{2,60})[\u2018\u2019\u201c\u201d'"]/);
    if (m) return m[1].trim();
    m = text.match(/\b(?:for|of|about|on)\s+(?:an?|the)?\s*([A-Z].{1,58})$/);
    if (m) return m[1].replace(quote, "").split(/[,.\n]/)[0].trim();
    return "";
  }
  function scaffoldBody(typeId, label) {
    const h = (s) => "## " + s;
    const blocks = {
      char:     [h("Identity"), "*Who are they, and what role do they play?*", h("Appearance & manner"), "*…*", h("Goals & secrets"), "*What do they want — and what do they hide?*", h("Ties"), "*Name the factions and places they are bound to.*"],
      loc:      [h("Overview"), "*What is this place, and why does it matter?*", h("Geography"), "*…*", h("Who holds it"), "*Name its rulers, factions, and threats.*", h("Hooks"), "*Why would the party come here?*"],
      faction:  [h("Charter"), "*What does this faction want, and how does it act?*", h("Structure"), "*Name its leaders and ranks.*", h("Holdings"), "*Where do they hold power?*", h("Relations"), "*Allies and enemies.*"],
      item:     [h("Description"), "*What is it, and what does it do?*", h("Origin"), "*Where did it come from?*", h("Powers"), "*Mechanics and properties.*", h("Whereabouts"), "*Who holds it now?*"],
      timeline: [h("The age"), "*…*", h("Key moments"), "*…*", h("Legacy"), "*What endures from it today?*"],
      lore:     [h("Overview"), "*What is this, in the world's own terms?*", h("Detail"), "*…*", h("Significance"), "*Why does it matter to the Isles?*"],
      magic:    [h("Principle"), "*How does it work?*", h("Practice"), "*Who wields it, and how?*", h("Cost & limits"), "*What does it demand, and what can it not do?*"],
    };
    // Aliases so synonyms land on the codex's real type ids.
    const alias = { npc: "char", character: "char", person: "char", location: "loc", place: "loc", history: "timeline", era: "timeline", event: "timeline", concept: "lore" };
    const key = blocks[typeId] ? typeId : (alias[typeId] || typeId);
    return (blocks[key] || [h("Overview"), "*Begin the page here.*"]).join("\n");
  }
  function answerAuthor(text) {
    const typeId = resolveType(text);
    const tm = typeMap();
    const label = (tm[typeId] && tm[typeId].label) || typeId;
    let name = extractName(text);
    if (!name) name = "New " + (label.charAt(0).toUpperCase() + label.slice(1));
    const kws = keywords(text).filter((w) => !/npc|character|location|place|faction|item|event|concept|history|stub|draft|entry|page/.test(w));
    const tags = kws.slice(0, 4);
    const draft = {
      name: name,
      type: typeId,
      summary: "A new " + label.toLowerCase() + " — fill in a one-line summary.",
      body: scaffoldBody(typeId, label),
      tags: tags,
    };
    const note = "I cannot invent canon from nothing, keeper — but here is a fresh **" + label.toLowerCase() +
      "** scaffold, drawn to the codex's own shape. Fill the italics, then file it. It will arrive **hidden** until you reveal it.";
    return note + "\n```codex-entry\n" + JSON.stringify(draft) + "\n```";
  }

  // ── Paste-to-file: read a pasted passage, auto-sort it to a folio ─────────
  // The keeper drops a block of lore in; we classify it by its own content,
  // lift a title, and hand back a real draft (body preserved) they can file.
  function classifyContent(text) {
    const t = (text || "").toLowerCase();
    const cats = [
      { prefs: ["char", "npc", "character", "person"], re: [
        /\b(he|she|they|him|her|his|hers|their)\b/g,
        /\b(born|raised|wears?|wore|wields?|carries|carried|voice|eyes|hair|skin|face|smile|scars?)\b/g,
        /\b(captain|lord|lady|ser|sir|dame|king|queen|prince|princess|master|mistress|father|mother|son|daughter|brother|sister|apprentice|servant)\b/g,
        /\b(personality|demeanou?r|temperament|manner|loyal|cruel|kind|ambitious|cunning|ruthless|gentle)\b/g ] },
      { prefs: ["loc", "location", "place", "site"], re: [
        /\b(city|cities|town|village|island|isle|port|harbou?r|region|realm|kingdom|land|coast|mountains?|forest|sea|ocean|river|lake|valley|desert|streets?|district|quarter|market|tavern|inn|keep|castle|fort|citadel|ruins?|cavern|temple|shrine)\b/g,
        /\b(north|south|east|west|northern|southern|eastern|western)\b/g,
        /\b(population|inhabitants?|founded|built|ruled\s+by|lies|located|situated|nestled|perched|stands?)\b/g ] },
      { prefs: ["faction", "organization", "group", "guild"], re: [
        /\b(guild|order|clan|house|company|cult|coven|council|circle|brotherhood|sisterhood|society|syndicate|cabal|faction|crew|fleet|army|legion|court)\b/g,
        /\b(members?|ranks?|leaders?|founded|allies|enemies|rivals?|controls?|commands?|recruits?|initiat|sworn|oath)\b/g ] },
      { prefs: ["item", "artifact", "object", "relic"], re: [
        /\b(sword|blade|axe|dagger|bow|spear|staff|wand|rod|shield|armou?r|helm|ring|amulet|cloak|crown|orb|gem|stone|tome|scroll|potion|weapon|artifact|relic|treasure|talisman)\b/g,
        /\b(forged|enchanted|wielder|attunement|attunes?|grants?|\+\d|damage|magical|cursed|blessed|glows?|hums?)\b/g ] },
      { prefs: ["timeline", "event", "history", "era"], re: [
        /\b(years?|age|era|epoch|century|decade|reign|dynasty|war|battle|siege|treaty|founding|fall|rise|cataclysm|plague|uprising|revolution|massacre)\b/g,
        /\b\d{1,4}\s?(?:ad|bc|ce|bce|ar|dr)\b/g,
        /\b(occurred|happened|began|ended|marked|during|centuries|long ago)\b/g ] },
      { prefs: ["magic", "lore"], re: [
        /\b(spell|ritual|arcane|magick?|mana|incantation|enchantment|sorcery|wizardry|conjur|evocation|casts?|casting|invok|weave|ley[- ]?lines?)\b/g ] },
      { prefs: ["lore", "concept", "note"], re: [
        /\b(gods?|goddess|deit(?:y|ies)|divine|religion|faith|worship|myth|legend|prophec|belief|philosophy|tradition|custom|doctrine|principle|concept|omen)\b/g ] },
    ];
    const ids = codexTypeIds();
    let best = null, bestScore = 0;
    for (const c of cats) {
      let s = 0;
      for (const re of c.re) { const m = t.match(re); if (m) s += m.length; }
      if (s > bestScore) { bestScore = s; best = c; }
    }
    if (best && bestScore > 0) { for (const p of best.prefs) if (ids.includes(p)) return p; }
    return ids.includes("lore") ? "lore" : (ids.includes("note") ? "note" : ids[0]);
  }

  // Strip a leading "file this / record this under X:" directive; capture an
  // explicit folio hint if the keeper gave one ("…under locations").
  function stripDirective(text) {
    let t = (text || "").trim();
    let hint = null;
    const um = t.match(/\bunder\s+(?:the\s+)?([a-z]+)/i);
    if (um) hint = um[1];
    const stripped = t.replace(/^\s*(?:please\s+)?(?:file|record|catalog(?:ue)?|archive|save|store|add|sort|import|log|put|enter|keep)\b[^\n:]*[:\n]/i, "").trim();
    return { hint, body: stripped || t };
  }

  function firstSentence(body) {
    const clean = (body || "").replace(/^#{1,3}\s*/gm, "").replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim();
    const m = clean.match(/^.*?[.!?](?=\s|$)/);
    return (m ? m[0] : clean).trim();
  }

  function deriveTitle(body) {
    const lines = (body || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return "Untitled passage";
    const first = lines[0].replace(/^#{1,3}\s*/, "").replace(/[*_`]/g, "").trim();
    // A short opening line with no terminal punctuation reads as a heading/title.
    if (first && first.length <= 64 && !/[.!?:,]$/.test(first) && lines.length > 1) return first;
    // "X is/was a/the …" — lift the subject.
    const m = body.match(/^\s*(?:#{1,3}\s*)?([A-Z][A-Za-z0-9'’ \-]{1,58}?)\s+(?:is|was|are|were)\s+(?:an?|the|one|a\s+kind)\b/);
    if (m) return m[1].trim();
    // First proper-noun phrase in the opening line.
    const p = first.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/);
    if (p) return p[1];
    return first.split(/\s+/).slice(0, 6).join(" ").replace(/[,.:;]$/, "") || "Untitled passage";
  }

  function answerFile(rawText) {
    const { hint, body } = stripDirective(rawText);
    if (!body || body.replace(/\s/g, "").length < 12) {
      return "Hand me the passage, keeper — paste the text and say *file this*, and I will read its shape and sort it to the right folio.";
    }
    const forced = hint ? resolveType(hint) : null;
    const typeId = forced || classifyContent(body);
    const tm = typeMap();
    const label = (tm[typeId] && tm[typeId].label) || typeId;
    const title = deriveTitle(body);
    // Drop the title line from the body if we lifted it verbatim (avoid a dupe).
    let cleanBody = body;
    const lines = body.split(/\n/);
    if (lines[0] && lines[0].replace(/^#{1,3}\s*/, "").replace(/[*_`]/g, "").trim() === title) {
      const rest = lines.slice(1).join("\n").trim();
      if (rest) cleanBody = rest;
    }
    const tags = [...new Set(keywords(cleanBody))].slice(0, 5);
    const summary = firstSentence(cleanBody).slice(0, 150);
    const draft = { name: title, type: typeId, summary: summary, body: cleanBody, tags: tags };
    const note = "I read the hand of it, keeper — this belongs among the **" + String(label).toLowerCase() +
      "**. I have set it in a folio titled **" + title + "**" +
      (forced ? " (as you bid)" : "") + ". Look it over, then file it — it arrives **hidden** until you reveal it.";
    return note + "\n```codex-entry\n" + JSON.stringify(draft) + "\n```";
  }

  // Does this input look like a passage to be filed, rather than a question?
  function looksLikePaste(t) {
    const multi = t.indexOf("\n") !== -1;
    const sentences = (t.match(/[.!?](?=\s|$)/g) || []).length;
    const isQuestion = /\?\s*$/.test(t) ||
      /^\s*(?:who|what|where|when|why|how|is|are|do|does|did|can|could|would|should|tell|show|describe|find|search|look|recall|list|compare|remind|give|which|whose)\b/i.test(t);
    // Authoring imperatives ("draft/write/create a new NPC…") belong to the
    // scaffold builder, not the paste filer — even when they run long.
    const isAuthorCmd = /^\s*(?:draft|write|stub|create|author|generate|make|compose|invent|come up with)\b/i.test(t);
    if (isQuestion || isAuthorCmd) return false;
    return (multi && t.length > 70) || (t.length > 180 && sentences >= 2);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  DOCUMENT IMPORT — attach a .docx/.pdf/.txt/.md (or paste a whole doc),
  //  break it into a hub location + sub-folios + the NPCs / factions / history
  //  named within, and file the lot with cross-links. No network, no AI.
  // ══════════════════════════════════════════════════════════════════════

  // Minimal ZIP reader (docx is a zip) using the browser's native inflate.
  async function _inflateRaw(bytes) {
    const ds = new DecompressionStream("deflate-raw");
    const ab = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(ab);
  }
  async function _unzipEntry(buf, wanted) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= 0 && i > buf.byteLength - 22 - 65536; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("not a valid .docx (zip) file");
    const cdOff = dv.getUint32(eocd + 16, true), cdCount = dv.getUint16(eocd + 10, true);
    let p = cdOff;
    for (let n = 0; n < cdCount; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const compSize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      const fname = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nameLen));
      if (fname === wanted) {
        const lNameLen = dv.getUint16(lho + 26, true);
        const lExtraLen = dv.getUint16(lho + 28, true);
        const dataStart = lho + 30 + lNameLen + lExtraLen;
        const comp = u8.subarray(dataStart, dataStart + compSize);
        return method === 0 ? comp.slice() : await _inflateRaw(comp);
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    throw new Error(wanted + " not found in document");
  }
  function _xmlUnesc(s) {
    return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&apos;/g, "'").replace(/&quot;/g, '"');
  }
  // .docx → [{level, text}] (level 0=Title, 1..3=Heading n, null=body)
  function docxToBlocks(xml) {
    const blocks = [];
    xml.split(/<\/w:p>/).forEach((para) => {
      const texts = [];
      const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g; let m;
      while ((m = re.exec(para))) texts.push(m[1]);
      const line = _xmlUnesc(texts.join("")).replace(/\s+/g, " ").trim();
      if (!line) return;
      const st = para.match(/w:val="(Heading([1-9])|Title)"/);
      let level = null;
      if (st) level = st[1] === "Title" ? 0 : parseInt(st[2], 10);
      blocks.push({ level, text: line });
    });
    return blocks;
  }
  async function extractDocx(buf) {
    return docxToBlocks(new TextDecoder("utf-8").decode(await _unzipEntry(buf, "word/document.xml")));
  }
  async function extractPdf(buf) {
    let lib = window.pdfjsLib || (window.pdfjsDistBuildPdf && window.pdfjsDistBuildPdf);
    if (!lib || !lib.getDocument) {
      // Lazy-load the same pdf.js build the character-sheet importer uses —
      // without this, attaching a PDF only worked if that importer ran first.
      const CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      try {
        if (typeof _loadScript === "function") { await _loadScript(CDN); }
        else {
          await new Promise((res, rej) => {
            if (document.querySelector('script[src="' + CDN + '"]')) { res(); return; }
            const sc = document.createElement("script");
            sc.src = CDN; sc.onload = res; sc.onerror = rej;
            document.head.appendChild(sc);
          });
        }
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
      } catch (e) {}
      lib = window.pdfjsLib || (window.pdfjsDistBuildPdf && window.pdfjsDistBuildPdf);
    }
    if (!lib || !lib.getDocument) throw new Error("PDF reader isn't available here — reading a PDF needs an internet connection the first time");
    const pdf = await lib.getDocument({ data: buf }).promise;
    const blocks = [];
    for (let pg = 1; pg <= pdf.numPages; pg++) {
      const page = await pdf.getPage(pg);
      const tc = await page.getTextContent();
      let line = "";
      tc.items.forEach((it) => {
        line += it.str;
        if (it.hasEOL) { extractPlainLines(line).forEach((b) => blocks.push(b)); line = ""; }
      });
      if (line.trim()) extractPlainLines(line).forEach((b) => blocks.push(b));
    }
    return blocks;
  }
  // Plain text / markdown → [{level, text}] using markdown "#" and heading heuristics.
  function extractPlainLines(text) {
    const out = [];
    // If the doc uses markdown headings, trust ONLY those — don't let the short-line
    // heuristic mis-promote body lines (e.g. an NPC's "Name — role" line) to headings.
    const isMarkdown = /^#{1,4}\s+\S/m.test(text || "");
    (text || "").split(/\r?\n/).forEach((raw) => {
      const l = raw.trim();
      if (!l) return;
      const md = l.match(/^(#{1,4})\s+(.+)/);
      if (md) { out.push({ level: md[1].length, text: md[2].trim() }); return; }
      if (isMarkdown) { out.push({ level: null, text: l }); return; }
      // Plain text (no markdown): a short line with no terminal punctuation reads as a heading.
      const words = l.split(/\s+/).length;
      const headingish = l.length <= 62 && words <= 9 && !/[.!?,:;]$/.test(l) && /[A-Za-z]/.test(l);
      out.push({ level: headingish ? (l === l.toUpperCase() && l.length > 3 ? 0 : 2) : null, text: l });
    });
    return out;
  }

  function _availType(pref) {
    const ids = codexTypeIds();
    const map = { faction: ["faction", "organization"], timeline: ["timeline", "event", "history"],
                  lore: ["lore", "concept", "note"], char: ["char", "npc", "character"], loc: ["loc", "location", "place"] };
    for (const p of (map[pref] || [pref])) if (ids.includes(p)) return p;
    return ids.includes("lore") ? "lore" : ids[0];
  }
  function classifySection(title, body) {
    const t = (title || "").toLowerCase();
    if (/\b(council|houses?|order|guild|faction|company|court|conclave|senate|syndicate|cabal|clan)\b/.test(t)) return _availType("faction");
    if (/\b(history|timeline|era|age|war|founding|chronicle|sundering|calendar|the past)\b/.test(t)) return _availType("timeline");
    if (/\b(system|network|economy|law|religion|magic|culture|language|philosophy|the ride)\b/.test(t)) return _availType("lore");
    // A location doc's sections are places by default. (We deliberately DON'T guess
    // "person" from an em-dash in the title — this doc uses "Level 5 — The Threshold"
    // for places; real people arrive via "Key NPC" sections.)
    return _availType("loc");
  }
  function _sectionNpcs(sec) {
    const lines = sec.bodyLines || [];
    if (!lines.length) return [{ name: sec.title, body: sec.title }];
    const name = (lines[0].split(/[—–]|(?: - )/)[0] || lines[0]).trim();
    return [{ name: name || sec.title, body: lines.join("\n\n") }];
  }

  // Organizational sub-headers whose content belongs to their parent section,
  // not a folio of their own (so we don't spawn a dozen "Key Locations" entries).
  const _FOLD_HEADER = /^(key locations?|zones?|the ride|access(?: and fares)?|sensory texture|contents|table of contents|first impression|layout|notes?)$/i;
  const _NPC_HEADER  = /^(key npcs?|notable npcs?|key figures?)$/i;

  // Blocks → { title, intro, sections[] } with a level-based parent hierarchy.
  function parseDocStructure(blocks) {
    let title = "Imported document";
    const t0 = blocks.find((b) => b.level === 0);
    if (t0) title = t0.text;
    else if (blocks[0] && blocks[0].text.length <= 60) title = blocks[0].text; // first line, e.g. a doc title
    else { const h = blocks.find((b) => b.level !== null); if (h) title = h.text; }
    const sections = []; let intro = ""; let cur = null; const keyByLevel = {}; let idx = 0; let titleSkipped = false;
    blocks.forEach((b) => {
      if (!titleSkipped && b.text === title) { titleSkipped = true; return; } // drop the title line itself
      if (b.level !== null) {
        const tt = b.text.replace(/[*_`]/g, "").trim();
        // Fold organizational sub-headers into the current section's body.
        if (_FOLD_HEADER.test(tt) && !_NPC_HEADER.test(tt)) {
          if (cur) cur.bodyLines.push("## " + tt);
          else if (!/^(contents|table of contents)$/i.test(tt)) intro += (intro ? "\n\n" : "") + tt;
          return;
        }
        cur = { title: tt, level: b.level, bodyLines: [], _key: "_sec" + (idx++) };
        let pk = null;
        for (let lv = b.level - 1; lv >= 0; lv--) { if (keyByLevel[lv]) { pk = keyByLevel[lv]; break; } }
        cur._parentKey = pk;
        keyByLevel[b.level] = cur._key;
        Object.keys(keyByLevel).forEach((k) => { if (+k > b.level) delete keyByLevel[k]; });
        sections.push(cur);
      } else if (cur) { cur.bodyLines.push(b.text); }
      else { intro += (intro ? "\n\n" : "") + b.text; }
    });
    sections.forEach((s) => (s.body = s.bodyLines.join("\n\n")));
    // Fold a leading "Overview" section into the hub's intro.
    if (sections.length && /^(overview|introduction|summary)$/i.test(sections[0].title)) {
      const removedKey = sections[0]._key;
      intro = (intro ? intro + "\n\n" : "") + sections[0].body;
      sections.shift();
      sections.forEach((s) => { if (s._parentKey === removedKey) s._parentKey = null; });
    }
    if (!intro) intro = title;
    return { title, intro, sections };
  }

  function buildImportEntries(struct) {
    const out = [];
    const MAIN = "_imp_main";
    out.push({ _key: MAIN, parent: null, role: "main", name: struct.title, type: _availType("loc"),
               summary: firstSentence(struct.intro).slice(0, 150), body: struct.intro,
               tags: [...new Set(keywords(struct.intro))].slice(0, 5) });
    struct.sections.forEach((sec) => {
      const parent = sec._parentKey || MAIN;
      if (/key npcs?|notable npcs?|key figures?/i.test(sec.title)) {
        _sectionNpcs(sec).forEach((n, j) => out.push({ _key: sec._key + "_npc" + j, parent, role: "npc",
          name: n.name, type: _availType("char"), summary: firstSentence(n.body).slice(0, 150), body: n.body,
          tags: [] }));
        return;
      }
      out.push({ _key: sec._key, parent, role: "sub", name: sec.title, type: classifySection(sec.title, sec.body),
        summary: firstSentence(sec.body).slice(0, 150), body: sec.body || sec.title,
        tags: [...new Set(keywords(sec.body))].slice(0, 5) });
    });
    // Guard against runaway imports.
    return out.slice(0, 60);
  }

  function _linkRelated(childId, parentId) {
    const s = appState(); if (!s) return;
    const child = s.loreEntries.find((e) => e.id === childId);
    const parent = s.loreEntries.find((e) => e.id === parentId);
    if (!child || !parent) return;
    if (!Array.isArray(child.related)) child.related = [];
    if (!Array.isArray(parent.related)) parent.related = [];
    if (!child.related.some((r) => r.id === parentId)) child.related.push({ id: parentId, title: parent.title || parent.name, type: parent.type });
    if (!parent.related.some((r) => r.id === childId)) parent.related.push({ id: childId, title: child.title || child.name, type: child.type });
  }
  function commitImport(entries) {
    const s = appState(); if (!s) return { count: 0, mainId: null };
    if (!Array.isArray(s.loreEntries)) s.loreEntries = [];
    const idMap = {};
    entries.forEach((e) => { idMap[e._key] = commitDraft(e); });
    entries.forEach((e) => { if (e.parent && idMap[e.parent] && idMap[e._key]) _linkRelated(idMap[e._key], idMap[e.parent]); });
    persist();
    try { if (onLoreTab() && typeof renderLore === "function") renderLore(); } catch (e) {}
    const main = entries.find((e) => e.role === "main") || entries[0];
    return { count: entries.length, mainId: main ? idMap[main._key] : null };
  }

  function appendImportCard(imp) {
    const tm = typeMap();
    const card = document.createElement("div");
    card.className = "lib-import";
    const rows = imp.entries.map((e) => {
      const ic = (tm[e.type] && tm[e.type].icon) || "✦";
      return `<div class="lib-import-row ${e.role === "main" ? "" : "sub"}"><span class="t">${ic} ${esc(e.type)}</span><span>${esc(e.name)}</span></div>`;
    }).join("");
    card.innerHTML =
      `<div class="lib-import-top">📚 ${esc(imp.title)}</div>` +
      `<div class="lib-import-list">${rows}</div>` +
      `<div class="lib-import-acts">` +
        `<button class="lib-imp-file" style="flex:1;padding:9px 12px;font-size:.78rem;font-weight:700;border-color:rgba(96,160,200,.75);background:rgba(96,160,200,.22);color:#e6f0f8">＋ File all ${imp.entries.length} into the codex</button>` +
        `<button class="lib-imp-disc" style="border-color:rgba(255,255,255,.14);background:transparent;color:#8a8676">Dismiss</button>` +
      `</div>`;
    const fileBtn = card.querySelector(".lib-imp-file");
    const discBtn = card.querySelector(".lib-imp-disc");
    if (imp.filed) { fileBtn.textContent = "✓ Filed " + imp.entries.length + " folios"; fileBtn.disabled = true; }
    fileBtn.addEventListener("click", () => {
      const res = commitImport(imp.entries);
      imp.filed = true; fileBtn.textContent = "✓ Filed " + res.count + " folios"; fileBtn.disabled = true;
      toast("Filed " + res.count + " folios in the codex");
      // Take the keeper to the new hub folio so they can see it landed.
      if (res.mainId) setTimeout(() => gotoEntry(res.mainId), 350);
    });
    discBtn.addEventListener("click", () => {
      const idx = convo.findIndex((m) => m._import === imp);
      if (idx >= 0) { convo[idx]._import = null; redraw(); }
    });
    bodyEl.appendChild(card);
  }

  // Run the importer on parsed blocks and show the review card.
  function runImport(blocks, filename) {
    const struct = parseDocStructure(blocks);
    const entries = buildImportEntries(struct);
    if (entries.length <= 1) {
      // Not enough structure — fall back to a single filed folio.
      const only = entries[0];
      if (only) { convo.push({ role: "assistant", content: "This reads as a single passage, keeper — I've drawn it into one folio below.", draft: { name: only.name, type: only.type, summary: only.summary, body: only.body, tags: only.tags } }); }
      else { convo.push({ role: "assistant", content: "I couldn't find any text to file in that, keeper." }); }
      redraw(); return;
    }
    const subs = entries.filter((e) => e.role === "sub").length;
    const npcs = entries.filter((e) => e.role === "npc").length;
    const imp = { title: struct.title, entries: entries, filed: false };
    convo.push({ role: "assistant",
      content: "I've read **" + struct.title + "**" + (filename ? " (" + filename + ")" : "") +
        " and drawn it into a hub folio with " + subs + " sub-folio" + (subs === 1 ? "" : "s") +
        (npcs ? " and " + npcs + " notable figure" + (npcs === 1 ? "" : "s") : "") +
        ". Review the breakdown, then file it all — everything cross-links back to **" + struct.title + "**.",
      _import: imp });
    redraw();
  }

  async function handleImportFile(file) {
    const name = file.name || "document";
    const ext = (name.split(".").pop() || "").toLowerCase();
    convo.push({ role: "user", content: "📎 " + name });
    busy = true; redraw();
    let blocks = null, err = null;
    try {
      if (ext === "docx") blocks = await extractDocx(await file.arrayBuffer());
      else if (ext === "pdf") blocks = await extractPdf(await file.arrayBuffer());
      else blocks = extractPlainLines(await file.text());
    } catch (e) { err = e; }
    busy = false;
    if (err) { convo.push({ role: "assistant", content: "I couldn't read that file, keeper — " + (err.message || "unknown error") + ". Try a .txt, .md, .docx, or .pdf — or paste the text and say “file this.”" }); redraw(); return; }
    if (!blocks || !blocks.length) { convo.push({ role: "assistant", content: "That document came through empty, keeper. Try pasting the text instead." }); redraw(); return; }
    runImport(blocks, name);
  }

  // Does a pasted string look like a whole structured document (vs. one passage)?
  function looksLikeDocument(text) {
    if (!text) return false;
    // Explicit markdown structure is a clear "this is a document" signal.
    const mdHeadings = (text.match(/^#{1,4}\s+\S/gm) || []).length;
    if (mdHeadings >= 2) return true;
    if (text.length < 900) return false;
    const headings = extractPlainLines(text).filter((b) => b.level !== null).length;
    return headings >= 3;
  }

  // ── Router ────────────────────────────────────────────────────────────────
  function localEngine(text) {
    const t = (text || "").trim();
    const low = t.toLowerCase();
    if (!t) return "Ask, keeper, and I will read.";

    // greeting / help
    if (/^(hi|hello|hey|greetings|yo|help|what can you do|who are you)\b/.test(low)) {
      return OPENING;
    }
    // explicit "file / record / catalog this …" → auto-sort the pasted passage
    if (/^\s*(?:please\s+)?(?:file|record|catalog(?:ue)?|archive|store|sort|import|log)\b/i.test(t) &&
        (t.indexOf("\n") !== -1 || t.length > 55)) {
      return answerFile(t);
    }
    if (/\b(add|put|keep|drop|stash)\b[^\n]*\b(codex|archive|library|stacks|record|folio|catalog|catalogue)\b/i.test(low) &&
        (t.indexOf("\n") !== -1 || t.length > 80)) {
      return answerFile(t);
    }
    // An unlabelled pasted passage (not a question) → auto-sort & file it.
    // Checked BEFORE the keyword routes below so lore prose isn't mistaken for
    // an "audit"/"who rules"/"brief" command just because it mentions them.
    if (looksLikePaste(t)) {
      return answerFile(t);
    }
    // author / stub
    if (/\b(new entry|draft|stub|create|author|write me|write a|make (?:me )?an?|generate|add an?)\b/.test(low) &&
        /\b(entry|page|npc|character|location|place|faction|item|event|concept|history|stub|draft)\b/.test(low)) {
      return answerAuthor(t);
    }
    // audit / continuity
    if (/\b(audit|continuity|contradict|loose ends?|loose threads?|broken|inconsist|consisten|gaps?|orphans?|stubs?|check the (?:codex|canon|archive)|what(?:'s| is) missing)\b/.test(low)) {
      return answerAudit();
    }
    // compare two things ("compare X and Y", "does X agree with Y")
    let cm = t.match(/(?:compare|reconcile|cross[- ]?check)\s+(.+?)\s+(?:and|with|to|against|vs\.?)\s+(.+)$/i);
    if (cm) { const r = answerCompare(cm[1].trim().replace(/[?.!]+$/, ""), cm[2].trim().replace(/[?.!]+$/, "")); if (r) return r; }
    // power structure
    if (/\b(who (?:holds|has|wields|controls?) power|who (?:rules?|runs?|governs?|leads?)|power structure|in charge|who'?s in control|balance of power)\b/.test(low)) {
      return answerPower();
    }
    // brief / overview
    if (/\b(brief|overview|summar(?:y|ise|ize)|new player|catch (?:me|us) up|state of the (?:isles|world)|tell me about the world|what is this (?:world|setting)|the big picture|introduce)\b/.test(low)) {
      return answerBrief();
    }
    // default → recall
    return answerRecall(t);
  }

  // ── Send / receive (local engine — deterministic, no network) ─────────────
  async function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    convo.push({ role: "user", content: text });
    taEl.value = "";
    taEl.style.height = "auto";
    busy = true;
    redraw();

    // A pasted whole document → run the structured importer instead of the
    // single-folio filer (this is the fix for "File this" choking on big docs).
    if (looksLikeDocument(text)) {
      await new Promise((r) => setTimeout(r, 200));
      busy = false;
      runImport(extractPlainLines(text), null);
      return;
    }

    let reply = "";
    try {
      reply = localEngine(text);
    } catch (err) {
      console.error("[Librarian] engine error", err);
      reply = "The glass clouds, keeper — I stumbled in the stacks. Ask me again.";
    }
    // A brief, natural pause so the archivist appears to be reading.
    await new Promise((r) => setTimeout(r, 260 + Math.random() * 260));

    busy = false;
    const { clean, draft } = extractDraft(reply || "");
    convo.push({ role: "assistant", content: clean, draft: draft });
    redraw();
  }

  // ── Open/close ───────────────────────────────────────────────────────────
  function toggle() {
    if (!panel) build();
    const open = panel.classList.toggle("open");
    fabEl.style.display = open ? "none" : "flex";
    const badge = document.getElementById("lib-badge");
    if (badge) badge.style.display = "none";
    if (open) { updateCtx(); renderQuick(); setTimeout(() => taEl && taEl.focus(), 80); }
  }

  // Public: open the Librarian seeded with a question (used by lore buttons).
  function ask(seed) {
    if (!panel) build();
    if (!panel.classList.contains("open")) toggle();
    if (seed) { taEl.value = seed; taEl.focus(); }
  }

  // ── Tiny toast (uses app's #toast if present) ────────────────────────────
  function toast(msg) {
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = msg;
      t.classList.add("show", "ok");
      setTimeout(() => t.classList.remove("show", "ok"), 2200);
      return;
    }
    // Fallback toast if the host has none.
    let f = document.getElementById("lib-toast");
    if (!f) {
      f = document.createElement("div");
      f.id = "lib-toast";
      f.style.cssText =
        "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;" +
        "background:rgba(8,11,20,.97);border:1px solid rgba(67,201,141,.4);color:#43c98d;" +
        "font:.72rem 'JetBrains Mono',monospace;padding:8px 16px;border-radius:7px;pointer-events:none;" +
        "transition:opacity .2s;opacity:0;";
      document.body.appendChild(f);
    }
    f.textContent = msg;
    f.style.opacity = "1";
    clearTimeout(f._t);
    f._t = setTimeout(() => { f.style.opacity = "0"; }, 2200);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() { build(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Expose a small API.
  window.Librarian = {
    open: () => { if (!panel) build(); if (!panel.classList.contains("open")) toggle(); },
    ask,
    commitDraft,
    refresh: updateCtx,
  };
})();
