// atlas-data.jsx — seed content for the launcher mockup.
// Systems are full definitions the builder can render & edit. Campaigns each
// carry their own copy of a system (per the chosen architecture).

// ── System: Dungeons & Dragons 5.5 (formalized from the live app) ──
const SYS_5E = {
  id: "dnd-5-5",
  name: "Dungeons & Dragons 5.5e",
  abbr: "D&D 5.5",
  sigil: "diamond",
  accent: "#c8a050",
  version: "1.4.0",
  author: "House ruleset",
  tagline: "The d20 engine the Shattered Isles was built on.",
  description: "Five abilities, a d20 core, milestone-or-XP leveling and the classic four-coin economy. The default ruleset for every existing campaign.",
  terminology: {
    gm: "Dungeon Master", player: "Player", character: "Character",
    monster: "Monster", spell: "Spell", currency: "Coin",
    session: "Session", party: "Party",
  },
  dice: { core: "1d20", mode: "roll-over", advantage: "adv-dis", crit: "nat-20", target: "Armor Class", set: ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] },
  attributes: [
    { name: "Strength", abbr: "STR", default: 10, mod: "(score − 10) ÷ 2" },
    { name: "Dexterity", abbr: "DEX", default: 10, mod: "(score − 10) ÷ 2" },
    { name: "Constitution", abbr: "CON", default: 10, mod: "(score − 10) ÷ 2" },
    { name: "Intelligence", abbr: "INT", default: 10, mod: "(score − 10) ÷ 2" },
    { name: "Wisdom", abbr: "WIS", default: 10, mod: "(score − 10) ÷ 2" },
    { name: "Charisma", abbr: "CHA", default: 10, mod: "(score − 10) ÷ 2" },
  ],
  resources: [
    { name: "Hit Points", abbr: "HP" },
    { name: "Armor Class", abbr: "AC" },
    { name: "Hit Dice", abbr: "HD" },
  ],
  sheet: [
    { section: "Identity", fields: [["Name", "text"], ["Class & Level", "text"], ["Lineage", "text"], ["Background", "text"]] },
    { section: "Core", fields: [["Proficiency Bonus", "number"], ["Initiative", "number"], ["Speed", "number"], ["Inspiration", "toggle"]] },
    { section: "Combat", fields: [["Armor Class", "resource"], ["Hit Points", "resource"], ["Hit Dice", "resource"]] },
  ],
  leveling: {
    mode: "xp",
    table: [
      { level: 1, xp: 0 }, { level: 2, xp: 300 }, { level: 3, xp: 900 }, { level: 4, xp: 2700 },
      { level: 5, xp: 6500 }, { level: 6, xp: 14000 }, { level: 7, xp: 23000 }, { level: 8, xp: 34000 },
      { level: 9, xp: 48000 }, { level: 10, xp: 64000 }, { level: 11, xp: 85000 }, { level: 12, xp: 100000 },
      { level: 13, xp: 120000 }, { level: 14, xp: 140000 }, { level: 15, xp: 165000 }, { level: 16, xp: 195000 },
      { level: 17, xp: 225000 }, { level: 18, xp: 265000 }, { level: 19, xp: 305000 }, { level: 20, xp: 355000 },
    ],
    cap: 20,
  },
  currency: [
    { name: "Platinum", abbr: "pp", value: 1000 },
    { name: "Gold", abbr: "gp", value: 100 },
    { name: "Silver", abbr: "sp", value: 10 },
    { name: "Copper", abbr: "cp", value: 1 },
  ],
  bestiary: {
    fields: ["Armor Class", "Hit Points", "Speed", "STR/DEX/CON/INT/WIS/CHA", "Challenge Rating", "Actions", "Legendary Actions"],
    crLabel: "Challenge Rating",
    difficultyFormula: "XP budget × party size, scaled by encounter multiplier",
    crRows: [
      { cr: "0", prof: "+2", xp: 10 }, { cr: "1/8", prof: "+2", xp: 25 },
      { cr: "1/4", prof: "+2", xp: 50 }, { cr: "1/2", prof: "+2", xp: 100 },
      { cr: "1", prof: "+2", xp: 200 }, { cr: "2", prof: "+2", xp: 450 },
      { cr: "5", prof: "+3", xp: 1800 }, { cr: "10", prof: "+4", xp: 5900 },
      { cr: "17", prof: "+6", xp: 18000 }, { cr: "20", prof: "+6", xp: 25000 },
    ],
  },
  modules: {
    characters: true, crew: true, map: true, lore: true, combat: true,
    dmscreen: true, bestiary: true, calendar: true, quests: true, sessions: true, handouts: true,
  },
};

