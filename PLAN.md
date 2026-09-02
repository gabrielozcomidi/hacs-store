# Code review findings & implementation plan

Reviewed: everything under `custom_components/hacs_store/` (2026-09-02). The
`Design review and planning.zip` is an identical snapshot of the same tree and
was not reviewed separately.

Overall: the architecture is sound and matches the brief (thin Python shell,
swappable data layer, readable vanilla JS). The issues below are ordered by
severity, each with a concrete fix.

## Bugs (fix first)

### 1. Click listeners accumulate on every render — actions can fire many times
[hacs-store-panel.js:777](custom_components/hacs_store/frontend/hacs-store-panel.js:777)
`_bind()` runs after **every** `_render()`, and each run does
`root.addEventListener("click", ...)` on the shadow root. Replacing
`innerHTML` clears child nodes but not listeners on the shadow root itself, so
after N renders (every keystroke re-renders) there are N listeners. Most
handlers are idempotent `set()` calls, but `data-act` triggers `_act()` —
an **install/update can be sent to HACS multiple times per click**, and
navigation handlers each cause redundant re-renders.

**Fix:** attach the click listener once (in `constructor` or
`connectedCallback`), or store the handler and remove it before re-adding.
The input `focus`/`blur`/`input` listeners are on the replaced `<input>` node,
so those are fine — only the shadow-root listener leaks.

### 2. Blocking file I/O in the event loop
[__init__.py:31](custom_components/hacs_store/__init__.py:31)
`_version()` does a synchronous `open()`/`json.load()` inside
`async_setup_entry`. HA logs a "blocking call inside the event loop" warning
for this. **Fix:** `version = await hass.async_add_executor_job(_version, hass)`
— or skip the file read entirely: the loaded integration's version is available
via `homeassistant.loader.async_get_integration(hass, DOMAIN)`.

### 3. Static path + panel re-registration on reload
[__init__.py:49](custom_components/hacs_store/__init__.py:49)
`async_register_static_paths` runs on every entry setup, but
`async_unload_entry` never unregisters the path. Reloading the entry (or
remove + re-add) registers the same URL twice; depending on HA version this
raises and setup fails. **Fix:** guard with a flag in `hass.data[DOMAIN]` so the
static path is registered once per HA run; keep panel add/remove as is.

### 4. `javascript:` URLs survive the README renderer
[hacs-store-panel.js:72](custom_components/hacs_store/frontend/hacs-store-panel.js:72)
`renderMarkdown()` escapes HTML first (good), but link/image rewriting puts the
raw (escaped) URL into `href`/`src` without checking the scheme. A hostile
README containing `[click](javascript:...)` renders a live `javascript:` link
inside the panel — which runs as an HA admin. **Fix:** in `abs()` (or a wrapper),
allow only `https:`/`http:` and relative paths; drop anything else. Same check
for image `src`.

### 5. "Update all" fires concurrent downloads with a shared-state race
[hacs-store-panel.js:803](custom_components/hacs_store/frontend/hacs-store-panel.js:803)
The update-all loop calls `_act()` for every stale repo without awaiting;
each `_act` snapshots `{...this._s.busy}` at different times, so finishing
installs can resurrect other repos' busy flags, and HACS receives a burst of
parallel downloads. **Fix:** make the loop sequential
(`for ... await this._act(en)`), which also gives users visible progress.

## Correctness / consistency (small, worth doing)

