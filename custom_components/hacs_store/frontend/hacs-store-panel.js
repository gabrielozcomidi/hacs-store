// hacs-store-panel.js — the Home Assistant sidebar panel.
//
// A plain custom element. No framework, no build step: Home Assistant loads this
// file directly and hands it `hass`, which is our connection to HACS.
//
// The data layer (ha-data.js, search.js, recommend.js, strings.js) is shared
// verbatim with the standalone Phase 1 app. Only this view layer is new.

const BASE = new URL(".", import.meta.url).href;

const ICON = {
  bulb: "M9.5 18h5|M10.5 21h3|M12 3a6 6 0 0 0-3.4 10.9V16h6.8v-2.1A6 6 0 0 0 12 3Z",
  thermo: "M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  camera: "M3 8.5A2 2 0 0 1 5 6.5h2L8.4 4h7.2l1.4 2.5h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z|M12 15.7a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z",
  grid: "M4 4h6v6H4Z|M14 4h6v6h-6Z|M4 14h6v6H4Z|M14 14h6v6h-6Z",
  sliders: "M4 7h10|M18 7h2|M4 17h4|M12 17h8|M16 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z|M8 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z",
  code: "M9 7 4 12l5 5|M15 7l5 5-5 5",
  wifi: "M4 9.5a12 12 0 0 1 16 0|M7 13a8 8 0 0 1 10 0|M10 16.5a3.5 3.5 0 0 1 4 0|M12 20h.01",
  car: "M5 13.5 6.6 9A2 2 0 0 1 8.5 7.6h7A2 2 0 0 1 17.4 9L19 13.5V18h-2.5v-1.6h-9V18H5Z|M7.5 15.8h.01|M16.5 15.8h.01",
  cloud: "M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 10.2 3.9 3.9 0 0 1 16.6 18Z",
  music: "M9 18V6l10-2v12|M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z|M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z",
  pin: "M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z|M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  bell: "M6 17V11a6 6 0 1 1 12 0v6|M4.5 17h15|M10 20.5h4",
  star: "M12 3.5 14.6 9l6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8 9.4 9Z",
  home: "M4 11 12 4l8 7|M6.5 10v9h11v-9",
  box: "M4 7.5 12 4l8 3.5v9L12 20l-8-3.5Z|M4 7.5 12 11l8-3.5|M12 11v9",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z|m20 20-3.5-3.5"
};

