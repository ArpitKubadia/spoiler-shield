# Spoiler Shield — Chrome Extension

A Chrome (Manifest V3) extension that blurs spoiler-prone posts on Reddit based on user-defined, toggleable **topics** (e.g. "Formula 1"). Built so any agent/person can pick this up cold: read this file top to bottom, then check the Progress Log at the bottom for current state.

---

## 1. Problem & goals

The user (arpit) follows many subreddits. Reddit also injects recommendations from subs he doesn't follow. When he hasn't watched an F1 race (or a TV episode) yet, opening Reddit leaks spoilers via post titles and thumbnails — from r/formula1, r/formuladank, r/MercedesAMGF1, and even general subs like r/sports.

**Goals (v1):**
- One toggle per topic: flip "Formula 1" on → all F1-related posts get blurred with a click-to-reveal overlay; flip off after watching the race.
- Topics are pure data (subreddit patterns + keywords), not hardcoded — the engine knows nothing about F1.
- Works on **new Reddit** (www.reddit.com, the `<shreddit-post>` web-components UI). Old Reddit is out of scope for v1.
- No flash-of-spoiler: posts must never be visible-then-blurred.
- Settings sync across machines via `chrome.storage.sync`.

**Non-goals (v1):** comment-level filtering, old.reddit, mobile app (impossible from an extension), other websites (but architecture must allow them later), LLM classification, auto-enable on race schedule (future).

## 2. Decisions already made (don't relitigate)

| Decision | Choice | Why |
|---|---|---|
| Filter unit | **Topic** = subreddit wildcard patterns + title/flair keywords | Recommendations leak from unfollowed subs; subreddit lists alone don't scale |
| Action | **Blur whole post card + overlay "Hidden: <topic> — click to reveal"** | Removing posts feels broken; thumbnails are the worst spoiler vector; reveal lets you peek without disabling the topic |
| Target UI | New Reddit only (`<shreddit-post>` elements) | That's what the user uses |
| Tech | Vanilla JS, **no build step / no bundler** | Trivially resumable; load-unpacked just works. Content scripts are classic scripts listed in dependency order in the manifest (they share globals via a `SS` namespace object) |
| Extensibility | Site-adapter interface; engine is site-agnostic | Future YouTube/Twitter support = one new adapter file |
| Storage | `chrome.storage.sync`, versioned schema | Sync across machines; limits (100KB total, 8KB/item) are ample for topic lists |

## 3. Data model

```js
// chrome.storage.sync, key "config"
{
  version: 1,
  globalEnabled: true,            // master kill switch
  topics: [
    {
      id: "f1",                   // stable slug, generated from name
      name: "Formula 1",
      enabled: false,             // the per-topic toggle
      subredditPatterns: [        // case-insensitive wildcards, * = any chars.
        "formula1", "formuladank", "*f1*", "formula*", "grandprix*", "redbullracing"
      ],
      keywords: [                 // matched case-insensitively with word boundaries
        "verstappen", "hamilton", "norris", "leclerc", "piastri", "russell",
        "grand prix", "qualifying", "pole position", "podium", "fastest lap"
      ],
      action: "blur"              // only "blur" in v1; enum for future "hide"
    }
  ]
}
```

Matching rules:
- Subreddit patterns: wildcard → regex (`*f1*` → `/^.*f1.*$/i`), matched against the bare subreddit name (no `r/` prefix).
- Keywords: case-insensitive, **word-boundary** matching against `title + " " + flair` (substring matching causes false positives — e.g. a keyword "P1" must not match "P100"). Multi-word keywords are matched as phrases.
- A post is blocked if **any** enabled topic matches by **either** layer. First matching topic's name is shown on the overlay.

Default config ships with the F1 topic above (disabled) plus an empty "TV Shows" template.

## 4. Architecture

```
spoiler-shield/
  PLAN.md, CLAUDE.md
  extension/                  ← load this dir unpacked at chrome://extensions
    manifest.json
    src/
      shared/
        matching.js           // SS.matching: wildcard→regex, keyword/phrase match. PURE, no chrome.* — unit-testable in node
        storage.js            // SS.storage: defaults, get/save config, onChanged subscription, schema migration by version
      content/
        adapters/reddit.js    // SS.adapters.reddit — the ONLY file that knows Reddit's DOM
        engine.js             // SS.engine: classify(post) → topic|null; apply/remove blur; re-scan on config change
        index.js              // bootstrap: load config, start MutationObserver, wire storage.onChanged
      content/content.css     // pre-paint guard + blur/overlay styles (injected via manifest)
      popup/  popup.html|js|css     // topic toggles + master switch
      options/ options.html|js|css  // topic CRUD, import/export JSON
    icons/ (16/48/128)
```

