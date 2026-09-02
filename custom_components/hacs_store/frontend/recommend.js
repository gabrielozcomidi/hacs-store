// recommend.js — rule-based suggestions. No model, no cloud, no telemetry.
//
// Three rules, in priority order. Each returns a reason string, because a
// suggestion you can't justify is just noise on the page.

// Repos people almost always run together. Hand-maintained; add your own pairs.
const PAIRS = {
  "piitaya/lovelace-mushroom": ["thomasloven/lovelace-card-mod"],
  "Clooos/Bubble-Card": ["thomasloven/lovelace-card-mod", "thomasloven/hass-browser_mod"],
  "custom-cards/button-card": ["thomasloven/lovelace-card-mod"],
  "blakeblackshear/frigate-hass-integration": ["AlexxIT/WebRTC"],
  "nielsfaber/alarmo": ["blakeblackshear/frigate-hass-integration"],
  "make-all/tuya-local": ["al-one/hass-xiaomi-miot"],
  "bramstroker/homeassistant-powercalc": ["custom-components/nordpool"],
  "basnijholt/adaptive-lighting": ["jseidl/hass-magic_areas"],
  "kalkih/mini-graph-card": ["RomRider/apexcharts-card"]
};

// t is an optional translator from strings.js; English is the default so the
// module still works standalone.
const EN = {
  reasonPair: label => `You have ${label}, not its companion`,
  reasonCategory: shared => `More ${shared}, like what you run`,
  reasonRegion: "Built for your region"
};

export function recommend({ entries, installed, categories = {}, limit = 3, t }) {
  const say = (key, arg) => (t ? t(key, arg) : (typeof EN[key] === "function" ? EN[key](arg) : EN[key]));
  const catName = c => (t ? t.category(c) : c);
  const have = new Set(Object.keys(installed));
  const byName = new Map(entries.map(e => [e.full_name, e]));
  const out = new Map(); // full_name -> { entry, reason, weight }

  const add = (full_name, reason, weight) => {
    if (have.has(full_name) || out.has(full_name)) return;
    const entry = byName.get(full_name);
    if (entry) out.set(full_name, { entry, reason, weight });
  };

  // Rule 1 — the companion you're missing. Most specific, so it wins.
  for (const mine of have) {
    for (const partner of PAIRS[mine] || []) {
      const label = byName.get(mine)?.name || mine.split("/")[1];
      add(partner, say("reasonPair", label), 3);
    }
  }

  // Rule 2 — same category as something already installed, ranked by stars.
  const myCategories = new Set();
  for (const mine of have) for (const c of categories[mine] || []) myCategories.add(c);

  const sameCategory = entries
    .filter(e => !have.has(e.full_name) && e.categories.some(c => myCategories.has(c)))
    .sort((a, b) => b.stars - a.stars);

  for (const e of sameCategory.slice(0, limit * 2)) {
    const shared = e.categories.find(c => myCategories.has(c));
    add(e.full_name, say("reasonCategory", catName(shared)), 2);
  }

  // Rule 3 — scoped to your country. Nobody else will surface these for you.
  for (const e of entries) {
    if (e.categories.includes("Israel-specific")) add(e.full_name, say("reasonRegion"), 1);
  }

  return [...out.values()]
    .sort((a, b) => b.weight - a.weight || b.entry.stars - a.entry.stars)
    .slice(0, limit);
}
