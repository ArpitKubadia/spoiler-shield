# Spoiler Shield

A Chrome extension that blurs spoiler-prone posts on Reddit. Haven't watched
the F1 race yet? Toggle the **Formula 1** topic on — every related post
(including ones from subreddits you don't follow that Reddit recommends to
you) shows up as a blurred card instead of a spoiler. Watched it? Toggle off,
or click any blurred post to reveal just that one.

Works on new Reddit (www.reddit.com) in desktop Chrome.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select this repo's `extension/` folder

After editing any source file: hit the reload arrow on the extension card at
`chrome://extensions`, then refresh your Reddit tab.

## Usage

- **Toolbar popup** — master switch plus one toggle per topic. Toggling
  applies to already-open Reddit tabs instantly.
- **Blurred post** — a floating "&lt;topic&gt; spoiler — click to reveal" badge
  hovers over it; click the post once to reveal it (lasts until you reload
  the page; the topic stays enabled).
- **Options page** ("Edit topics…" in the popup) — create and edit topics,
  export/import as JSON. Import **merges**: it dedupes and appends, and never
  overwrites or deletes anything you already have — so applying the same
  file twice, or a friend's pack on top of your setup, is always safe.

## Adding your own topics (TV shows, sports, anything)

A **topic** is the unit of filtering. It has two matcher lists, and a post is
blurred when *either* matches:

| Matcher | Matches against | Syntax |
|---|---|---|
| Subreddit patterns | the post's subreddit name | `*` wildcard, case-insensitive, whole name: `formula1`, `*f1*`, `severance*` |
| Keywords | the post's title and flair | whole words, case-insensitive; multi-word entries match as a phrase: `verstappen`, `grand prix` |

Example — hiding spoilers for a TV show (say, Severance):

- **Subreddit patterns**: `severance*`, `lumon*` — catches r/SeveranceAppleTVPlus
  and friends without listing each one.
- **Keywords**: `severance`, `lumon`, `innie`, `outie`, character names —
  catches discussion that leaks into r/television, r/tvdetails, etc.

Tips that make topics effective:

- Wildcards beat exhaustive lists: `*f1*` + `formula*` covers F1 subs you've
  never heard of, which is exactly where recommendations come from.
- Names of people/characters are the highest-signal keywords with the fewest
  false positives. Generic words ("race", "finale") will over-blur.
- Keywords are whole-word, so a keyword `P1` will not blur a post containing
  "P100" — short tokens are safe to use.
- Worried about over-blurring? Err broad anyway: a wrongly blurred post costs
  one click to reveal; a missed spoiler can't be unseen.

### Topic packs

`packs/` holds ready-made topic JSON files (e.g. `packs/formula1.json`, a
fuller F1 set than the built-in default). Import one via the options page —
since imports merge, packs stack safely on top of whatever you have, and
re-importing an updated pack just picks up the new entries. Made a good pack
for a show or sport? It's just a JSON file — share it.

## How it works

Everything lives in `extension/`; there is no build step and no background
process.

1. **Config** (`src/shared/storage.js`) — your topics live in
   `chrome.storage.sync`, so they sync across machines. Both the popup and the
   options page just edit this config; content scripts subscribe to changes
   and re-apply instantly.
2. **Matching** (`src/shared/matching.js`) — pure functions that compile each
   enabled topic's wildcards and keywords into regexes and classify a post
   (`{subreddit, title, flair}`) against them. No Reddit knowledge, no
   browser APIs; unit-tested via `node test/matching.test.js`.
3. **Reddit adapter** (`src/content/adapters/reddit.js`) — the only file that
   knows Reddit's DOM. New Reddit renders every post as a `<shreddit-post>`
   element carrying its subreddit and title as attributes; the adapter reads
   those (with fallbacks, since Reddit's markup drifts). Supporting another
   site later means writing one new adapter with the same tiny interface.
4. **Engine** (`src/content/engine.js`) — runs at `document_start`, watches
   the page with a MutationObserver (Reddit is an infinite-scroll SPA, posts
   stream in continuously), classifies each post as it appears, and stamps it
   `data-ss-state="blocked"` or `"clear"`.
5. **CSS does the rest** (`src/content/content.css`) — blocked posts get
   `filter: blur()`. A "pre-paint guard" rule keeps *unclassified* posts
   blurred while any topic is active, so a spoiler never flashes before the
   engine gets to it. Click-to-reveal is a capture-phase listener that
   intercepts the first click on a blocked post.
6. **Badges** — the "&lt;topic&gt; spoiler" label is a `position:fixed` layer
   appended to `document.body`, with each badge tracking its post's
   on-screen position (updated on scroll/resize). It deliberately lives
   *outside* the feed.

Two design rules worth knowing (learned the hard way — see `PLAN.md`'s bug
log): the engine **never inserts elements into Reddit's feed** (Reddit's
framework-managed list can unmount neighboring posts when foreign elements
appear inside it — hence the external badge layer), and every failure path
**fails open** (a post the engine can't process ends up visible, never
silently hidden).

## Limitations

- Desktop Chrome only — does nothing for the Reddit mobile app.
- New Reddit only (old.reddit.com would need a second adapter).
- Filters post titles/flair/subreddit, not comment text — opening an
  unrelated post's comments can still spoil you.
- Search results are filtered too, but may flash briefly before blurring
  (the zero-flash guard only covers regular feeds).
- Reddit redesigns can break the adapter; if blurring stops working, the DOM
  probably drifted (set `DEBUG = true` in `src/content/engine.js` for an
  audit log of what the engine sees).

## Development

- `PLAN.md` — architecture decisions, milestone history, and current status.
- `node test/matching.test.js` — tests for the matching logic.
- Debugging: flip `DEBUG` in `src/content/engine.js`; the console then gets a
  summary (posts seen / blocked / unprocessed / metadata problems) after each
  burst of activity.

## Sharing & publishing

- `scripts/package.sh` builds `dist/spoiler-shield-v<version>.zip`.
- **Share with a friend:** send them the zip — unzip, `chrome://extensions`,
  Developer mode, "Load unpacked", pick the folder. (No auto-updates that way.)
- **Chrome Web Store:** `docs/STORE_LISTING.md` is a complete submission kit —
  listing copy, permission justifications, privacy-policy text, and steps.
- First install opens the options page automatically so new users see how
  topics work.

## License

MIT — see `LICENSE`.
