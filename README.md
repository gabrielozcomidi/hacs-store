# HACS Store

An app-store-style discovery panel for [HACS](https://hacs.xyz) (Home Assistant Community Store), added to your Home Assistant sidebar.

The stock HACS panel is a flat list with a search box — fine for finding something you already know the name of, poor for browsing. HACS Store adds the missing discovery layer on top of the catalog HACS already has:

- **Discover** — top repositories by stars/trending, category rails, and rule-based "Suggested for you" (missing companions of things you run, more of the categories you use, region-specific integrations).
- **Free-language search** — type what you want to *happen* ("how do I lower my power bill", "popups on my dashboard"), in English or Hebrew. Queries are expanded through a synonym map before searching, and every result says *why* it matched.
- **Detail pages** — stats, versions, categories, and the repo's README fetched from GitHub only when you ask for it.
- **Installed** — your repositories with update badges and one-at-a-time "Update all".

Installs, updates, and the catalog itself go through HACS over the websocket connection Home Assistant already has open. Nothing phones home: the only external hosts ever contacted are `brands.home-assistant.io` / `avatars.githubusercontent.com` (icons) and `raw.githubusercontent.com` (README, on demand).

## Requirements

- Home Assistant 2024.6 or newer
- [HACS](https://hacs.xyz) installed and working — this panel is a frontend for it, not a replacement

## Installation

### Via HACS (custom repository)

1. HACS → three-dot menu → **Custom repositories**
2. Add this repository's URL with type **Integration**
3. Install "HACS Store", restart Home Assistant
4. Settings → Devices & Services → **Add Integration** → "HACS Store" (one click, nothing to configure)

### Manual

1. Copy `custom_components/hacs_store/` into your Home Assistant `config/custom_components/` directory
2. Restart Home Assistant, then add the integration as above

A "HACS Store" item appears in the sidebar (admin users only).

## Make it yours: the two data files

HACS provides no taxonomy and no synonyms, so those live in two hand-editable files inside `custom_components/hacs_store/frontend/`:

- **`categories.json`** — maps `owner/repo` → 1–3 categories. This is the main lever over how Discover groups things; the first pass was generated from names/descriptions and is meant to be corrected by hand. The `_taxonomy` key lists the canonical category set.
- **`synonyms.json`** — maps words people type → terms that actually appear in the catalog ("bill" → energy, tariff, price…; Hebrew keys work the same way). If a search that should work doesn't, add a line here and it works from then on.

After editing, hard-refresh the browser (the files are served uncached).

## Architecture, briefly

```
custom_components/hacs_store/
├── __init__.py            # serves frontend/ as static files, registers the sidebar panel
├── config_flow.py         # one-click setup, no options
└── frontend/
    ├── hacs-store-panel.js  # the whole UI: one plain custom element, no framework
    ├── ha-data.js           # data source: HACS over websocket (list, download, installed map)
    ├── catalog.js           # alternate data source: public data-v2.hacs.xyz catalog (standalone use)
    ├── search.js            # hand-written scorer + synonym expansion (deliberately not Fuse.js)
    ├── recommend.js         # three suggestion rules, each with a human-readable reason
    ├── strings.js           # UI copy table
    ├── categories.json      # ← edit me
    └── synonyms.json        # ← edit me
```

The view layer never touches raw HACS/catalog objects — both data sources normalise into the same entry shape, so they are interchangeable. That's the Phase 1 → Phase 2 seam from the original design brief ([hacs-store-prompt.md](hacs-store-prompt.md)): the same UI can run standalone against the public catalog (`catalog.js`) or inside HA against HACS itself (`ha-data.js`, what it does today).

There is intentionally no build step, no dependencies, and no framework: the browser loads these files as-is, and the code is meant to be readable and editable by its owner. Development notes live in [CLAUDE.md](CLAUDE.md); known issues and the roadmap in [PLAN.md](PLAN.md).

## Development

Copy `custom_components/hacs_store/` to a test HA instance and restart. Frontend-only edits need a hard refresh; bump `version` in `manifest.json` when shipping frontend changes (it cache-busts the panel module). Syntax checks without any tooling:

```bash
python3 -m py_compile custom_components/hacs_store/*.py
for f in custom_components/hacs_store/frontend/*.js; do node --input-type=module --check < "$f"; done
```