**Adapter interface** (engine calls only these; implement this same shape for future sites):
```js
SS.adapters.reddit = {
  matches(url),                  // is this adapter responsible for this page
  postSelector,                  // CSS selector for post elements ("shreddit-post")
  extract(el),                   // → { subreddit, title, flair } (strings, may be "")
  // engine handles blur/overlay generically using the post element as the host
}
```

**Content script flow:**
1. `run_at: document_start`. Manifest-injected `content.css` contains the **pre-paint guard**: when filtering is active (engine sets `data-ss-active` on `<html>` as early as possible), any `shreddit-post:not([data-ss-state])` is rendered invisible (`visibility: hidden`). So unclassified posts never paint.
2. MutationObserver on `document.documentElement` (childList+subtree) catches every post node as Reddit's infinite scroll inserts it. Each post → `extract` → match → set `data-ss-state="clear"` (guard releases it) or `data-ss-state="blocked"` (+ blur class + overlay).
3. `chrome.storage.onChanged` → reload config → **full re-scan**: newly blocked topics blur already-rendered posts; disabled topics unblur them. This is what makes the popup toggle feel instant.
4. Reveal: overlay button sets `data-ss-state="revealed"` on that one post (session-only, not persisted).

**Blur implementation notes** (verify during M2 — Reddit DOM details below are from memory and may have drifted):
- `<shreddit-post>` has useful attributes: `subreddit-prefixed-name="r/formula1"`, `post-title="..."`. Flair text may need a query inside the element. **Verify attribute names against the live DOM first thing in M2.**
- `shreddit-post` uses shadow DOM, but a CSS `filter: blur(...)` on the host element blurs the whole subtree including shadow content — no need to pierce the shadow root.
- Overlay: set `position: relative` on the host (or a wrapper) and absolutely position an overlay div appended as a sibling/wrapper — appending children *into* a slotted custom element may not render. Test both; wrapper div around the post is the safe fallback.
- Posts also appear on: home feed, r/popular, subreddit pages, search results, "more like this" / sidebar recommendation units, and the post-detail page. v1 must cover at least feed + subreddit pages + search; check whether search results also use `shreddit-post` (they may use a different element — if so, add a second selector to the adapter).

**manifest.json essentials:** MV3; `content_scripts` matching `*://www.reddit.com/*` and `*://sh.reddit.com/*`, `run_at: document_start`, `js` in dependency order `[shared/matching.js, shared/storage.js, content/adapters/reddit.js, content/engine.js, content/index.js]`, `css: [content/content.css]`; `permissions: ["storage"]`; `action.default_popup`; `options_page`. No background service worker needed in v1.

## 5. Milestones

Work through in order. Each has a Definition of Done; update the Progress Log when done.

**M0 — Scaffold.** Folder structure above, manifest, placeholder icons, empty modules with the `SS` namespace pattern. DoD: loads unpacked with zero errors at `chrome://extensions`, content script logs once on reddit.com.

**M1 — Matching engine + storage (pure logic).** `matching.js` (wildcard compile, phrase/word-boundary keyword match), `storage.js` (defaults incl. F1 topic, get/save, onChanged wrapper, version field). Add `test/matching.test.js` runnable with plain `node test/matching.test.js` (no framework; assert + table of cases incl. false-positive traps: "P1" vs "P100", "f1" pattern vs "wtf1" — decide and encode expected behavior). DoD: tests pass.

**M2 — Reddit adapter + blur (the core).** Adapter extraction, MutationObserver wiring, pre-paint guard CSS, blur + overlay + reveal. Manually enable the F1 topic via console (`chrome.storage.sync.set`) since there's no popup yet. DoD: with topic enabled, F1 posts on the home feed and r/formula1 are blurred before ever being visible, overlay shows topic name, reveal works, scrolling keeps filtering, no jank/console errors.

**M3 — Popup.** Master switch + per-topic toggles. DoD: toggling in the popup blurs/unblurs already-open tabs instantly (via storage.onChanged re-scan), state persists.

**M4 — Options page.** Add/rename/delete topics; edit patterns and keywords (textarea, one per line is fine); export/import config as JSON. DoD: round-trip a config through export→import; edits propagate live.

