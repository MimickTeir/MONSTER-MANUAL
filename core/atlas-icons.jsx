// atlas-icons.jsx — stroke-based sigils for The Atlas launcher.
// Superset of the codex icon set + launcher-specific glyphs. currentColor aware.

const Sigil = ({ name, size = 22, stroke = 1.5, style, className }) => {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round", style, className,
  };
  switch (name) {
    // ── world / lore glyphs (from the codex set) ──
    case "compass": return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 5l2 5-2 7-2-7z" fill="currentColor" stroke="none" opacity=".55"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>);
    case "crown": return (<svg {...common}><path d="M3 16l2-9 4 4 3-7 3 7 4-4 2 9z"/><path d="M4 19h16"/></svg>);
    case "skull": return (<svg {...common}><path d="M5 11a7 7 0 0 1 14 0v4a2 2 0 0 1-2 2h-1v3h-2v-2h-4v2H8v-3H7a2 2 0 0 1-2-2z"/><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>);
    case "claw": return (<svg {...common}><path d="M6 4c0 5 1 8 3 10s4 3 6 3"/><path d="M10 3c0 5 0 8 2 11s4 4 7 4"/><path d="M14 3c0 5-1 9 1 12s4 4 6 4"/></svg>);
    case "eye": return (<svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>);
    case "fracture": return (<svg {...common}><path d="M3 8h6l2 4-3 3 5 1 4-6h4"/><path d="M9 2v4M15 18v4"/></svg>);
    case "gear": return (<svg {...common}><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2"/></svg>);
    case "rune": return (<svg {...common}><path d="M6 3v18M6 8l6-3 6 3M6 14l6-3 6 3M6 20l6-3 6 3"/></svg>);
    case "book": return (<svg {...common}><path d="M4 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/></svg>);
    case "figure": return (<svg {...common}><circle cx="12" cy="7" r="3.2"/><path d="M5 21c1-4 4-6 7-6s6 2 7 6"/></svg>);
    case "banner": return (<svg {...common}><path d="M5 3h14v14l-7-3-7 3z"/><path d="M9 7h6"/></svg>);
    case "hourglass": return (<svg {...common}><path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9"/><path d="M17 3c0 5-5 6-5 9s5 4 5 9"/></svg>);
    case "sun": return (<svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2"/></svg>);
    case "diamond": return (<svg {...common}><path d="M12 2l9 10-9 10L3 12z"/><path d="M3 12h18"/></svg>);
    case "quill": return (<svg {...common}><path d="M20 3c-7 1-12 6-13 13l-3 5h6c7-1 11-6 13-12z"/><path d="M5 19l4-4"/></svg>);
    case "anchor": return (<svg {...common}><circle cx="12" cy="5" r="2.2"/><path d="M12 7v14"/><path d="M5 14a7 7 0 0 0 14 0"/><path d="M8 11h8"/></svg>);
    case "moon": return (<svg {...common}><path d="M20 14a8 8 0 1 1-9-11 6.5 6.5 0 0 0 9 11z"/></svg>);
    case "tower": return (<svg {...common}><path d="M7 21V8l5-4 5 4v13"/><path d="M4 21h16M10 21v-5h4v5M9 11h6"/></svg>);
    case "scroll": return (<svg {...common}><path d="M6 4h11a2 2 0 0 1 2 2v11a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2z"/><path d="M6 4a2 2 0 0 0-2 2v1h4M10 9h6M10 13h6"/></svg>);

    // ── UI / chrome glyphs ──
    case "search": return (<svg {...common}><circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/></svg>);
    case "plus": return (<svg {...common}><path d="M12 5v14M5 12h14"/></svg>);
    case "close": return (<svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>);
    case "check": return (<svg {...common}><path d="M5 13l4 4L19 7"/></svg>);
    case "chevron-left": return (<svg {...common}><path d="M15 6l-6 6 6 6"/></svg>);
    case "chevron-right": return (<svg {...common}><path d="M9 6l6 6-6 6"/></svg>);
    case "chevron-down": return (<svg {...common}><path d="M6 9l6 6 6-6"/></svg>);
    case "arrow-right": return (<svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
    case "arrow-left": return (<svg {...common}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>);
    case "spark": return (<svg {...common}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l4 4M14 14l4 4M18 6l-4 4M10 14l-4 4"/></svg>);
    case "dots": return (<svg {...common}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>);
    case "grid": return (<svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>);
    case "list": return (<svg {...common}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>);
    case "grip": return (<svg {...common}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/></svg>);
    case "sliders": return (<svg {...common}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M16 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>);
    case "layers": return (<svg {...common}><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/></svg>);

    // ── domain glyphs for systems / hosting ──
    case "dice": return (<svg {...common}><path d="M12 2l8.5 5v10L12 22 3.5 17V7z"/><path d="M12 2v20M3.5 7L12 12l8.5-5"/><circle cx="8" cy="9.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none"/></svg>);
    case "sword": return (<svg {...common}><path d="M14.5 3.5L20 3l-.5 5.5-9 9-3 .5.5-3z"/><path d="M5 19l3 3M7 17l-4 4"/></svg>);
    case "shield": return (<svg {...common}><path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6z"/></svg>);
    case "heart": return (<svg {...common}><path d="M12 20s-7-4.5-9.5-9C.8 7.5 3 4 6.5 4 9 4 12 6.5 12 6.5S15 4 17.5 4C21 4 23.2 7.5 21.5 11c-2.5 4.5-9.5 9-9.5 9z"/></svg>);
    case "coins": return (<svg {...common}><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3"/><path d="M3 12c0 1.7 2.7 3 6 3"/><circle cx="16" cy="15" r="5"/></svg>);
    case "scales": return (<svg {...common}><path d="M12 4v16M7 20h10M5 7h14M12 4l-7 3 2 4a3 3 0 0 0 5 0z" /><path d="M12 4l7 3-2 4a3 3 0 0 1-5 0z"/></svg>);
    case "ladder": return (<svg {...common}><path d="M7 2v20M17 2v20M7 7h10M7 12h10M7 17h10"/></svg>);
    case "stat": return (<svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 16V9M12 16v-4M17 16v-7"/></svg>);
    case "attr": return (<svg {...common}><circle cx="12" cy="8" r="4"/><path d="M12 12v9M8 16h8"/></svg>);
    case "terminology": return (<svg {...common}><path d="M4 6h16M4 12h10M4 18h7"/><path d="M16 16l2 2 4-4"/></svg>);

    // ── hosting glyphs ──
    case "server": return (<svg {...common}><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>);
    case "download": return (<svg {...common}><path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>);
    case "upload": return (<svg {...common}><path d="M12 21V9M7 13l5-5 5 5"/><path d="M4 4h16"/></svg>);
    case "link": return (<svg {...common}><path d="M9 15l6-6"/><path d="M11 7l1-1a4 4 0 0 1 6 6l-1 1"/><path d="M13 17l-1 1a4 4 0 0 1-6-6l1-1"/></svg>);
    case "globe": return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9z"/></svg>);
    case "terminal": return (<svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/></svg>);
    case "power": return (<svg {...common}><path d="M12 4v8"/><path d="M7.5 7a7 7 0 1 0 9 0"/></svg>);
    case "users": return (<svg {...common}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2A3.2 3.2 0 0 1 16 11.5M21 20c0-2.6-1.5-4.5-4-5.2"/></svg>);
    case "copy": return (<svg {...common}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>);
    case "trash": return (<svg {...common}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>);
    case "archive": return (<svg {...common}><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg>);
    case "play": return (<svg {...common}><path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/></svg>);
    case "folder": return (<svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>);
    case "info": return (<svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>);
    case "lock": return (<svg {...common}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>);
    case "swap": return (<svg {...common}><path d="M7 4L3 8l4 4"/><path d="M3 8h13a4 4 0 0 1 0 8h-2"/><path d="M17 20l4-4-4-4"/><path d="M21 16H8"/></svg>);
    case "wand": return (<svg {...common}><path d="M5 19l9-9M14 6l1.5-1.5M18 10l1.5-1.5M19 16l1 1M9 4l1 1"/><path d="M15 7l2 2"/></svg>);

    default: return (<svg {...common}><circle cx="12" cy="12" r="8"/></svg>);
  }
};

Object.assign(window, { Sigil });