// ── System: Custom / Homebrew (blank canvas) ──
const SYS_BLANK = {
  id: "homebrew-blank",
  name: "Custom / Homebrew",
  abbr: "Homebrew",
  sigil: "wand",
  accent: "#9977cc",
  version: "0.1.0",
  author: "You",
  tagline: "An empty forge. Define every rule yourself.",
  description: "A blank ruleset with sensible scaffolding and nothing assumed. Bring your own dice, attributes, economy and progression.",
  terminology: {
    gm: "Game Master", player: "Player", character: "Character",
    monster: "Adversary", spell: "Ability", currency: "Currency",
    session: "Session", party: "Party",
  },
  dice: { core: "1d20", mode: "roll-over", advantage: "none", crit: "none", target: "Difficulty", set: ["d6"] },
  attributes: [
    { name: "Attribute One", abbr: "A1", default: 0, mod: "= score" },
    { name: "Attribute Two", abbr: "A2", default: 0, mod: "= score" },
    { name: "Attribute Three", abbr: "A3", default: 0, mod: "= score" },
  ],
  resources: [{ name: "Health", abbr: "HP" }],
  sheet: [
    { section: "Identity", fields: [["Name", "text"], ["Concept", "text"]] },
    { section: "Stats", fields: [["Health", "resource"]] },
  ],
  leveling: {
    mode: "milestone",
    table: [{ level: 1, xp: 0 }, { level: 2, xp: 0 }, { level: 3, xp: 0 }],
    cap: 10,
  },
  currency: [{ name: "Currency", abbr: "¤", value: 1 }],
  bestiary: {
    fields: ["Health", "Defense", "Threat"],
    crLabel: "Threat Tier",
    difficultyFormula: "Define your own encounter math",
    crRows: [{ cr: "Minor", prof: "—", xp: 0 }, { cr: "Standard", prof: "—", xp: 0 }, { cr: "Elite", prof: "—", xp: 0 }],
  },
  modules: {
    characters: true, crew: false, map: true, lore: true, combat: true,
    dmscreen: true, bestiary: true, calendar: false, quests: true, sessions: true, handouts: false,
  },
};

const SYSTEM_TEMPLATES = [SYS_5E, SYS_BLANK];

// ── Campaigns (the shelf of worlds) ──
const CAMPAIGNS = [
  {
    id: "shattered-isles",
    title: "The Shattered Isles",
    blurb: "Sky-pirates, a sleepless God-Queen, and islands that fell upward when the Sky cracked.",
    sysId: "dnd-5-5", sysName: "D&D 5.5", sysAbbr: "D&D 5.5", accent: "#c8a050", sysSigil: "diamond",
    status: "active",
    lastPlayed: "Today", lastPlayedSort: 0, created: "Sixth Age, Year 212",
    day: 168, sessions: 24,
    party: [
      { name: "Mirelle Vance", cls: "Storm Sorcerer", level: 7 },
      { name: "Brakka Stonewake", cls: "Forge Cleric", level: 7 },
      { name: "Quill Ashcourt", cls: "Swashbuckler", level: 6 },
      { name: "Vael", cls: "Gloom Ranger", level: 7 },
    ],
    gm: "You", players: 4,
    users: [
      { id: "u-si-1", name: "You", role: "gm", plays: "" },
      { id: "u-si-2", name: "Mara", role: "player", plays: "Mirelle Vance" },
      { id: "u-si-3", name: "Davin", role: "player", plays: "Brakka Stonewake" },
      { id: "u-si-4", name: "Tess", role: "player", plays: "Quill Ashcourt" },
      { id: "u-si-5", name: "Jon", role: "player", plays: "Vael" },
    ],
    real: "campaigns/The Shattered Isles/The Shattered Isles - My Campaign.html",
    ns: "siCampaign::",
    cover: { sigil: "compass", tint: "#1b2236" },
  },
];

// ── Self-host: connected players (mock live table) ──
const CONNECTED = [
  { name: "You", role: "Dungeon Master", color: "#c8a050", you: true, status: "host" },
  { name: "Mara", role: "Player · Mirelle", color: "#7c6fe0", status: "online" },
  { name: "Davin", role: "Player · Brakka", color: "#6fe08a", status: "online" },
  { name: "Tess", role: "Player · Quill", color: "#e06f7c", status: "idle" },
  { name: "Jon", role: "Player · Vael", color: "#6fd4e0", status: "offline" },
];

const BUNDLE = {
  version: "1.4.0",
  size: "9.2 MB",
  contents: [
    { file: "the-atlas.html", note: "The launcher + all your campaigns, self-contained", icon: "compass" },
    { file: "server.py", note: "Tiny Python sync server — shares live state across players", icon: "server" },
    { file: "start.command  ·  start.bat", note: "Double-click launchers for macOS / Windows", icon: "power" },
    { file: "data/", note: "Your campaign saves live here as plain JSON", icon: "folder" },
    { file: "README.md", note: "Five-minute setup guide", icon: "scroll" },
  ],
};

Object.assign(window, {
  SYS_5E, SYS_BLANK, SYSTEM_TEMPLATES, CAMPAIGNS, CONNECTED, BUNDLE,
});
