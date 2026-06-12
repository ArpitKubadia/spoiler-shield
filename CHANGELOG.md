# Changelog

## 0.6.0 (2026-06-11)
- FIFA World Cup pack (`packs/fifa-worldcup.json`) + featured first in the registry; World Cup and Formula 1 are now both built-in default topics on fresh installs (kept in sync with their packs)
- Store-ready metadata: name "Spoiler Shield: Hide Reddit Spoilers", keyword-rich description, `homepage_url` → GitHub repo
- `docs/STORE_LISTING.md` rewritten as a launch kit: World Cup/F1-led copy, SEO notes, exact screenshot shot list, promo-tile spec, launch checklist
- Registry is LIVE: https://github.com/ArpitKubadia/spoiler-shield

## 0.4.0 (2026-06-11)
- Import now merges and dedupes (case-insensitive) instead of replacing — it only ever adds topics/entries, never overwrites or deletes
- First install opens the options page (onboarding)
- Stored configs are normalized on load, so hand-edited JSON can't crash the engine
- Distribution prep: `scripts/package.sh` builds a store-ready zip, MIT license, Chrome Web Store submission kit in `docs/STORE_LISTING.md`, starter topic pack in `packs/`

## 0.3.x (2026-06-09)
- 0.3.2: search-result blur targets the real card (`data-testid="search-post-unit"`); badges scroll in sync (page-coordinate layer) and slide under Reddit's header/dropdowns
- 0.3.1: search results filtered (search pages don't use `shreddit-post`)
- 0.3.0: floating "spoiler — click to reveal" badges (outside Reddit's feed DOM), shield icons

## 0.2.0 (2026-06-09)
- Options page: topic CRUD, export/import
- Quiet console (DEBUG flag for diagnostics)

## 0.1.x (2026-06-09)
- Core: topic-based matching (subreddit wildcards + word-boundary keywords), blur with pre-paint guard, popup toggles
- Hard-won fixes: never insert elements into Reddit's feed (it unmounts neighbors); always fail open
