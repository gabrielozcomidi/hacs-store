# Prompt: "HACS Store" — a modern integration store for Home Assistant

## Role
You are a senior product designer + frontend engineer. Design and build a modern, app-store-style discovery UI for HACS (Home Assistant Community Store). The existing HACS panel is a flat list with a search box; it is functional but poor for browsing and discovery. Build something that feels like a polished mobile/desktop app store — think the "store UI" genre on Dribbble: hero/featured band, horizontal category rails, rich cards with icon, name, one-line pitch, stats, and a clear install action — but restrained, dark, and graphite, not glossy.

## Who I am / constraints
- I am an AV/IT engineer and Home Assistant power user, not a professional developer. Code must be readable and maintainable by me: clear structure, comments on non-obvious decisions, no clever abstractions.
- Local-first, open-source, no cloud services. Nothing may phone home except fetching HACS's own public catalog (same as HACS does today).
- Runs on my HA server. Phase 1 = standalone SPA; Phase 2 = HA custom panel. Keep the UI layer independent of the data layer so Phase 2 is a swap, not a rewrite.

## Data source (real — use its schema for mock data)
HACS publishes its catalog as static JSON:
`https://data-v2.hacs.xyz/<section>/data.json` where section ∈ integration | plugin | theme | template | python_script | appdaemon.
Each entry (keyed by GitHub repo id) includes roughly: `full_name` (owner/repo), `manifest.name` / `name`, `description`, `domain`, `topics[]`, `stargazers_count`, `downloads`, `last_updated`, `last_version`, `etag_repository`. Fetch one real snapshot, verify the exact keys against the live file, and use ~150 real entries as mock data. Brand icons: `https://brands.home-assistant.io/<domain>/icon.png` (fallback to an initials tile when missing).

Supplement with two static files that HACS does not provide:
- `categories.json` — curated taxonomy mapping `full_name` → 1–3 categories (Energy, Climate/HVAC, Lighting, Media/Audio, Security/Cameras, Presence/Tracking, Vehicles, Weather, Network/Infra, Dashboards/UI, Automation/Helpers, Notifications, Local-vendor bridges, Israel-specific, Developer tools). Generate a first pass from name/description/topics; mark it as editable.
- `synonyms.json` — intent/synonym map for search ("tv" → webos, tizen, android tv; "power bill" → energy, electricity, tariff; "robot vacuum" → roborock, dreame, valetudo; Hebrew terms too: "מזגן" → climate, ac; "חשמל" → energy).

## Screens / information architecture
1. **Home (Discover)**
   - Search bar, always visible, with free-text + Hebrew support.
   - "Top integrations" rail — ranked by downloads (fallback stars), with a toggle for "trending" = stars/downloads growth if available, else recently updated + high stars.
   - "By use" — category chips → horizontal rails per category.
   - "Suggested for you" — rule-based on installed set (mock a small installed list): same category as installed, commonly paired, and "you have X but not its companion Y".
   - "New & updated" rail.
2. **Search results** — list/grid, faceted filters (type, category, installed/not, updated-within), sort (relevance, downloads, stars, updated). Results should show *why* they matched (matched term or synonym).
3. **Integration detail** — icon, name, author, pitch, stats, categories, version, last updated, README rendered (fetch raw README from GitHub only on demand), "Install / Installed / Update" action, link to repo. Related items rail.
4. **Installed** — my installed repos with update badges (mock data).

## Free-language search (Phase 1, fully client-side)
- Fuse.js (or equivalent) over name, description, domain, topics, categories, with field weights.
- Query expansion via `synonyms.json` before searching; show expanded terms as removable chips.
- Simple intent handling: "how do I…", "I want to…" → strip stop words, expand, search. No LLM in Phase 1.
- Leave a clean adapter interface (`searchProvider.search(query) → results[]`) so Phase 2 can plug in a local embeddings backend (Ollama) without touching the UI.

## Visual direction
- Flat, minimal, clean. Dark graphite UI — near-black surfaces with 2–3 elevation steps, one restrained accent color, generous whitespace, 8-pt spacing, subtle 1px borders instead of shadows. No skeuomorphism, no glassmorphism, no gradients except a very subtle one on the hero.
- Should sit comfortably next to a Home Assistant dark theme (I use a custom theme called "Lumina"). Expose all colors as CSS custom properties so I can map them to HA theme variables later.
- Typography: system/Inter-style sans, tight hierarchy, no more than 4 sizes.
- Cards: icon, name, one-line description (truncate at 2 lines), two small stats (downloads, stars), a category tag, and an install state. Hover = slight lift/border brighten only.
- Fully responsive: desktop 3–4 column grid, tablet 2, mobile 1 with horizontal rails.
- Keyboard-navigable search; RTL-safe layout (Hebrew queries and future Hebrew UI).

## Tech constraints
- Phase 1: one self-contained HTML file (inline CSS/JS) or a minimal vanilla/Lit setup — no build step required to run. React is acceptable only if it stays a single file loaded via CDN.
- Data layer: `catalog.js` (fetch + cache HACS JSON in localStorage with etag/TTL), `search.js`, `recommend.js`, `ui/`. Keep them separate.
- Phase 2 target (do not build yet, but don't block it): HA custom integration that registers a sidebar panel (`panel_custom`) and uses HA's websocket connection to call HACS's `hacs/repositories/list` and `hacs/repository/download`. The UI must be embeddable as a web component.
- No external services besides data-v2.hacs.xyz, brands.home-assistant.io, and raw.githubusercontent.com (README, on demand).

## Deliverables — work in stages, stop for review after each
1. Design pass: proposed layout for Home, Search, Detail, Installed (wireframe-level, then one high-fidelity Home screen). State the design decisions and trade-offs briefly.
2. Data + search: catalog loader with real snapshot, categories.json and synonyms.json first drafts, search with synonym expansion and a small test harness (10 example queries, incl. 3 in Hebrew, with expected top results).
3. Full UI wired to data, with mock installed state and mock install actions.
4. Notes file (README/CLAUDE.md): architecture, how to run locally, how to refresh the catalog snapshot, what changes for Phase 2.

## Do not
- Do not use cloud APIs or hosted search.
- Do not invent HACS data fields — verify against the live JSON and say what you found.
- Do not add features beyond the list without asking.
- Do not ship a build-tooling-heavy scaffold for Phase 1.
