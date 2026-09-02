// search.js — client-side search with query expansion. No network, no index build step.
//
// Deliberately not Fuse.js: a ~60-line scorer you can read beats a dependency you
// can't, and it keeps Phase 1 runnable with no CDN. The cost is no fuzzy typo
// tolerance — add it here if you miss it.
//
// Phase 2 swap: anything exposing search(query) -> { results, expanded } can
// replace createSearchProvider, including a local Ollama embeddings backend.
// The UI only ever calls the provider.

const DEFAULT_WEIGHTS = {
  name: 5,
  domain: 4,
  categories: 3,
  topics: 2,
  full_name: 2,
  description: 1
};

// Hebrew has no case; lowercasing is a no-op there and harmless.
const normalise = s => (s || "").toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, " ").trim();

export function tokenize(query, stopwords = []) {
  const stop = new Set(stopwords.map(normalise));
  return normalise(query).split(/\s+/).filter(t => t && !stop.has(t));
}

// "power bill" -> tokens [power, bill] plus the terms each one implies.
// Returned so the UI can show them as removable chips.
export function expand(tokens, synonyms) {
  const expanded = [];
  const terms = new Map(); // term -> which typed token produced it

  for (const t of tokens) {
    terms.set(t, null); // the literal token always searches
    const syn = synonyms[t];
    if (syn) {
      expanded.push({ from: t, to: syn });
      for (const s of syn) if (!terms.has(s)) terms.set(s, t);
    }
  }
  return { terms, expanded };
}

function fieldText(entry, field) {
  const v = entry[field];
  if (Array.isArray(v)) return v.join(" ");
  return v == null ? "" : String(v);
}

// Whole-word hit scores full weight; a substring hit scores 60%. That gap is what
// keeps "light" from ranking every repo whose description says "lightweight".
//
// Short terms get no substring fallback at all: "ac" would otherwise match
// Pl-ac-es and V-ac-uum, and the "why it matched" line would say so out loud.
const MIN_SUBSTRING_LEN = 4;

function fieldScore(text, term) {
  if (!text) return 0;
  const t = text.toLowerCase();
  const wholeWord = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(term)}([^\\p{L}\\p{N}]|$)`, "u").test(t);
  if (wholeWord) return 1;
  if (term.length < MIN_SUBSTRING_LEN) return 0;
  return t.includes(term) ? 0.6 : 0;
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function createSearchProvider({ entries, synonyms = {}, weights = DEFAULT_WEIGHTS }) {
  const stopwords = synonyms._stopwords || [];
  const fields = Object.keys(weights);

  function search(query, { limit = 40, removed = [] } = {}) {
    const tokens = tokenize(query, stopwords);
    if (!tokens.length) return { query, tokens, expanded: [], results: [] };

    const { terms, expanded } = expand(tokens, synonyms);
    for (const r of removed) terms.delete(r); // user dismissed an expansion chip

    const results = [];
    for (const entry of entries) {
      let score = 0;
      const matches = [];

      for (const field of fields) {
        const text = fieldText(entry, field);
        for (const [term, via] of terms) {
          const hit = fieldScore(text, term);
          if (!hit) continue;
          // A synonym match is worth 75% of a literal one, so typing the exact
          // name always outranks something reached through the synonym map.
          score += hit * weights[field] * (via ? 0.75 : 1);
          matches.push({ field, term, via });
        }
      }
      if (!score) continue;

      // Tiny popularity nudge — enough to break ties, not enough to outrank relevance.
      score += Math.log10(1 + (entry.downloads || 0)) * 0.15;
      results.push({ entry, score, matches: dedupe(matches) });
    }

    results.sort((a, b) => b.score - a.score);
    return { query, tokens, expanded, results: results.slice(0, limit) };
  }

  return { search };
}

function dedupe(matches) {
  const seen = new Set();
  return matches.filter(m => {
    const k = m.field + "|" + m.term;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// One human sentence explaining a hit, for the "why did this match?" line.
// Pass a translator from strings.js to localise it; without one it stays English,
// which is what the test harness wants.
const EN_FIELDS = { name: "name", domain: "domain", categories: "category",
  topics: "topic", full_name: "repository", description: "description" };

export function explain(result, t) {
  const best = result.matches[0];
  if (!best) return "";
  const where = t ? t.field(best.field) : (EN_FIELDS[best.field] || best.field);
  if (t) return t(best.via ? "matchedVia" : "matched", { where, term: best.term, via: best.via });
  return best.via
    ? `matched ${where} “${best.term}” — expanded from “${best.via}”`
    : `matched ${where} “${best.term}”`;
}
