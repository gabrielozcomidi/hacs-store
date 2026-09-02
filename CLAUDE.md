# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"HACS Store" — a Home Assistant custom integration that adds an app-store-style discovery panel for HACS (Home Assistant Community Store) to the HA sidebar. The full design brief lives in [hacs-store-prompt.md](hacs-store-prompt.md); read it before adding features — it lists hard constraints ("Do not" section) including: no cloud APIs, no build tooling, and no features beyond the brief without asking.

The owner is an AV/IT engineer and HA power user, not a professional developer. Keep code readable: clear structure, comments only on non-obvious decisions, no clever abstractions, no new dependencies or frameworks.

## No build, no tests — how to develop

There is intentionally **no build step, no package manager, no lint config, and no test suite**. The frontend is plain ES modules loaded directly by the browser; the Python side is a standard HA custom component.

The fastest way to see UI changes is the **standalone dev harness** — the real panel with a fake `hass` fed from a bundled 150-entry snapshot of the live catalog, no HA server needed:

```bash
cd custom_components/hacs_store/frontend && python3 -m http.server 8177
```

then open `http://localhost:8177/dev.html`. Refresh the snapshot with `python3 scripts/refresh-snapshot.py`. Important constraint discovered in testing: **data-v2.hacs.xyz sends no CORS headers**, so a browser can never fetch the catalog directly — anything browser-side must use the snapshot (`loadCatalog`'s `fallbackUrl`) or the HACS websocket.

To try changes for real, copy `custom_components/hacs_store/` into a Home Assistant `config/custom_components/` directory and restart HA (frontend-only edits need only a browser hard-refresh — static files are served with `cache_headers=False`, but the panel module URL is cache-busted by the `version` in `manifest.json`, so bump it when the panel file changes for other browsers). The integration requires HACS to be installed (declared in `manifest.json` dependencies) and is added via the UI config flow (one click, no options).

Quick syntax checks with no tooling installed:

```bash
python3 -m py_compile custom_components/hacs_store/*.py
for f in custom_components/hacs_store/frontend/*.js; do node --check "$f"; done
python3 -m json.tool custom_components/hacs_store/frontend/categories.json > /dev/null
python3 -m json.tool custom_components/hacs_store/frontend/synonyms.json > /dev/null
```

(`node --check` doesn't parse ES modules by default; if it complains about `export`, use `node --input-type=module --check < file.js`.)

## Architecture

The Python side does almost nothing; the browser does everything.

- **Python shell** (`__init__.py`, `config_flow.py`, `const.py`): serves the `frontend/` folder as static files at `/hacs_store_frontend` and registers a `panel_custom` sidebar panel pointing at `hacs-store-panel.js`. That's it — no entities, no coordinator, no polling.
- **View layer** (`frontend/hacs-store-panel.js`): one plain custom element (`<hacs-store-panel>`), shadow DOM, no framework. It holds all UI state in `this._s`, re-renders the whole panel via `innerHTML` on every state change (`set()`), and restores search-input focus manually after each render. Four screens switched by `_s.screen`: home (Discover), search, detail, installed. HA hands it `hass`; the first `hass` assignment triggers `_load()`.
- **Data layer** — two interchangeable sources producing the **same normalized entry shape** (`{id, section, full_name, owner, name, description, domain, topics, downloads, stars, countries, last_updated, last_version, categories, ...}`):
  - `frontend/ha-data.js` — **what the panel actually uses.** Calls HACS over the websocket (`hacs/repositories/list`, `hacs/repository/download`) via `hass.callWS`. Also returns the live `installed` map and adds `hacsId`/`isInstalled`/`installedVersion`.
  - `frontend/catalog.js` — the Phase 1 standalone source: fetches `https://data-v2.hacs.xyz/<section>/data.json` with localStorage ETag/TTL caching. Kept so the UI can run outside HA; nothing in the panel imports it today.

  This split is deliberate (brief: "UI layer independent of the data layer"). Never let the view layer touch raw HACS/catalog objects — normalize in the data module.
- **Search** (`frontend/search.js`): hand-written ~60-line scorer, deliberately *not* Fuse.js (no dependency, no CDN). Pipeline: tokenize (strip stopwords, incl. Hebrew) → expand via `synonyms.json` → score fields with weights (whole-word 1.0, substring 0.6, synonym hit ×0.75) → tiny popularity nudge. The provider contract is `createSearchProvider(...)` → `{ search(query) → { results, expanded } }`; Phase 2 may swap in a local-embeddings provider behind the same contract. Every result carries `matches` so the UI can say *why* it matched (`explain()`).
- **Recommendations** (`frontend/recommend.js`): three ordered rules — missing companion from the hand-maintained `PAIRS` map, same-category-as-installed, country-scoped ("Israel-specific"). Every suggestion must carry a human-readable reason.
- **Editable data files** (meant to be hand-edited by the owner, preserve their `_readme` keys):
  - `frontend/categories.json` — curated `full_name → [categories]` taxonomy (HACS provides none). The `_taxonomy` list is the canonical category set, also mirrored in the `CAT` icon/color map in the panel.
  - `frontend/synonyms.json` — query-expansion map incl. Hebrew keys, plus `_stopwords`.
- **Strings** (`frontend/strings.js`): translation table + `translator()`. All visible panel copy goes through `t()` — never hardcode a user-facing string in the panel (the only exception is the pre-module-load loading/error shell, which renders before strings.js is imported). Adding a language means adding a block alongside `en`.

### Data facts worth knowing (verified against the live catalog, see comments in catalog.js)

- The public catalog has **no top-level `name`** (use `manifest.name`/`manifest_name`), `downloads` is **sparse** (most repos omit it — never rank by it alone; use `popularity()` = stars + log-scaled downloads), and `topics` is frequently absent.
- `manifest.country` (ISO-3166) drives the Israel-specific category with no curation.
- HACS's websocket payload is undocumented and shifts between versions — read every field defensively (as `ha-data.js` does) and keep `observedKeys()` working; it's the debugging probe.

### Network policy

The only allowed external hosts are `data-v2.hacs.xyz` (catalog), `brands.home-assistant.io` + `avatars.githubusercontent.com` (icons), and `raw.githubusercontent.com` (README, fetched **only on user demand**). Nothing else may be contacted, ever.

### RTL / Hebrew

Hebrew search must keep working (see synonyms.json and the Hebrew stopwords). User-content elements use `dir="auto"`; layout uses logical properties (`margin-inline-start`) — keep both habits.

## Conventions

- All colors in the panel are CSS custom properties (`--hs-*`) with comments mapping them to HA theme variables — keep new colors in that system.
- All HTML built via template strings must escape user/catalog content through `esc()`; `data-*` attributes drive event handling via one delegated click listener.
- `manifest.json` `version` doubles as the frontend cache-buster — bump it on any frontend change that ships.
