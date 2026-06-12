# Chrome Web Store submission kit

Everything needed to publish. Build the upload zip with `scripts/package.sh`.

## Listing copy

**Name:** Spoiler Shield

**Summary (≤132 chars):**
> Blur spoilers on Reddit by topic. Toggle "Formula 1" on until you've watched the race — posts blur, even from subs you don't follow.

**Description:**
> Haven't watched the race yet? The episode? Reddit's recommendations don't care — spoilers show up from subreddits you don't even follow.
>
> Spoiler Shield blurs spoiler-prone posts by topic. A topic bundles subreddit wildcard patterns (like *f1*) with title keywords (driver names, "qualifying", …). Toggle it on from the toolbar before opening Reddit; every matching post — title and thumbnail — is blurred with a "spoiler — click to reveal" badge. Watched it? Toggle off, or reveal posts one at a time.
>
> • Works on feeds, subreddit pages, and search results (new Reddit)
> • Posts never flash before blurring on feeds
> • Fully customizable topics; ships with a Formula 1 starter
> • Import/export topic packs to share with friends (imports merge, never overwrite)
> • No accounts, no tracking, no data leaves your browser

**Category:** Social & Communication. **Language:** English.

## Required justifications (Privacy tab)

- **Single purpose:** Hides user-selected spoiler topics on reddit.com by blurring matching posts.
- **storage permission:** Saves the user's topic lists and toggle state, synced via Chrome's own storage sync.
- **Host access (www.reddit.com, sh.reddit.com):** The content script must read post titles/subreddit names on Reddit pages to decide what to blur. All matching happens locally.
- **Remote code:** None. The only network activity is fetching community topic-pack JSON (data, not code) from this project's public GitHub repo, and only when the user opens the options page or clicks Add/Refresh there.

## Privacy policy (host this text anywhere public, e.g. a GitHub page, and link it)

> Spoiler Shield does not collect, transmit, sell, or share any data. All settings (topic names, subreddit patterns, keywords, toggles) are stored in Chrome's extension storage in your browser and, if you're signed into Chrome, synced by Google's chrome.storage.sync — never by us. The extension's only network requests fetch the public community topic-pack catalog (JSON files in the project's open-source GitHub repository) when you open its options page; nothing about you is sent. Page content is read only locally to decide which posts to blur and is never recorded.

## Submission steps

1. One-time: register as a Chrome Web Store developer ($5) at https://chrome.google.com/webstore/devconsole
2. `scripts/package.sh` → upload `dist/spoiler-shield-v*.zip`
3. Fill listing copy + justifications from above; link the privacy policy
4. Assets needed: at least one 1280×800 screenshot (blurred F1 feed with badges is the money shot; plus the popup and the options page), and the 128px icon (already in the zip)
5. Submit for review (usually 1–3 days for an extension with this little surface)

## Sharing without the store

Send someone the zip from `scripts/package.sh`: they unzip it, open chrome://extensions, enable Developer mode, "Load unpacked", select the folder. Caveat: unpacked installs don't auto-update and Chrome periodically nags about developer-mode extensions.
