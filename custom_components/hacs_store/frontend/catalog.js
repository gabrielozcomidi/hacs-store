// catalog.js — the only file that knows where HACS data comes from.
//
// Phase 1: fetch the public static catalog from data-v2.hacs.xyz, cache it in
// localStorage with an ETag + TTL, and normalise each entry into a flat shape.
//
// Reality check (2026-09): data-v2.hacs.xyz sends no CORS headers, so a browser
// page can NOT fetch it directly — only HACS itself (server-side) can. In the
// browser, always pass fallbackUrl pointing at a bundled snapshot
// (catalog-sample.json); dev.html shows how.
// Phase 2: replace loadSection() with an HA websocket call to
// hacs/repositories/list. Nothing else in the app changes, because nothing else
// in the app ever sees a raw catalog object.
//
// Nothing here phones anywhere except data-v2.hacs.xyz.

export const SECTIONS = ["integration", "plugin", "theme", "template", "python_script", "appdaemon"];

const BASE = "https://data-v2.hacs.xyz";
const CACHE_PREFIX = "hacs-store:catalog:";
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// --- cache -----------------------------------------------------------------

function readCache(section) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + section);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // corrupt or storage disabled — behave as a cache miss
  }
}

function writeCache(section, payload) {
  try {
    localStorage.setItem(CACHE_PREFIX + section, JSON.stringify(payload));
  } catch {
    // quota exceeded: the catalog is large. Failing to cache is survivable.
  }
}

export function clearCache() {
  for (const s of SECTIONS) localStorage.removeItem(CACHE_PREFIX + s);
}

// --- fetch -----------------------------------------------------------------

// Returns { data, etag, source } where source is "network" | "cache" | "cache-stale".
async function loadSection(section, { ttlMs = DEFAULT_TTL_MS, force = false } = {}) {
  const cached = readCache(section);
  const fresh = cached && !force && Date.now() - cached.fetchedAt < ttlMs;
  if (fresh) return { data: cached.data, etag: cached.etag, source: "cache" };

  const headers = {};
  if (cached?.etag) headers["If-None-Match"] = cached.etag;

  try {
    const res = await fetch(`${BASE}/${section}/data.json`, { headers });

    // 304: our copy is still current, just stamp it fresh again.
    if (res.status === 304 && cached) {
      writeCache(section, { ...cached, fetchedAt: Date.now() });
      return { data: cached.data, etag: cached.etag, source: "cache" };
    }
    if (!res.ok) throw new Error(`${section}: HTTP ${res.status}`);

    const data = await res.json();
    const etag = res.headers.get("etag");
    writeCache(section, { fetchedAt: Date.now(), etag, data });
    return { data, etag, source: "network" };
  } catch (err) {
    // Offline or blocked: a stale catalog beats no catalog.
    if (cached) return { data: cached.data, etag: cached.etag, source: "cache-stale", error: err };
    throw err;
  }
}

// --- normalisation ---------------------------------------------------------

// Verified against a real slice of https://data-v2.hacs.xyz/integration/data.json.
// Three corrections to what the brief assumed:
//
//   1. There is NO top-level `name`. The display name is manifest.name, mirrored
//      as a top-level `manifest_name`.
//   2. `downloads` is SPARSE — most entries omit it entirely, and where present it
//      counts GitHub release-asset downloads only (values like 1, 175, 9281). It
//      cannot carry "Top integrations". Use popularity() instead.
//   3. `topics` is frequently absent, so it can't be relied on for categorisation.
//
// Fields the brief never mentioned but that are real and useful: manifest.country
// (ISO-3166 alpha-2 — gives Israel-specific for free), open_issues, last_commit,
// prerelease, etag_releases, last_fetched (unix seconds, not ISO).
function normalise(id, raw, section) {
  const full_name = raw.full_name || "";
  const owner = full_name.split("/")[0] || "";
  const repo = full_name.split("/")[1] || full_name;
  const manifest = raw.manifest || {};

  return {
    id,
    section,
    full_name,
    owner,
    name: manifest.name || raw.manifest_name || repo,
    description: raw.description || "",
    domain: raw.domain || null,
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    downloads: raw.downloads == null ? null : Number(raw.downloads), // null = not reported
    stars: Number(raw.stargazers_count ?? 0),
    open_issues: Number(raw.open_issues ?? 0),
    countries: Array.isArray(manifest.country) ? manifest.country : [],
    last_updated: raw.last_updated || null,
    last_version: raw.last_version || null,
    prerelease: raw.prerelease || null,
    last_commit: raw.last_commit || null,
    last_fetched: raw.last_fetched ? new Date(raw.last_fetched * 1000).toISOString() : null,
    // filled in by categories.json + country, not by HACS
    categories: []
  };
}

// Ranking signal for the "Top integrations" rail. Downloads would be the honest
// measure but most repos don't report it, so stars carry the ranking and downloads
// only break ties upward where they exist.
export function popularity(entry) {
  return (entry.stars || 0) + Math.log10(1 + (entry.downloads || 0)) * 50;
}

// Is this repo scoped to specific countries? Drives the Israel-specific category
// without any hand-curation.
export function countryCategories(entry, myCountry = "IL") {
  if (!entry.countries.length) return [];
  return entry.countries.includes(myCountry) ? ["Israel-specific"] : [];
}

// Icon URL, same two sources the HACS panel itself uses.
export function iconUrl(entry) {
  if (entry.domain) return `https://brands.home-assistant.io/${entry.domain}/icon.png`;
  return `https://avatars.githubusercontent.com/${entry.owner}?s=88`;
}

// --- public API ------------------------------------------------------------

export async function loadCatalog({
  sections = ["integration", "plugin"],
  categories = {},
  ttlMs,
  force = false,
  fallbackUrl = null // e.g. "./catalog-sample.json" when the network is unavailable
} = {}) {
  const entries = [];
  const meta = { sources: {}, errors: {}, observed: null };

  for (const section of sections) {
    try {
      const { data, source } = await loadSection(section, { ttlMs, force });
      meta.sources[section] = source;
      if (!meta.observed) meta.observed = observedKeys(data);
      for (const [id, raw] of Object.entries(data)) entries.push(normalise(id, raw, section));
    } catch (err) {
      meta.errors[section] = String(err.message || err);
    }
  }

  // Bundled snapshot so the UI is testable with no network at all.
  if (!entries.length && fallbackUrl) {
    const data = await (await fetch(fallbackUrl)).json();
    meta.sources.fallback = fallbackUrl;
    if (!meta.observed) meta.observed = observedKeys(data);
    for (const [id, raw] of Object.entries(data)) {
      entries.push(normalise(id, raw, raw.category || "integration"));
    }
  }

  for (const e of entries) {
    const curated = categories[e.full_name] || [];
    const fromCountry = countryCategories(e);
    e.categories = [...new Set([...curated, ...fromCountry])];
  }
  return { entries, meta };
}

// What keys does the live file actually have? Used by the harness to verify the
// schema against the brief instead of trusting it.
export function observedKeys(data) {
  const first = Object.values(data)[0];
  if (!first) return null;
  return {
    sampleRepo: first.full_name,
    keys: Object.keys(first).sort(),
    manifestKeys: first.manifest ? Object.keys(first.manifest).sort() : null
  };
}