**M5 — Hardening & polish.** Verify search results + recommendation sidebars are covered; SPA navigation (Reddit soft-navigates — observer should survive, verify); performance pass (the observer must filter to post nodes cheaply, don't extract on every mutation); real icons; tighten the default F1 keyword list against the current driver grid. DoD: a normal browsing session produces zero missed F1 posts and zero false-positive blurs.

**Future (explicitly out of v1):** auto-enable from the F1 calendar (needs a background service worker + alarm), "learn mode" (manual-hide adds sub/keyword to topic), comment filtering, old.reddit adapter, other sites (YouTube thumbnails!), Firefox port.

## 6. Testing / running

- Load: `chrome://extensions` → Developer mode → "Load unpacked" → select `extension/`.
- After code changes: click the reload icon on the extension card, then refresh the Reddit tab.
- Pure-logic tests: `node test/matching.test.js`.
- Manual test config: enable the F1 topic, open reddit.com home + r/formula1 + search "verstappen".

## 7. Progress log  ← UPDATE THIS AS YOU GO

- [x] Plan written (2026-06-09)
- [x] M0 scaffold (2026-06-09) — manifest + full file tree + placeholder icons/popup/options; not yet load-tested in Chrome
- [x] M1 engine + storage + tests (2026-06-09) — `node test/matching.test.js` → 15 passing. Keyword matching uses lookbehind/lookahead word boundaries (P1≠P100); `*f1*` intentionally matches wtf1
- [x] M2 adapter + blur on new Reddit — **verified live by user on v0.1.2** (no-DOM-insertion approach; see bug log below)
- [x] M3 popup — verified live by user
- [x] M4 options page (2026-06-09, v0.2.0) — topic CRUD, pattern/keyword textareas, export/import JSON; debug logging turned off (engine.js DEBUG=false); README.md written. Options page not yet user-verified.
- [x] M5 hardening (2026-06-09, v0.3.0) — spoiler label restored as a position:fixed badge layer on document.body (badges track post rects, repositioned rAF-throttled on scroll/resize/mutations; pointer-events:none so clicks fall through to the post for reveal); shield-shaped icons; observer skips querySelectorAll on leaf nodes. **Remaining, needs user verification:** badge layer behavior generally.
- v0.3.1 — search-results support. User's DOM snippet confirmed search pages do NOT use `<shreddit-post>`; results have `a[data-testid="post-title"]` anchors (title in `aria-label`, subreddit in `href`). Adapter interface generalized: `unitSelector` (compound: shreddit-post + that anchor) + `resolveTarget(unit)` mapping a unit to the element to blur (for anchors: closest result-card container, falling back to `offsetParent` — the anchor is `absolute inset-0` so its offsetParent is the card; guards against resolving to body or multi-result containers). Blocked CSS generalized to `[data-ss-state="blocked"]`; click-to-reveal now keys off the attribute in composedPath. Known gap: pre-paint guard only covers shreddit-post, so search results can flash briefly before blurring. Container selectors `post-consume-tracker`/`search-telemetry-tracker`/`[data-testid="search-post-unit"]` were unverified guesses, but the offsetParent fallback works regardless.
- v0.3.2 — two fixes from a fuller user DOM snippet of a search result: (1) v0.3.1 blurred the wrong element on search pages — Reddit nests a `search-telemetry-tracker` around just the (invisible) title link, and that tag was in the closest() list, so the blur landed on it while the visible title/thumbnail (sibling subtrees) stayed sharp. The real card is `div[data-testid="search-post-unit"]` (confirmed); closest() now targets only that, with the offsetParent fallback retained (the card has class `relative`, so it IS the anchor's offsetParent — would have worked if the tracker hadn't matched first). (2) Badge layer reworked: was position:fixed + viewport coords repositioned on scroll → one-frame lag ("bouncing") and max z-index put badges over Reddit's sticky header/dropdowns. Now position:absolute in document flow with page coordinates (scrolls in sync natively; scroll listener kept only for inner scrollers) and z-index:2 (above z-auto feed cards, below Reddit chrome). Lesson recorded: prefer data-testid hooks over Reddit's custom-element tag names — Reddit nests trackers at multiple granularities.

- [x] M6 distribution prep (2026-06-11, v0.4.0) — session notes below.

**2026-06-12 session, part 2 — assets redesigned as marketing frames:**
- Arpit found the raw-crop versions hideous (he was right). Rebuilt `scripts/crop_assets.py` to compose each 1280×800 as a designed card: purple gradient bg, headline/subline (Helvetica), real screenshot region inside a fake-browser window (traffic lights + URL pill) with rounded corners and soft shadow. Four assets verified visually; 02/04 renamed (`02_formula1_blurred_feed.png`, `04_community_packs.png`).
- Principle recorded: store screenshots stay REAL product (CWS wants representative shots; AI-generated UI looks uncanny) — AI image generation is only appropriate for pure brand art (promo tile / 1400×560 marquee). Gave arpit a GPT-image prompt for those; PIL tile remains the fallback.

**2026-06-12 session — store assets from arpit's raw screenshots:**
- Arpit shot 7 raw screenshots (screenshots/, kept local & gitignored — note: macOS names contain U+202F narrow no-break space before "PM"). Gemini's OCR-classify + one-generic-crop-per-class approach failed (same box stamped on everything); replaced `scripts/crop_assets.py` with hand-tuned per-shot crops after inspecting every image visually.
- Final assets in dist/assets (regenerate: `.venv/bin/python scripts/crop_assets.py`): 01 WC before/after split-frame, 02 F1 before/after split-frame (both with WITHOUT/WITH label bands — the two matched pairs arpit shot are the strongest possible store format), 03 home-feed ambush shot, 04 options page (white-padded to 1.6 aspect to keep the Save button), promo tile 440×280 (gradient + logo + tagline, title auto-fit). All verified visually at 1280×800.
- Kept Gemini's STORE_LISTING/manifest copy edits (arpit-approved), but fixed one false capability claim (match-score blocking "1-0" — keywords can't do that) and rewrote the assets section to the real filenames + upload order. Missing optional asset: popup-open screenshot (noted in doc).

