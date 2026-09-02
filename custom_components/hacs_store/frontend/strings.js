// strings.js — every piece of UI copy, in one place.
//
// Nothing in the components hardcodes a visible string; they all go through t().
// Adding a language later means adding a block alongside `en` and giving LANGS
// its direction — the translator API is already shaped for it.

export const LANGS = { en: { dir: "ltr", label: "EN" } };

const STRINGS = {
  en: {
    appName: "HACS Store",

    discover: "Discover",
    installed: "Installed",
    search: "Search",
    type: "Type",
    all: "All",
    integration: "Integrations",
    plugin: "Lovelace cards",
    theme: "Themes",
    template: "Templates",

    searchPlaceholder: "Search, or describe what you want to do…",
    clear: "clear",

    discoverSub: "Everything the community has built for Home Assistant, sorted by what it actually does — not by repository name.",
    suggestedFor: "Suggested for you",
    fromInstalled: n => `from your ${n} installed`,
    nothingToSuggest: "Nothing to suggest yet — install something and come back.",
    byUse: "By use",
    mostStarred: "Most starred",
    trending: "Trending",
    downloadsNote: "downloads aren't reported for most repos",
    trendingNote: "recently updated, well starred",
    filtered: "filtered",
    newUpdated: "New & updated",
    seeAll: "See all",

    install: "Install",
    installedBtn: "Installed",
    update: "Update",
    working: "Working…",
    uncategorised: "Uncategorised",

    searchTitle: "Search",
    searchSub: "Type a name, or say what you want to happen.",
    recent: "Recent",
    try: "Try",
    trySamples: ["how do I lower my power bill", "robot vacuum", "popups on my dashboard",
      "cameras without the cloud", "charts for my sensors", "local control without cloud"],
    results: n => `${n} ${n === 1 ? "result" : "results"}`,
    alsoSearching: "Also searching",
    relevance: "Relevance",
    stars: "Stars",
    updatedSort: "Updated",
    nothingMatched: "Nothing matched",
    nothingMatchedBody: "No repository in the catalog matches that. If the word makes sense to you but not to the store, add it to synonyms.json and it will work from then on.",

    filters: "Filters",
    category: "Category",
    anyCategory: "Any category",
    status: "Status",
    anyStatus: "Any",
    onlyInstalled: "Installed",
    onlyNotInstalled: "Not installed",
    updatedWithin: "Updated within",
    anytime: "Anytime",
    month: "30 days",
    quarter: "3 months",
    year: "A year",

    back: "Back",
    readme: "README",
    loadReadme: "Load README",
    reload: "Reload",
    readmeIdle: "fetched from GitHub only when you ask",
    readmeLoading: "fetching…",
    readmeOk: "raw.githubusercontent.com",
    readmeError: "could not fetch — open on GitHub instead",
    readmeNotLoaded: "Not loaded. Nothing is requested from GitHub until you press the button.",
    readmeFetching: "Fetching README…",
    latest: "Latest",
    youHave: "You have",
    notInstalled: "not installed",
    downloads: "Downloads",
    notReported: "not reported",
    updatedFact: "Updated",
    openIssues: "Open issues",
    typeFact: "Type",
    related: "Related",
    openOnGitHub: "Open on GitHub",
    notFound: "Not found",

    installedNote: n => `${n} repositories, read live from HACS.`,
    updatesAvailable: n => `${n} ${n === 1 ? "update" : "updates"} available`,
    updateAll: "Update all",
    updatesWaiting: n => `${n} updates waiting`,
    upToDate: "Everything up to date",
    liveFromHacs: n => `live from HACS · ${n} repos`,
    onlyUpdates: "Needs update",
    nothingHere: "Nothing here",
    nothingHereBody: "No installed repository matches that filter.",
    installFailed: ({ name, err }) => `Install failed for ${name}: ${err}`,

    // Relative-time labels used on the detail page.
    agoUnknown: "unknown",
    agoToday: "today",
    agoDays: n => `${n}d ago`,
    agoMonths: n => `${n}mo ago`,
    agoYears: n => `${n}y ago`,

    // Generated sentences — search match explanations and recommender reasons.
    matched: ({ where, term }) => `matched ${where} “${term}”`,
    matchedVia: ({ where, term, via }) => `matched ${where} “${term}” — expanded from “${via}”`,
    reasonPair: label => `You have ${label}, not its companion`,
    reasonCategory: shared => `More ${shared}, like what you run`,
    reasonRegion: "Built for your region"
  }
};

// Field names as they read inside a match explanation.
const FIELDS = {
  name: "name", domain: "domain", categories: "category", topics: "topic",
  full_name: "repository", description: "description"
};

export function translator(lang) {
  const table = STRINGS[lang] || STRINGS.en;
  const t = (key, arg) => {
    const v = table[key];
    if (typeof v === "function") return v(arg);
    return v == null ? key : v;
  };
  t.category = name => name;
  t.field = f => FIELDS[f] || f;
  t.dir = "ltr";
  t.lang = "en";
  t.arrow = "→";
  t.backArrow = "←";
  return t;
}
