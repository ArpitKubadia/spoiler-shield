# Chrome Web Store submission kit

Everything needed to publish. Build the upload zip with `scripts/package.sh`.

## Listing copy

**Name (from manifest):** Spoiler Shield: Hide Reddit Spoilers

**Summary (≤132 chars):**
> It's World Cup season. Toggle a topic on until you've watched — Reddit posts blur, even from subreddits you don't follow.

**Description:**
> The World Cup is on. The F1 season is on. And Reddit does not care that you haven't watched yet — spoilers hit you from subreddits you don't even follow, the moment you open the app.
>
> Spoiler Shield hides Reddit spoilers by topic. Before you open Reddit, flip "FIFA World Cup" or "Formula 1" on from the toolbar: every matching post — title AND thumbnail — is blurred with a "spoiler — click to reveal" badge. Watched the match? Toggle off, or reveal posts one at a time. Both topics come built in, ready to enable.
>
> WHY IT CATCHES WHAT OTHERS MISS
> A topic isn't a list of subreddits — it's subreddit wildcard patterns (*f1*, *worldcup*) plus title keywords (Verstappen, Mbappé, "penalty shootout", "full time"). So it blurs the post Reddit recommends from r/MercedesAMGF1 you've never visited, and the result that leaks into r/sports.
>
> COMMUNITY TOPIC PACKS
> Don't build keyword lists alone. Browse community packs (World Cup, Formula 1, Football, Cricket, NBA, UFC) and add one in a click. Packs are open source — anyone can improve them or share their own, and updates only ever ADD to your setup, never overwrite it. TV shows, anime, any fandom: make a topic, share it.
>
> • Blurs spoilers on feeds, subreddit pages, and search results (new Reddit)
> • No spoiler flash: posts are hidden before they ever paint on feeds
> • Click-to-reveal one post at a time; topics stay on
> • Free, open source (MIT), no accounts, no tracking — nothing leaves your browser
>
> Watch first. Scroll later.

**Category:** Social & Communication. **Language:** English.

**SEO notes:** the store indexes name + summary + description. High-intent phrases worked in naturally above: "hide Reddit spoilers", "spoiler blocker", "blur spoilers", "World Cup", "Formula 1 / F1", "TV shows". Don't keyword-stuff beyond this — CWS flags spam, and reviews/installs matter more for ranking than copy.

## Assets needed (arpit provides screenshots; specs below)

All screenshots **exactly 1280×800** (easiest: make the Chrome window roughly that size, screenshot it, then crop to 1280×800 in Preview — Tools → Adjust Size/Crop). Take in this order; #1 is the one most people see:

1. **HERO — home feed mid-block:** reddit.com home with World Cup + F1 toggled on; 2–3 blurred cards with purple badges visible BETWEEN normal posts (the contrast sells it). No NSFW/embarrassing posts visible.
2. **The toggle moment:** same feed with the toolbar popup open showing "FIFA World Cup" and "Formula 1" switches on.
3. **Options page:** Community packs section (packs list now loads live from your GitHub) above your topic cards.
4. **Search results:** search "verstappen" or "world cup", results blurred with badges.
5. *(Optional)* One revealed post next to still-blurred ones — shows click-to-reveal.

**Small promo tile (440×280, strongly recommended — it's what shows in store browse):** purple background (#7C3AED), the shield icon (extension/icons/icon128.png), "Spoiler Shield" + tagline "Watch first. Scroll later." Five minutes in Canva/Figma; or crop the hero screenshot and overlay the title.

## Launch checklist (beyond the store)

- GitHub repo → About: description "Chrome extension that blurs Reddit spoilers by topic — World Cup, F1, TV shows. Community topic packs." Topics: `chrome-extension`, `reddit`, `spoilers`, `spoiler-blocker`, `formula1`, `world-cup`, `manifest-v3`.
- Once the store listing is live, add its link to the README install section (store install beats load-unpacked for normal users).
- Posting ideas (one honest "I built this" post, not spam): r/chrome_extensions, r/SideProject, Show HN; F1/soccer subreddits only where self-promo rules allow, framed as "I kept getting race results spoiled by recommended subs, so I built a topic-based blur". Time it to a race weekend / knockout round.

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