**2026-06-11 session, part 3 (v0.6.0) — World Cup launch prep:**
- Repo is PUBLIC: https://github.com/ArpitKubadia/spoiler-shield (arpit pushed; registry verified serving HTTP 200; arpit set REPO_URL in options.js himself).
- `packs/fifa-worldcup.json` created and featured FIRST in `packs/index.json` (World Cup 2026 started today). DEFAULT_CONFIG now ships Formula 1 (full pack list) + FIFA World Cup + TV-Shows template — defaults touch fresh installs only; existing users add via packs browser.
- Manifest = store SEO surface: name "Spoiler Shield: Hide Reddit Spoilers" (+ short_name), keyword-rich 132-char description, homepage_url → repo, v0.6.0.
- STORE_LISTING.md rewritten as a full launch kit: WC+F1-led description copy, SEO guidance, exact 1280×800 screenshot shot list for arpit (5 shots), 440×280 promo-tile spec with tagline "Watch first. Scroll later.", launch checklist (GitHub About/topics, post ideas).
- Known judgment calls: `soccer`/`football` subreddit patterns in the WC pack blur ALL football content during the tournament (acceptable — that's where results leak); country names deliberately NOT keywords (false-positive machine); "penalties"/"full time" are WC-scoped enough. Revisit pack after group stage feedback.

**2026-06-11 session, part 2 (v0.5.0) — community pack registry (arpit's priority):**
- Model: uBlock-filter-list style. `packs/` in this repo IS the registry — plain JSON, `packs/index.json` as catalog, served from GitHub raw (CORS-open, no backend, contributions via normal PRs).
- Options page gained a **Community packs** browser: fetches the catalog, lists packs with Add/"Re-sync" buttons; installs go through the shared `mergeTopicsInto()` (refactored out of importConfig; reports "N added, M extended — nothing removed"). Installed pack ids tracked under a separate `registry` storage key (kept out of the topic config schema on purpose — migrate() would strip unknown fields). Registry URL is user-editable (forks can self-host).
- **Share** button per topic: downloads a single-topic pack file and opens GitHub's prefilled new-file page (`/new/main?filename=…&value=…`) — GitHub walks the contributor through fork+PR. No backend anywhere.
- New packs beyond F1 to prove generality: football.json, cricket.json, ufc.json, nba.json (seed-quality keyword lists — community improves via PR). CONTRIBUTING.md documents format, matching semantics, guidelines (names over generic words, enabled:false always, no harassment lists), both contribution paths.
- STORE_LISTING privacy text updated honestly: options page now fetches pack JSON from GitHub (data, not code; nothing sent).
- **BLOCKED on arpit (no `gh` CLI on this machine):** publish the repo, then replace `REPLACE_WITH_YOUR_USER` in `extension/src/options/options.js` (single line — sets both registry URL and Share flow). Until then the packs browser shows a graceful "not published yet" note, and Share still downloads the file.

**2026-06-11 session (v0.4.0) — everything done, for arpit's review:**
- Reviewed arpit's own change (merge-on-import in options.js): logic kept as-is, hardened two spots — (1) dedupe is now case-insensitive + trims entries (matching is case-insensitive, so "Verstappen"/"verstappen" were silent dupes), via a `mergeUnique` helper; (2) appended topics always get a fresh `id` (imported ids like "f1" collide across everyone's exports; topic NAME is the merge identity).
- `storage.js migrate()` now normalizes every topic on load (missing arrays/fields filled in) so hand-edited or imported configs can't crash the engine/options page.
- First-run onboarding: new `src/background.js` service worker opens the options page on install (`onInstalled`, install reason only).
- Distribution: `scripts/package.sh` builds `dist/spoiler-shield-v<version>.zip` (store-ready); MIT `LICENSE` (named Arpit Kubadia — change if wrong); `.gitignore`; `CHANGELOG.md`; `docs/STORE_LISTING.md` = full Chrome Web Store submission kit (listing copy, permission justifications, privacy-policy text, steps, $5 dev account note).
- `packs/formula1.json` — first shareable topic pack (fuller driver/team list than the built-in default; 2026 grid names are best-effort, prune as needed). README gained "Topic packs" + "Sharing & publishing" + license sections; options-page help now states import merge semantics.
- Initialized git repo + first commit, so history starts now. NOT pushed anywhere — publishing to GitHub is arpit's call (repo is ready for `gh repo create`).
- Deliberately NOT done (scope/judgment): old.reddit adapter, comment filtering, race-calendar auto-enable (next big feature candidate), Firefox port, screenshots for the store listing (needs a human browser session).

Notes for the next session:
- M0 verified live by the user (extension loads, console log appears on reddit.com).
- v0.1.2: user reported v0.1.1 showed "same problem, nothing in console" — all files pass `node --check`, so either the extension/tab wasn't reloaded (old code still running) or the overlay-div insertion was breaking Reddit's lit-managed feed (foreign siblings in a framework-managed list can make it unmount neighboring posts). v0.1.2 removes ALL DOM insertion: no reveal pill; blocked posts are blurred via attribute+CSS only, and click-to-reveal is a document-level capture listener (`composedPath` → blocked post → preventDefault + reveal). index.js now logs an "injected" line synchronously before any async work and catches startup errors loudly. Trade-off: no "Hidden: <topic>" label on blurred posts for now — restoring a label safely (without inserting into the feed list, e.g. a position:fixed badge layer on document.body) is an M5 item.
- **Open bug (v0.1.0, fixes attempted in v0.1.1, awaiting user verification):** with F1 enabled, ~80% of posts went fully invisible and F1 posts were often the ones left visible. Read: invisible = post never received `data-ss-state` (pre-paint guard kept hiding it); visible F1 = classified `clear`, i.e. extract() returned empty metadata. v0.1.1 changes: (1) per-post try/catch failing OPEN so one throwing post can't abort the whole scan, (2) guard CSS changed from `visibility:hidden` to `blur(40px)` so unclassified posts are visible blobs instead of holes, (3) observer now also watches the adapter's `attributeHints` so late-hydrated attributes trigger re-classification, (4) adapter fallbacks: `subreddit-name` attr, subreddit from `permalink`, title from `[slot="title"]`, (5) DEBUG audit log (engine.js `DEBUG = true`) prints counts of clear/blocked/UNPROCESSED/empty-metadata/errors ~2s after activity, plus sample elements. Next step: read the audit output — UNPROCESSED>0 means the observer misses insertions (suspect shadow DOM or aborted batches); empty-metadata>0 means attribute names drifted (the audit prints the actual attribute list of a sample post — fix extract() from that).
- M2/M3 implementation choices: the reveal overlay is a zero-height **sibling** div inserted before the blocked `shreddit-post` (a child would inherit the blur, and un-slotted light-DOM children may not render); the pill is absolutely positioned from that sibling so no positioned ancestor or size measurement is needed. Reveals are session-only via `data-ss-state="revealed"`, which processPost skips. Removed posts get their orphaned overlays cleaned up in the MutationObserver's removedNodes pass.
- Still unverified against the live DOM: `subreddit-prefixed-name` / `post-title` attribute names, and the flair selector in `adapters/reddit.js` (`shreddit-post-flair, [slot="post-flair"], .flair-content`) which is a best-effort guess. If blurring doesn't work, inspect a `<shreddit-post>` element first.
- M2 DoD check: enable Formula 1 in the popup, browse home feed + r/formula1 — posts should appear blurred with the purple pill, never flash unblurred, reveal on click, keep filtering while scrolling.
