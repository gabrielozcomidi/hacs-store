// ha-data.js — the Phase 2 data source.
//
// Same job as catalog.js, different pipe: instead of fetching the public catalog
// over HTTP, ask HACS directly over the websocket connection Home Assistant
// already has open. The output shape is identical, so the UI cannot tell the
// difference and nothing downstream changed.
//
// HACS's websocket payload is not formally documented and has shifted between
// versions, so every field is read defensively and observedKeys() reports what
// actually arrived. If a column looks empty, run the probe in the panel footer
// and send me the keys.

const WS_LIST = "hacs/repositories/list";
const WS_DOWNLOAD = "hacs/repository/download";

// Map HACS's own category names onto the section names the UI uses.
const SECTION = {
  integration: "integration",
  plugin: "plugin",
  theme: "theme",
  template: "template",
  python_script: "python_script",
  appdaemon: "appdaemon"
};

function normalise(raw) {
  const full_name = raw.full_name || "";
  const owner = full_name.split("/")[0] || "";
  const repo = full_name.split("/")[1] || full_name;

  return {
    id: String(raw.id ?? full_name),
    section: SECTION[raw.category] || raw.category || "integration",
    full_name,
    owner,
    name: raw.name || raw.manifest_name || repo,
    description: raw.description || "",
    domain: raw.domain || null,
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    downloads: raw.downloads == null ? null : Number(raw.downloads),
    stars: Number(raw.stars ?? raw.stargazers_count ?? 0),
    open_issues: Number(raw.open_issues ?? 0),
    countries: Array.isArray(raw.country) ? raw.country : [],
    last_updated: raw.last_updated || null,
    // HACS distinguishes the version you have from the one available; the store
    // only needs "latest", and the installed map carries what you're running.
    last_version: raw.available_version || raw.last_version || raw.installed_version || null,
    prerelease: raw.prerelease || null,
    last_commit: raw.last_commit || null,
    categories: [],

    // HACS-only fields the public catalog has no equivalent for.
    hacsId: raw.id,
    isInstalled: !!raw.installed,
    installedVersion: raw.installed_version || null
  };
}

export function observedKeys(list) {
  const first = list[0];
  if (!first) return null;
  return { sampleRepo: first.full_name, keys: Object.keys(first).sort() };
}

// Returns the same { entries, meta } contract as catalog.js, plus the installed
// map HACS already knows about — no need to guess or seed it any more.
export async function loadFromHacs(hass, { categories = {} } = {}) {
  const list = await hass.callWS({ type: WS_LIST });

  const entries = list.map(normalise);
  const installed = {};
  for (const e of entries) {
    if (e.isInstalled) installed[e.full_name] = e.installedVersion || e.last_version;
  }

  for (const e of entries) {
    const curated = categories[e.full_name] || [];
    const fromCountry = e.countries.includes("IL") ? ["Israel-specific"] : [];
    e.categories = [...new Set([...curated, ...fromCountry])];
  }

  return {
    entries,
    installed,
    meta: { sources: { hacs: "websocket" }, errors: {}, observed: observedKeys(list) }
  };
}

// The real install. HACS does the work and fires its own events; we just wait.
export async function download(hass, entry, version) {
  return hass.callWS({
    type: WS_DOWNLOAD,
    repository: entry.hacsId ?? entry.id,
    ...(version ? { version } : {})
  });
}