const svg = (key, size = 21) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${
    (ICON[key] || ICON.star).split("|").map(d => `<path d="${d}"></path>`).join("")
  }</svg>`;

const CAT = {
  "Lighting": ["#fdf1d8", "#9a6a10", "bulb"],
  "Climate / HVAC": ["#e2eefa", "#1e648f", "thermo"],
  "Energy": ["#e4f2e6", "#2b6f41", "bolt"],
  "Security / Cameras": ["#fbe8e6", "#a63e3a", "camera"],
  "Media / Audio": ["#fdeef7", "#9c3c74", "music"],
  "Presence / Tracking": ["#e8eef7", "#3f5a8a", "pin"],
  "Vehicles": ["#eceeeb", "#4b544d", "car"],
  "Weather": ["#e6f1f6", "#2a637c", "cloud"],
  "Network / Infra": ["#e6f0f4", "#2a637c", "wifi"],
  "Dashboards / UI": ["#eae7fc", "#5546c9", "grid"],
  "Automation / Helpers": ["#f0eee9", "#6b5a3e", "sliders"],
  "Notifications": ["#fdeef7", "#9c3c74", "bell"],
  "Local-vendor bridges": ["#e6f0f4", "#2a637c", "wifi"],
  "Israel-specific": ["#e8eef7", "#3f5a8a", "pin"],
  "Developer tools": ["#eceeeb", "#4b544d", "code"]
};
const CAT_FALLBACK = ["#f2f4f1", "#6b746d", "star"];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmt = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n ?? 0);

const ago = (iso, t) => {
  if (!iso) return t("agoUnknown");
  const days = Math.round((Date.now() - new Date(iso)) / 864e5);
  if (days < 1) return t("agoToday");
  if (days < 30) return t("agoDays", days);
  if (days < 365) return t("agoMonths", Math.round(days / 30));
  return t("agoYears", Math.round(days / 365));
};

// Minimal README rendering: escape first, then promote a few constructs.
// Screenshots are kept (they are the most useful thing in a README); badges are not.
function renderMarkdown(md, base) {
  // READMEs are third-party content shown to an HA admin. Only http(s) URLs may
  // become live hrefs/srcs; any other scheme (javascript:, data:, …) is refused.
  // Relative paths resolve against the repo's raw.githubusercontent base.
  const abs = u => {
    if (/^https?:\/\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null; // some other scheme — never render it
    return base + u.replace(/^\.?\//, "");
  };
  const isBadge = u => /shields\.io|badgen|img\.badge|forthebadge|hacs_badge|my\.home-assistant\.io\/badges/i.test(u);

  return esc(md)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, alt, url) => {
      const src = abs(url);
      if (isBadge(url) || !src) return "";
      return `<img src="${src}" alt="${alt}" loading="lazy" class="md-img" />`;
    })
    .replace(/```([\s\S]*?)```/g, (_, c) => `<pre>${c.trim()}</pre>`)
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/^[-*] (.*)$/gm, "<div class='li'>• $1</div>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
      const href = abs(url);
      return href ? `<a href="${href}" target="_blank" rel="noreferrer">${text}</a>` : text;
    })
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "<div class='gap'></div>");
}

const STYLES = `
:host {
  /* Every colour is a variable. To follow your HA theme instead of this palette,
     replace the fallbacks below with the theme variables noted in each comment. */
  --hs-bg:      #eceeeb;  /* var(--primary-background-color) */
  --hs-surface: #ffffff;  /* var(--card-background-color) */
  --hs-sunken:  #f6f7f4;
  --hs-quiet:   #f2f4f1;
  --hs-line:    #eef0ec;  /* var(--divider-color) */
  --hs-text:    #171a18;  /* var(--primary-text-color) */
  --hs-dim:     #6b746d;  /* var(--secondary-text-color) */
  --hs-faint:   #9aa19b;  /* var(--disabled-text-color) */
  --hs-accent:  #7c6cf0;  /* var(--accent-color) */
  --hs-accent-soft: #eae7fc;
  --hs-accent-ink:  #5546c9;
  --hs-shadow: 0 1px 2px rgba(23,26,24,.04), 0 12px 26px -16px rgba(23,26,24,.2);
  --hs-shadow-hi: 0 2px 5px rgba(23,26,24,.06), 0 20px 38px -18px rgba(23,26,24,.28);

  display: block;
  height: 100vh;
  box-sizing: border-box;
  background: var(--hs-bg);
  color: var(--hs-text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
}

.shell { display: flex; height: 100%; box-sizing: border-box; padding: 14px 14px 14px 0; }
nav { width: 230px; flex: 0 0 230px; min-height: 0; overflow-y: auto;
      padding: 14px 12px 14px 22px; display: flex; flex-direction: column; gap: 26px; }
main { flex: 1; min-width: 0; min-height: 0; background: var(--hs-surface);
       border-radius: 22px; display: flex; flex-direction: column; overflow: hidden; }
.scroll { flex: 1; overflow-y: auto; overflow-x: hidden; }

.brand { display: flex; align-items: center; gap: 11px; padding: 6px 10px; }
.brand .mark { width: 30px; height: 30px; border-radius: 10px; background: var(--hs-text);
               display: grid; place-items: center; color: var(--hs-surface); }
.brand .name { font-weight: 800; font-size: 16px; letter-spacing: -0.01em; }

.navlist { display: flex; flex-direction: column; gap: 4px; }
.navitem { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px;
           cursor: pointer; font-weight: 600; font-size: 14px; color: var(--hs-dim); }
.navitem:hover { background: #e3e6e2; }
.navitem.on { background: var(--hs-surface); color: var(--hs-text);
              box-shadow: 0 1px 2px rgba(23,26,24,.06), 0 8px 18px -12px rgba(23,26,24,.25); }
.navitem .badge { margin-inline-start: auto; font-size: 12px; border-radius: 20px; padding: 4px 9px;
                  background: #e3e6e2; color: var(--hs-dim); }
.navitem .badge.hot { background: var(--hs-accent); color: #fff; }

.grouplabel { font-weight: 700; font-size: 11px; color: var(--hs-faint);
              letter-spacing: .06em; text-transform: uppercase; padding: 0 14px; }
.typeitem { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
            border-radius: 12px; cursor: pointer; font-weight: 500; font-size: 14px; color: var(--hs-dim); }
.typeitem:hover { background: #e3e6e2; color: var(--hs-text); }
.typeitem.on { background: #e3e6e2; color: var(--hs-text); font-weight: 700; }
.typeitem span { font-size: 12px; color: var(--hs-faint); }

.status { margin-top: auto; padding: 14px; border-radius: 14px; background: #e3e6e2;
          font-size: 12px; line-height: 1.6; color: var(--hs-dim); }
.status .sub { color: var(--hs-faint); }
.status button { margin-top: 8px; }

header { padding: 20px 30px; display: flex; align-items: center; gap: 16px;
         border-bottom: 1px solid #f3f5f1; }
.searchbar { flex: 1; max-width: 560px; display: flex; align-items: center; gap: 12px;
             background: var(--hs-quiet); border-radius: 99px; padding: 13px 20px; }
.searchbar input { flex: 1; min-width: 0; border: 0; background: transparent; font: inherit;
                   font-weight: 500; color: var(--hs-text); outline: none; }
.searchbar .hint { font-size: 12px; font-weight: 600; color: var(--hs-faint);
                   background: #e6e9e4; border-radius: 7px; padding: 5px 9px; cursor: pointer; }

h1.display { margin: 0; font-size: 52px; line-height: 1.02; font-weight: 800; letter-spacing: -0.035em; }
h2.section { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
p.lede { margin: 14px 0 0; max-width: 440px; color: var(--hs-dim); line-height: 1.6;
         font-weight: 500; text-wrap: pretty; }

.pad { padding: 0 30px; }
.rowhead { display: flex; align-items: center; gap: 14px; }
.note { font-size: 13px; font-weight: 500; color: var(--hs-faint); }
.seeall { margin-inline-start: auto; font-size: 13px; font-weight: 600; color: var(--hs-dim); cursor: pointer; }

.seg { display: flex; gap: 2px; background: var(--hs-quiet); border-radius: 99px; padding: 3px; }
.seg span { font-size: 13px; font-weight: 600; color: var(--hs-faint); border-radius: 99px;
            padding: 8px 15px; cursor: pointer; white-space: nowrap; }
.seg span.on { color: var(--hs-text); background: var(--hs-surface); box-shadow: 0 1px 2px rgba(23,26,24,.08); }

.pill { font-size: 14px; font-weight: 600; color: #454e48; background: var(--hs-quiet);
        border-radius: 99px; padding: 11px 17px; cursor: pointer; white-space: nowrap; }
.pill.on { background: var(--hs-text); color: var(--hs-surface); }
.pill.sm { font-size: 13px; padding: 8px 13px; }
.chips { display: flex; gap: 9px; flex-wrap: wrap; }

.rail { display: flex; gap: 16px; padding: 4px 30px 12px; overflow-x: auto; }
.card { box-sizing: border-box; flex: 0 0 296px; min-width: 0; background: var(--hs-surface);
        border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 15px;
        cursor: pointer; box-shadow: var(--hs-shadow); }
.card:hover { box-shadow: var(--hs-shadow-hi); }
.card.flat { flex: 1 1 auto; border: 1px solid var(--hs-line); box-shadow: none; }
.card.flat:hover { border-color: #dfe3dd; box-shadow: 0 12px 26px -18px rgba(23,26,24,.3); }

.tile { position: relative; width: 46px; height: 46px; flex: 0 0 46px; border-radius: 15px;
        display: grid; place-items: center; overflow: hidden; }
.tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
            padding: 20%; box-sizing: border-box; }
.tile.lg { width: 76px; height: 76px; flex-basis: 76px; border-radius: 22px; }
.tile.sm { width: 40px; height: 40px; flex-basis: 40px; border-radius: 13px; }

.cardhead { display: flex; gap: 13px; align-items: center; }
.cardname { font-size: 16px; font-weight: 700; letter-spacing: -0.012em;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cardowner { font-size: 12px; font-weight: 500; color: var(--hs-faint); margin-top: 4px;
             overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.carddesc { font-size: 14px; font-weight: 500; line-height: 1.55; color: var(--hs-dim);
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden; min-height: 43px; text-wrap: pretty; }
.stats { font-size: 13px; font-weight: 600; color: var(--hs-dim); }
.cardfoot { display: flex; align-items: center; justify-content: space-between; gap: 8px;
            padding-top: 15px; border-top: 1px solid var(--hs-line); }
.tag { font-size: 12px; font-weight: 600; color: var(--hs-dim); background: var(--hs-quiet);
       border-radius: 99px; padding: 7px 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

button.act { font: inherit; font-size: 13px; font-weight: 700; border-radius: 99px;
             padding: 10px 17px; cursor: pointer; white-space: nowrap;
             background: var(--hs-quiet); color: var(--hs-text); border: 1px solid var(--hs-quiet); }
button.act:hover { filter: brightness(.97); }
button.act.primary { background: var(--hs-accent); color: #fff; border-color: var(--hs-accent); }
button.act.ghost { background: transparent; color: var(--hs-faint); border-color: #e6e9e4; }
button.act.dark { background: var(--hs-text); color: var(--hs-surface); border-color: var(--hs-text); }
button.act[disabled] { cursor: default; opacity: .8; }

.hero { padding: 0 30px; display: flex; gap: 34px; align-items: flex-start; flex-wrap: wrap; }
.herobox { flex: 1 1 660px; min-width: 0; background: var(--hs-sunken); border-radius: 20px; padding: 22px; }
.sugg { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.sugg .card { flex: none; border-radius: 16px; padding: 16px; gap: 11px; }
.reason { font-size: 12px; font-weight: 600; line-height: 1.45; color: var(--hs-accent); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(292px, 1fr)); gap: 16px; }
.why { font-size: 12px; font-weight: 500; line-height: 1.45; color: var(--hs-accent-ink);
       background: #f4f2fe; border-radius: 10px; padding: 9px 12px; }
.facets { display: flex; gap: 22px; flex-wrap: wrap; align-items: flex-start;
          background: var(--hs-sunken); border-radius: 16px; padding: 16px 20px; }
.facet { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.facet > .grouplabel { padding: 0; white-space: nowrap; }
.xchip { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
         color: var(--hs-accent-ink); background: var(--hs-accent-soft); border-radius: 99px;
         padding: 8px 9px 8px 14px; cursor: pointer; }
.xchip b { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 99px;
           background: #dcd6fa; font-size: 12px; }

.empty { background: var(--hs-sunken); border-radius: 20px; padding: 40px;
         display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.empty b { font-size: 20px; letter-spacing: -0.015em; }
.empty p { margin: 0; max-width: 440px; color: var(--hs-dim); line-height: 1.6; font-weight: 500; }

.detailhead { display: flex; gap: 22px; align-items: flex-start; flex-wrap: wrap; }
.detailmain { flex: 1 1 380px; min-width: 0; }
.detailside { flex: 0 0 260px; display: flex; flex-direction: column; gap: 14px;
              background: var(--hs-sunken); border-radius: 20px; padding: 20px; }
.fact { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 13px; }
.fact .k { color: var(--hs-faint); font-weight: 500; }
.fact .v { color: var(--hs-text); font-weight: 600; text-align: right; }
.author { display: flex; align-items: center; gap: 10px; margin-top: 11px; }
.author img { width: 24px; height: 24px; border-radius: 99px; background: var(--hs-bg); }
.topic { font-size: 12px; font-weight: 500; color: var(--hs-faint); border: 1px solid var(--hs-line);
         border-radius: 99px; padding: 7px 12px; font-family: ui-monospace, SFMono-Regular, monospace; }

.readme { background: var(--hs-surface); border: 1px solid var(--hs-line); border-radius: 20px;
          padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.readme .body { max-width: 760px; line-height: 1.7; color: #454e48; overflow-wrap: anywhere; }
.readme h1 { font-size: 24px; margin: 0 0 10px; }
.readme h2 { font-size: 19px; margin: 24px 0 8px; }
.readme h3 { font-size: 16px; margin: 20px 0 8px; }
.readme pre { background: var(--hs-sunken); border-radius: 12px; padding: 14px; overflow-x: auto;
              font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; line-height: 1.6; }
.readme code { background: var(--hs-quiet); border-radius: 5px; padding: 2px 5px;
               font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; }
.readme .li { padding-left: 16px; margin: 4px 0; }
.readme .gap { height: 12px; }
.readme .md-img { max-width: 100%; border-radius: 12px; margin: 12px 0; display: block; }
.readme a { color: var(--hs-accent-ink); }

.irow { background: var(--hs-surface); border: 1px solid var(--hs-line); border-radius: 18px;
        padding: 16px 20px; display: flex; align-items: center; gap: 16px; cursor: pointer; }
.irow:hover { border-color: #dfe3dd; }
.ver { font-size: 13px; font-weight: 600; border-radius: 99px; padding: 8px 13px;
       white-space: nowrap; color: var(--hs-faint); background: var(--hs-quiet); }
.ver.stale { color: var(--hs-accent-ink); background: var(--hs-accent-soft); }
.banner { background: #f4f2fe; border-radius: 18px; padding: 18px 22px; display: flex;
          align-items: center; gap: 14px; flex-wrap: wrap; }
.banner b { font-size: 15px; color: var(--hs-accent-ink); }
.banner button { margin-inline-start: auto; }

.stack { display: flex; flex-direction: column; }
.g10 { gap: 10px; } .g14 { gap: 14px; } .g16 { gap: 16px; } .g20 { gap: 20px; } .g22 { gap: 22px; } .g38 { gap: 38px; }
.page { padding: 26px 30px 44px; }
.error { background: #fbe8e6; color: #a63e3a; border-radius: 16px; padding: 18px 22px;
         font-weight: 600; line-height: 1.5; }
`;

class HacsStorePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // One delegated click listener for the whole panel, attached once.
    // Replacing innerHTML on render clears child nodes but NOT listeners on the
    // shadow root itself, so adding this per render would stack a copy per
    // keystroke — and fire installs once per copy.
    this.shadowRoot.addEventListener("click", e => this._onClick(e));
    this._s = {
      loading: true, error: null, screen: "home", q: "", removed: [], sort: "relevance",
      type: "all", category: null, status: "any", within: "any", railMode: "starred",
      installedFilter: "all", detailId: null, entries: [], installed: {}, busy: {},
      readme: null, readmeState: "idle", recent: [], meta: null
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._started) { this._started = true; this._load(); }
  }
  get hass() { return this._hass; }

  async _load() {
    try {
      const [ha, searchMod, rec, str, cat, categories, synonyms] = await Promise.all([
        import(BASE + "ha-data.js"),
        import(BASE + "search.js"),
        import(BASE + "recommend.js"),
        import(BASE + "strings.js"),
        import(BASE + "catalog.js"), // only for popularity() — one ranking, not two copies
        fetch(BASE + "categories.json").then(r => r.json()),
        fetch(BASE + "synonyms.json").then(r => r.json())
      ]);
      this._mod = { ...ha, ...searchMod, ...rec, ...str, popularity: cat.popularity };
      this._categories = categories;
      this.t = str.translator("en");

      const { entries, installed, meta } = await ha.loadFromHacs(this._hass, { categories });
      this._provider = searchMod.createSearchProvider({ entries, synonyms });

      Object.assign(this._s, { loading: false, entries, installed, meta });
      this._render();
    } catch (err) {
      this._s.loading = false;
      this._s.error = String(err?.message || err);
      this._render();
    }
  }

  connectedCallback() {
    // ⌘K / Ctrl+K focuses the search box — the hint in the searchbar promises it.
    // Document-level because the panel itself rarely has focus; removed again in
    // disconnectedCallback so it doesn't linger when HA swaps panels.
    this._onKey ??= e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this._focused = true;
        this.shadowRoot.querySelector("input")?.focus();
      }
    };
    document.addEventListener("keydown", this._onKey);
    this._render();
  }

  disconnectedCallback() { document.removeEventListener("keydown", this._onKey); }

  set(patch) { Object.assign(this._s, patch); this._render(); }

  // --- data helpers ---------------------------------------------------------

  _entry(fullName) { return this._s.entries.find(e => e.full_name === fullName); }

  _style(entry) { return CAT[entry.categories[0]] || CAT_FALLBACK; }

  _iconUrl(entry) {
    return entry.domain
      ? `https://brands.home-assistant.io/${entry.domain}/icon.png`
      : `https://avatars.githubusercontent.com/${entry.owner}?s=88`;
  }

  _tile(entry, cls = "") {
    const [tint, fg, glyph] = this._style(entry);
    return `<div class="tile ${cls}" style="background:${tint};color:${fg}">${svg(glyph)}
      <img src="${esc(this._iconUrl(entry))}" alt="" loading="lazy"
           onerror="this.style.display='none'" /></div>`;
  }

  _buttonFor(entry) {
    const t = this.t;
    const have = this._s.installed[entry.full_name];
    if (this._s.busy[entry.full_name]) return { label: t("working"), cls: "", disabled: true };
    if (have && entry.last_version && have !== entry.last_version)
      return { label: t("update"), cls: "primary" };
    if (have) return { label: t("installedBtn"), cls: "ghost", disabled: true };
    return { label: t("install"), cls: "" };
  }

  _statLine(entry) {
    const bits = ["★ " + fmt(entry.stars)];
    if (entry.downloads) bits.push("↓ " + fmt(entry.downloads));
    return bits.join("  ·  ");
  }

  // --- actions --------------------------------------------------------------

  async _act(entry) {
    this.set({ busy: { ...this._s.busy, [entry.full_name]: true } });
    try {
      await this._mod.download(this._hass, entry, entry.last_version);
      this._s.installed[entry.full_name] = entry.last_version;
    } catch (err) {
      this._s.error = this.t("installFailed", { name: entry.full_name, err: err?.message || err });
    }
    const busy = { ...this._s.busy };
    delete busy[entry.full_name];
    this.set({ busy });
  }

  // One repo at a time: HACS handles a burst of parallel downloads badly, and
  // sequential updates also mean the busy flags on screen tell the truth.
  async _updateAll() {
    for (const [fn, v] of Object.entries(this._s.installed)) {
      const en = this._entry(fn);
      if (en && en.last_version && en.last_version !== v) await this._act(en);
    }
  }

  _open(entry) {
    this.set({ screen: "detail", detailId: entry.full_name, readme: null, readmeState: "idle" });
    this._loadReadme();
  }

  async _loadReadme() {
    const entry = this._entry(this._s.detailId);
    if (!entry) return;
    this.set({ readmeState: "loading" });
    for (const branch of ["HEAD", "master", "main"]) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${entry.full_name}/${branch}/README.md`);
        if (!res.ok) continue;
        const base = `https://raw.githubusercontent.com/${entry.full_name}/${branch}/`;
        this.set({ readme: renderMarkdown((await res.text()).slice(0, 20000), base), readmeState: "ok" });
        return;
      } catch { /* try the next branch name */ }
    }
    this.set({ readmeState: "error" });
  }

  _setQuery(q) {
    const trimmed = q.trim();
    const recent = trimmed && !this._s.recent.includes(trimmed)
      ? [trimmed, ...this._s.recent].slice(0, 5) : this._s.recent;
    this.set({ q, recent, screen: q ? "search" : this._s.screen, removed: [] });
  }

  // --- rendering ------------------------------------------------------------

  _card(entry, extra = "") {
    const b = this._buttonFor(entry);
    return `<div class="card ${extra ? "flat" : ""}" data-open="${esc(entry.full_name)}">
      <div class="cardhead">${this._tile(entry)}
        <div style="min-width:0;flex:1">
          <div class="cardname" dir="auto">${esc(entry.name)}</div>
          <div class="cardowner" dir="auto">${esc(entry.full_name)}</div>
        </div>
      </div>
      <div class="carddesc" dir="auto">${esc(entry.description)}</div>
      ${extra}
      <div class="stats">${this._statLine(entry)}</div>
      <div class="cardfoot">
        <span class="tag">${esc(entry.categories[0] ? this.t.category(entry.categories[0]) : this.t("uncategorised"))}</span>
        <button class="act ${b.cls}" data-act="${esc(entry.full_name)}" ${b.disabled ? "disabled" : ""}>${esc(b.label)}</button>
      </div>
    </div>`;
  }

  _railHtml(title, note, items, seeAll, modes) {
    if (!items.length) return "";
    return `<div class="stack g16">
      <div class="pad rowhead">
        <h2 class="section">${esc(title)}</h2>
        ${note ? `<span class="note">${esc(note)}</span>` : ""}
        ${modes || ""}
        ${seeAll ? `<span class="seeall" data-seeall="${esc(seeAll)}">${this.t("seeAll")} ${this.t.arrow}</span>` : ""}
      </div>
      <div class="rail">${items.map(e => this._card(e)).join("")}</div>
    </div>`;
  }

  _homeHtml() {
    const s = this._s, t = this.t;
    const { popularity } = this._mod;
    const visible = s.type === "all" ? s.entries : s.entries.filter(e => e.section === s.type);
    const pool = s.category ? visible.filter(e => e.categories.includes(s.category)) : visible;

    const byStars = a => [...a].sort((x, y) => popularity(y) - popularity(x));
    // No growth data in the catalog, so trending means well starred AND recently touched.
    const trend = e => (e.stars || 0) / (1 + ((Date.now() - new Date(e.last_updated || 0)) / 864e5) / 60);
    const byTrend = a => [...a].sort((x, y) => trend(y) - trend(x));

    const suggestions = this._mod.recommend({
      entries: s.entries, installed: s.installed, categories: this._categories, limit: 3, t
    });

    const modes = s.category ? "" : `<div class="seg">
      <span class="${s.railMode === "starred" ? "on" : ""}" data-mode="starred">${t("mostStarred")}</span>
      <span class="${s.railMode === "trending" ? "on" : ""}" data-mode="trending">${t("trending")}</span>
    </div>`;

    const allCats = [...new Set(s.entries.flatMap(e => e.categories))].sort();

    return `<div class="stack g38" style="padding:26px 0 44px">
      <div class="hero">
        <div style="flex:1 1 320px;min-width:0;padding-top:8px">
          <h1 class="display">${t("discover")}</h1>
          <p class="lede">${t("discoverSub")}</p>
        </div>
        <div class="herobox">
          <div class="rowhead" style="margin-bottom:16px">
            <h2 style="margin:0;font-size:17px;font-weight:700;letter-spacing:-0.01em">${t("suggestedFor")}</h2>
            <span class="note">${t("fromInstalled", Object.keys(s.installed).length)}</span>
          </div>
          <div class="sugg">${suggestions.map(x =>
            this._card(x.entry, `<div class="reason">${esc(x.reason)}</div>`)).join("") ||
            `<span class="note">${t("nothingToSuggest")}</span>`}</div>
        </div>
      </div>

      <div class="stack g14">
        <div class="pad"><h2 class="section">${t("byUse")}</h2></div>
        <div class="chips pad">
          <span class="pill ${!s.category ? "on" : ""}" data-cat="">${t("all")}</span>
          ${allCats.map(c => `<span class="pill ${s.category === c ? "on" : ""}" data-cat="${esc(c)}">${esc(t.category(c))}</span>`).join("")}
        </div>
      </div>

      ${this._railHtml(
        s.category ? t.category(s.category) : (s.railMode === "trending" ? t("trending") : t("mostStarred")),
        s.category ? t("filtered") : (s.railMode === "trending" ? t("trendingNote") : t("downloadsNote")),
        (s.railMode === "trending" ? byTrend(pool) : byStars(pool)).slice(0, 12),
        "", modes)}

      ${!s.category ? this._railHtml(t.category("Lighting"), "",
        byStars(visible.filter(e => e.categories.includes("Lighting"))).slice(0, 12), "Lighting", "") : ""}

      ${this._railHtml(t("newUpdated"), "",
        [...pool].sort((a, b) => new Date(b.last_updated || 0) - new Date(a.last_updated || 0)).slice(0, 12), "", "")}
    </div>`;
  }

  _searchHtml() {
    const s = this._s, t = this.t;
    if (!s.q.trim()) {
      const examples = t("trySamples");
      return `<div class="page stack g22">
        <div><h1 class="display" style="font-size:44px">${t("searchTitle")}</h1>
          <p class="lede">${t("searchSub")}</p></div>
        ${s.recent.length ? `<div class="stack g10">
          <div class="grouplabel" style="padding:0">${t("recent")}</div>
          <div class="chips">${s.recent.map(r => `<span class="pill" data-q="${esc(r)}">${esc(r)}</span>`).join("")}</div>
        </div>` : ""}
        <div class="stack g10">
          <div class="grouplabel" style="padding:0">${t("try")}</div>
          <div class="chips">${examples.map(x => `<span class="pill" data-q="${esc(x)}">${esc(x)}</span>`).join("")}</div>
        </div>
      </div>`;
    }

    const out = this._provider.search(s.q, { limit: 200, removed: s.removed });
    const typed = out.results.filter(r => s.type === "all" || r.entry.section === s.type);
    const facetCats = [...new Set(typed.flatMap(r => r.entry.categories))].sort().slice(0, 8);

    const cutoff = { any: null, month: 30, quarter: 90, year: 365 }[s.within];
    let list = typed.filter(r => {
      const e = r.entry, have = !!s.installed[e.full_name];
      if (s.status === "installed" && !have) return false;
      if (s.status === "missing" && have) return false;
      if (s.category && !e.categories.includes(s.category)) return false;
      if (cutoff && !(((Date.now() - new Date(e.last_updated || 0)) / 864e5) <= cutoff)) return false;
      return true;
    });
    if (s.sort === "stars") list = [...list].sort((a, b) => b.entry.stars - a.entry.stars);
    if (s.sort === "updated") list = [...list].sort((a, b) =>
      new Date(b.entry.last_updated || 0) - new Date(a.entry.last_updated || 0));

    const chips = out.expanded.flatMap(e => e.to.filter(x => !s.removed.includes(x)).slice(0, 5));

    const sorts = [["relevance", t("relevance")], ["stars", t("stars")], ["updated", t("updatedSort")]];

    return `<div class="page stack g20">
      <div class="rowhead" style="align-items:baseline;flex-wrap:wrap">
        <h1 class="display" style="font-size:34px" dir="auto">${esc(s.q)}</h1>
        <span class="note">${t("results", list.length)}</span>
        <div class="seg" style="margin-inline-start:auto">
          ${sorts.map(([k, l]) =>
            `<span class="${s.sort === k ? "on" : ""}" data-sort="${k}">${esc(l)}</span>`).join("")}
        </div>
      </div>

      ${chips.length ? `<div class="chips" style="align-items:center">
        <span class="grouplabel" style="padding:0">${t("alsoSearching")}</span>
        ${chips.map(c => `<span class="xchip" data-drop="${esc(c)}" dir="auto">${esc(c)}<b>×</b></span>`).join("")}
      </div>` : ""}

      <div class="facets">
        <div class="facet"><span class="grouplabel">${t("category")}</span>
          <div class="chips"><span class="pill sm ${!s.category ? "on" : ""}" data-cat="">${t("anyCategory")}</span>
          ${facetCats.map(c => `<span class="pill sm ${s.category === c ? "on" : ""}" data-cat="${esc(c)}">${esc(t.category(c))}</span>`).join("")}</div></div>
        <div class="facet"><span class="grouplabel">${t("status")}</span>
          <div class="chips">
            <span class="pill sm ${s.status === "any" ? "on" : ""}" data-status="any">${t("anyStatus")}</span>
            <span class="pill sm ${s.status === "installed" ? "on" : ""}" data-status="installed">${t("onlyInstalled")}</span>
            <span class="pill sm ${s.status === "missing" ? "on" : ""}" data-status="missing">${t("onlyNotInstalled")}</span>
          </div></div>
        <div class="facet"><span class="grouplabel">${t("updatedWithin")}</span>
          <div class="chips">${[["any", t("anytime")], ["month", t("month")], ["quarter", t("quarter")], ["year", t("year")]]
            .map(([k, l]) => `<span class="pill sm ${s.within === k ? "on" : ""}" data-within="${k}">${esc(l)}</span>`).join("")}</div></div>
      </div>

      ${list.length ? `<div class="grid">${list.slice(0, 60).map(r =>
        this._card(r.entry, `<div class="why" dir="auto">${esc(this._mod.explain(r, t))}</div>`)).join("")}</div>`
        : `<div class="empty"><b>${t("nothingMatched")}</b>
             <p>${t("nothingMatchedBody")}</p></div>`}
    </div>`;
  }

  _detailHtml() {
    const s = this._s, t = this.t;
    const d = this._entry(s.detailId);
    if (!d) return `<div class="page"><div class="empty"><b>${t("notFound")}</b></div></div>`;

    const b = this._buttonFor(d);
    const have = s.installed[d.full_name];
    const related = s.entries
      .filter(e => e.full_name !== d.full_name && e.categories.some(c => d.categories.includes(c)))
      .sort((x, y) => y.stars - x.stars).slice(0, 8);

    const facts = [
      [t("latest"), d.last_version || "—"],
      [t("youHave"), have || t("notInstalled")],
      [t("stars"), fmt(d.stars)],
      [t("downloads"), d.downloads ? fmt(d.downloads) : t("notReported")],
      [t("updatedFact"), ago(d.last_updated, t)],
      [t("openIssues"), String(d.open_issues)],
      [t("typeFact"), t(d.section)]
    ];

    const readmeNote = { idle: "", loading: t("readmeLoading"), ok: t("readmeOk"),
      error: t("readmeError") }[s.readmeState];

    return `<div class="page stack g22" style="padding-top:22px">
      <span class="pill sm" style="align-self:flex-start" data-back="1">${t.backArrow} ${t("back")}</span>

      <div class="detailhead">
        ${this._tile(d, "lg")}
        <div class="detailmain">
          <h1 class="display" style="font-size:38px" dir="auto">${esc(d.name)}</h1>
          <div class="author">
            <img src="https://avatars.githubusercontent.com/${esc(d.owner)}?s=48" alt="" loading="lazy" />
            <a href="https://github.com/${esc(d.owner)}" target="_blank" rel="noreferrer"
               style="font-weight:600;color:var(--hs-accent-ink);text-decoration:none">${esc(d.owner)}</a>
            <span class="note" dir="auto" style="font-family:ui-monospace,monospace">${esc(d.full_name)}</span>
          </div>
          <p class="lede" style="max-width:560px;color:#454e48;font-size:16px" dir="auto">${esc(d.description)}</p>
          <div class="chips" style="margin-top:16px">
            ${(d.categories.length ? d.categories.map(t.category) : [t("uncategorised")]).map(c => `<span class="tag">${esc(c)}</span>`).join("")}
          </div>
          ${d.topics.length ? `<div class="chips" style="margin-top:10px;gap:7px">
            ${d.topics.slice(0, 8).map(tp => `<span class="topic" dir="auto">${esc(tp)}</span>`).join("")}</div>` : ""}
        </div>
        <div class="detailside">
          <button class="act ${b.cls}" data-act="${esc(d.full_name)}" ${b.disabled ? "disabled" : ""}
                  style="padding:14px 20px;font-size:14px">${esc(b.label)}</button>
          ${facts.map(([k, v]) => `<div class="fact"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`).join("")}
          <a href="https://github.com/${esc(d.full_name)}" target="_blank" rel="noreferrer"
             style="color:var(--hs-accent-ink);text-decoration:none;font-weight:600;font-size:13px;padding-top:6px">${t("openOnGitHub")} ↗</a>
        </div>
      </div>

      <div class="readme">
        <div class="rowhead">
          <h2 style="margin:0;font-size:18px;font-weight:700">${t("readme")}</h2>
          <span class="note">${esc(readmeNote)}</span>
          <button class="act dark" data-readme="1" style="margin-inline-start:auto">
            ${s.readmeState === "ok" ? t("reload") : t("loadReadme")}</button>
        </div>
        ${s.readme ? `<div class="body" dir="auto">${s.readme}</div>`
          : `<div class="note">${s.readmeState === "loading" ? t("readmeFetching") : t("readmeNotLoaded")}</div>`}
      </div>

      ${related.length ? `<div class="stack g16">
        <h2 class="section">${t("related")}</h2>
        <div class="rail" style="padding-left:0;padding-right:0">${related.map(e => this._card(e)).join("")}</div>
      </div>` : ""}
    </div>`;
  }

  _installedHtml() {
    const s = this._s, t = this.t;
    const sections = ["integration", "plugin", "theme", "template"];
    const rows = Object.entries(s.installed).map(([fn, ver]) => {
      const e = this._entry(fn);
      if (!e) return null;
      const stale = !!(e.last_version && e.last_version !== ver);
      if (s.installedFilter === "updates" && !stale) return null;
      if (sections.includes(s.installedFilter) && e.section !== s.installedFilter) return null;
      return { e, ver, stale };
    }).filter(Boolean).sort((a, b) => b.stale - a.stale);

    const updateCount = Object.entries(s.installed)
      .filter(([fn, v]) => { const e = this._entry(fn); return e && e.last_version && e.last_version !== v; }).length;

    // Only offer section filters that would show something.
    const present = new Set(Object.keys(s.installed).map(fn => this._entry(fn)?.section));
    const filters = [["all", t("all")], ["updates", t("onlyUpdates")],
      ...sections.filter(k => present.has(k)).map(k => [k, t(k)])];

    return `<div class="page stack g20">
      <div><h1 class="display" style="font-size:44px">${t("installed")}</h1>
        <p class="lede">${t("installedNote", Object.keys(s.installed).length)}</p></div>

      <div class="chips">${filters.map(([k, l]) =>
        `<span class="pill ${s.installedFilter === k ? "on" : ""}" data-ifilter="${k}">${esc(l)}</span>`).join("")}</div>

      ${updateCount ? `<div class="banner">
        <b>${t("updatesAvailable", updateCount)}</b>
        <button class="act primary" data-updateall="1">${t("updateAll")}</button></div>` : ""}

      <div class="stack g10">${rows.map(({ e, ver, stale }) => {
        const b = this._buttonFor(e);
        return `<div class="irow" data-open="${esc(e.full_name)}">
          ${this._tile(e, "sm")}
          <div style="min-width:0;flex:1">
            <div class="cardname" dir="auto">${esc(e.name)}</div>
            <div class="cardowner" dir="auto" style="font-family:ui-monospace,monospace">${esc(e.full_name)}</div>
          </div>
          <span class="ver ${stale ? "stale" : ""}">${esc(stale ? ver + " → " + e.last_version : ver)}</span>
          <button class="act ${b.cls}" data-act="${esc(e.full_name)}" ${b.disabled ? "disabled" : ""}>${esc(b.label)}</button>
        </div>`;
      }).join("") || `<div class="empty"><b>${t("nothingHere")}</b><p>${t("nothingHereBody")}</p></div>`}</div>
    </div>`;
  }

  _render() {
    const s = this._s;
    const root = this.shadowRoot;

    // Before the modules finish loading there is no translator yet, so the
    // loading screen (and a load *failure*) render as a minimal shell.
    if (s.loading || !this.t) {
      root.innerHTML = `<style>${STYLES}</style><div class="shell"><main>
        <div class="page">${s.error
          ? `<div class="error">${esc(s.error)}</div>`
          : `<span class="note">Reading your catalog from HACS…</span>`}</div></main></div>`;
      return;
    }
    const t = this.t;

    const counts = sec => s.entries.filter(e => e.section === sec).length;
    const updateCount = Object.entries(s.installed)
      .filter(([fn, v]) => { const e = this._entry(fn); return e && e.last_version && e.last_version !== v; }).length;

    const nav = [
      ["home", t("discover"), "home", ""],
      ["search", t("search"), "search", ""],
      ["installed", t("installed"), "box", String(Object.keys(s.installed).length)]
    ];
    const types = [["all", t("all"), s.entries.length], ["integration", t("integration"), counts("integration")],
      ["plugin", t("plugin"), counts("plugin")], ["theme", t("theme"), counts("theme")],
      ["template", t("template"), counts("template")]];

    const body = s.error
      ? `<div class="page"><div class="error">${esc(s.error)}</div></div>`
      : s.screen === "home" ? this._homeHtml()
      : s.screen === "search" ? this._searchHtml()
      : s.screen === "detail" ? this._detailHtml()
      : this._installedHtml();

    root.innerHTML = `<style>${STYLES}</style>
    <div class="shell">
      <nav>
        <div class="brand"><div class="mark">${svg("home", 16)}</div><div class="name">${t("appName")}</div></div>
        <div class="navlist">${nav.map(([k, label, icon, badge]) => `
          <div class="navitem ${s.screen === k || (k === "home" && s.screen === "detail") ? "on" : ""}" data-nav="${k}">
            ${svg(icon, 19)}<span>${esc(label)}</span>
            ${badge ? `<span class="badge">${badge}</span>` : ""}
          </div>`).join("")}</div>

        <div class="stack" style="gap:6px">
          <div class="grouplabel">${t("type")}</div>
          ${types.map(([k, label, n]) => `
            <div class="typeitem ${s.type === k ? "on" : ""}" data-type="${k}">${esc(label)}<span>${n}</span></div>`).join("")}
        </div>

        <div class="status">
          ${updateCount ? t("updatesWaiting", updateCount) : t("upToDate")}
          <br /><span class="sub">${t("liveFromHacs", s.entries.length)}</span>
        </div>
      </nav>

      <main>
        <header>
          <div class="searchbar">
            ${svg("search", 17)}
            <input type="search" placeholder="${esc(t("searchPlaceholder"))}"
                   value="${esc(s.q)}" dir="auto" />
            <span class="hint" data-clear="1">${s.q ? esc(t("clear")) : "⌘K"}</span>
          </div>
        </header>
        <div class="scroll">${body}</div>
      </main>
    </div>`;

    this._bind();
  }

  _bind() {
    const input = this.shadowRoot.querySelector("input");
    if (input) {
      // Re-render replaces the node, so restore focus and caret after typing.
      if (this._focused) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
      input.addEventListener("focus", () => { this._focused = true; });
      input.addEventListener("blur", () => { this._focused = false; });
      input.addEventListener("input", e => this._setQuery(e.target.value));
      input.addEventListener("keydown", e => {
        if (e.key === "Escape" && input.value) { e.preventDefault(); this._setQuery(""); }
      });
    }
  }

  _onClick(e) {
    const hit = sel => e.composedPath().find(n => n.dataset && n.dataset[sel] !== undefined);
    const s = this._s;

    const act = hit("act");
    if (act) { e.stopPropagation(); const en = this._entry(act.dataset.act); if (en) this._act(en); return; }

    const drop = hit("drop");
    if (drop) return this.set({ removed: [...s.removed, drop.dataset.drop] });

    const nav = hit("nav");
    if (nav) return this.set({ screen: nav.dataset.nav, q: nav.dataset.nav === "search" ? s.q : "" });

    const type = hit("type");   if (type) return this.set({ type: type.dataset.type });
    const cat = hit("cat");     if (cat) return this.set({ category: cat.dataset.cat || null });
    const mode = hit("mode");   if (mode) return this.set({ railMode: mode.dataset.mode });
    const sort = hit("sort");   if (sort) return this.set({ sort: sort.dataset.sort });
    const st = hit("status");   if (st) return this.set({ status: st.dataset.status });
    const wi = hit("within");   if (wi) return this.set({ within: wi.dataset.within });
    const if_ = hit("ifilter"); if (if_) return this.set({ installedFilter: if_.dataset.ifilter });
    const q = hit("q");         if (q) return this._setQuery(q.dataset.q);
    const seeAll = hit("seeall"); if (seeAll) return this.set({ category: seeAll.dataset.seeall || null });
    const back = hit("back");   if (back) return this.set({ screen: s.q ? "search" : "home" });
    const clear = hit("clear"); if (clear) return this._setQuery("");
    const rm = hit("readme");   if (rm) return this._loadReadme();

    if (hit("updateall")) return this._updateAll();

    const open = hit("open");
    if (open) { const en = this._entry(open.dataset.open); if (en) this._open(en); }
  }
}

customElements.define("hacs-store-panel", HacsStorePanel);
