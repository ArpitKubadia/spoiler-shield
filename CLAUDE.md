# Spoiler Shield

Chrome MV3 extension that blurs spoiler posts on new Reddit by toggleable topic (subreddit patterns + keywords).

**Start here:** read `PLAN.md` in full — it carries all decisions, architecture, milestone definitions, and the Progress Log showing where work stopped. Update the Progress Log (and "Notes for the next session") whenever you finish or pause work.

Conventions:
- Vanilla JS, no build step. Content scripts are classic scripts sharing a global `SS` namespace, loaded in dependency order via `manifest.json`.
- All Reddit DOM knowledge lives only in `extension/src/content/adapters/reddit.js`.
- Pure logic (`shared/matching.js`) stays free of `chrome.*` so `node test/matching.test.js` can run it.
- Reddit's DOM drifts; if selectors/attributes in PLAN.md don't match reality, fix the adapter and correct PLAN.md.
