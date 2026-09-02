#!/usr/bin/env python3
"""Refresh frontend/catalog-sample.json from the live HACS catalog.

The snapshot exists because data-v2.hacs.xyz sends no CORS headers, so the
browser-based dev harness (frontend/dev.html) can never fetch the catalog
directly. This script does the fetch server-side and keeps the top-starred
entries per section, trimmed to the fields the app actually reads.

Run from the repo root, no dependencies:

    python3 scripts/refresh-snapshot.py
"""

import json
import os
import urllib.request

# How many entries to keep per section, most-starred first.
COUNTS = {"integration": 100, "plugin": 40, "theme": 10}

# The raw fields ha-data.js / catalog.js actually read; everything else is
# dropped to keep the snapshot small.
KEEP = [
    "full_name", "description", "domain", "manifest_name", "stargazers_count",
    "downloads", "topics", "last_updated", "last_version", "open_issues",
    "last_commit", "last_fetched", "prerelease",
]

DEST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "custom_components", "hacs_store", "frontend", "catalog-sample.json",
)


def main() -> None:
    out = {}
    for section, count in COUNTS.items():
        url = f"https://data-v2.hacs.xyz/{section}/data.json"
        print(f"fetching {url} …")
        with urllib.request.urlopen(url) as response:
            data = json.load(response)

        top = sorted(
            data.items(),
            key=lambda kv: kv[1].get("stargazers_count", 0),
            reverse=True,
        )[:count]

        for repo_id, raw in top:
            slim = {key: raw[key] for key in KEEP if key in raw}
            if isinstance(raw.get("manifest"), dict):
                manifest = {
                    key: raw["manifest"][key]
                    for key in ("name", "country")
                    if key in raw["manifest"]
                }
                if manifest:
                    slim["manifest"] = manifest
            # loadCatalog's fallback path reads this to know the section.
            slim["category"] = section
            out[repo_id] = slim

    with open(DEST, "w", encoding="utf-8") as file:
        json.dump(out, file, ensure_ascii=False, indent=1)
    print(f"wrote {len(out)} entries to {DEST} ({os.path.getsize(DEST)} bytes)")


if __name__ == "__main__":
    main()