6. **strings.js is bypassed** — the panel hardcodes all English copy despite
   strings.js's contract ("nothing hardcodes a visible string"). Either route
   the panel through `t()` (it already constructs the translator) or delete the
   unused table entries; today the two drift (e.g. `installedNote` still says
   "Install actions are mocked in Phase 1" while the panel says "read live from
   HACS").
7. **`popularity()` duplicated** — [hacs-store-panel.js:450](custom_components/hacs_store/frontend/hacs-store-panel.js:450)
   re-implements `popularity()` inline instead of importing it (it lives in
   catalog.js, which the panel doesn't load). Move it to a shared module (e.g.
   search.js or a small util) so the ranking can't drift between Phase 1 and 2.
8. **Clearing the search leaves you stranded** — `_setQuery("")` keeps
   `screen: "search"` (fine) but the nav highlight logic treats detail as home;
   minor UX nits to sweep in one pass.
9. **Installed filter is incomplete** — the Installed screen filters offer only
   integrations/plugins; themes/templates fall through "All" only.
10. **`manifest.json` placeholders** — `documentation`, `issue_tracker`,
    `codeowners` still say `YOUR_GITHUB`. Fill with the real repo
    (done as part of the GitHub setup).

## Missing for distribution (HACS-installable repo)

11. **`hacs.json`** at repo root (`{"name": "HACS Store"}`) so the repo can be
    added to HACS as a custom repository.
12. **`README.md`** — the brief's deliverable 4: what it is, screenshot,
    install steps (HACS custom repo or manual copy), how categories.json /
    synonyms.json are meant to be edited, Phase 1 vs Phase 2 notes.
13. **Phase 1 standalone SPA** — catalog.js supports it but there is no
    `index.html` in the repo. Decide: either add the standalone page (data-layer
    swap demo, useful for development without an HA server) or note that
    Phase 2 superseded it.
14. **CI (optional):** a GitHub Action running hassfest + HACS validation
    (`home-assistant/actions/hassfest`, `hacs/action`) — catches manifest
    mistakes on every push with zero local tooling.

## Performance notes (fine for now, revisit if the catalog grows)

- `fieldScore()` builds a `RegExp` per term × field × entry per keystroke
  (~6 fields × ~2–5 terms × N repos). Precompiling one regex per term would cut
  most of that; only bother if search feels sluggish on a full catalog.
- Full-panel `innerHTML` re-render per keystroke is simple and acceptable at
  this scale; don't add a framework for it (brief forbids it anyway).

## Suggested implementation order

1. **Milestone 1 — bug fixes:** items 1–5. Bump manifest version. ✅ **Done**
   (v0.1.1): click listener moved to the constructor, version read moved to an
   executor job, static path registered once per HA run, README renderer
   refuses non-http(s) schemes for links and images, "Update all" runs
   sequentially. Still to verify on a live HA: single install fires one
   websocket call; entry reload works; a README with a `javascript:` link
   renders inert.
2. **Milestone 2 — distribution:** items 10–12 (+14 if wanted): hacs.json,
   README, manifest URLs, GitHub Action. ✅ **Done**: hacs.json (min HA
   2024.6), README.md, MIT LICENSE, repo topics, and a Validate workflow
   (hassfest + HACS action) — green as of this commit. CI also caught and
   fixed a real bug: translations/en.json used `config_flow` instead of
   `config` as its top-level key, so the config dialog showed raw keys.
   Two HACS checks (hacsjson, integration_manifest) are ignored while the
   repo is private — they fetch file contents remotely and 404; remove the
   ignores when the repo goes public.
3. **Milestone 3 — polish:** items 6–9, 13. ✅ **Done** (v0.1.2): all panel
   copy routed through strings.js (drifted entries fixed, missing keys added);
   `popularity()` now imported from catalog.js instead of duplicated; the
   Installed screen offers Theme/Template filters (only for sections actually
   installed); ⌘K/Ctrl+K really focuses search and Escape clears it; and
   Phase 1 lives as `frontend/dev.html` — the real panel with a fake `hass`
   fed from `catalog-sample.json` (150 real top-starred entries, refresh via
   `scripts/refresh-snapshot.py`). All four screens, Hebrew search with
   expansion chips, the mocked update flow, and ⌘K were verified in a browser
   against that harness.

   **Finding from that testing:** data-v2.hacs.xyz sends **no CORS headers** —
   a browser can never fetch the catalog directly, so catalog.js's live-fetch
   path only works server-side; browser use must go through `fallbackUrl` or
   the HACS websocket. Documented in catalog.js and CLAUDE.md.

Each milestone is one commit/PR-sized chunk; nothing depends on tooling that
doesn't exist in the repo.
