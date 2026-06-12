# Chrome Web Store submission kit

Everything needed to publish the extension. Build the upload zip with `scripts/package.sh`.

---

## Listing copy

### **Name (from manifest):** 
`Spoiler Shield - Reddit Spoiler Blocker` (39 chars / max 45)

### **Summary (≤132 chars):**
> Block F1, FIFA World Cup, TV show, and movie spoilers on Reddit. Automatically blurs titles and thumbnails on your home feed. (125 chars)

### **Description:**
> Avoid spoilers on Reddit before you’ve watched! Whether it's a Formula 1 race, a FIFA World Cup soccer match, the latest anime episode, or a major TV show finale, Spoiler Shield blocks spoilers instantly so you can browse Reddit stress-free.
>
> Reddit recommendations and recommended subreddits often leak results directly onto your home feed from subreddits you don't even follow. Spoiler Shield acts as your personal shield, blurring matching posts — titles AND thumbnails — with a clean "spoiler — click to reveal" badge.
>
> ### 🏆 KEY FEATURES
>
> • **Instant Pre-Paint Blurring:** Spoilers are hidden *before* they render on the page. No flash, no leaks, and no accidental glances.
> • **Subreddit & Keyword Wildcards:** Create filters using subreddit wildcards (e.g., `*f1*`, `*worldcup*`) and title keywords (e.g., "Verstappen", "penalty shootout", "Mbappé", "full time", "leak").
> • **Click-to-Reveal:** Want to see a specific post? Just click it to reveal its content. The rest of your feed stays protected, and the topic filter remains enabled.
> • **Community Packs:** Save time by importing community-curated packs for Formula 1, Football (Soccer), Cricket, NBA, UFC, and more.
> • **Privacy First & Open Source:** Free, MIT-licensed, no accounts, and no tracking. All processing and storage happen locally inside your browser.
>
> ---
>
> ### 🏁 FORMULA 1 (F1) SPOILER PROTECTION
> Never get qualifying or race results spoiled again. Block race outcomes, podium standings, and driver drama.
> • **Subreddit patterns:** `formula1`, `formuladank`, `*f1*`, `grandprix*`, `redbullracing`, `mercedesamgf1`, etc.
> • **Keywords:** `Verstappen`, `Hamilton`, `Norris`, `Leclerc`, `Piastri`, `qualifying`, `pole position`, `GP`, `winner`, `podium`.
>
> ### ⚽ FIFA WORLD CUP & SPORTS SPOILERS
> Block match scores, penalty shootouts, injury updates, and tournament brackets for major sporting events.
> • **Subreddit patterns:** `worldcup`, `soccer`, `football`, `sports`, `*worldcup*`, etc.
> • **Keywords:** `FIFA`, `World Cup`, `shootout`, `hat trick`, `penalty`, `semi final`, `full time`, and star players like `Mbappé` or `Yamal`.
>
> ### 🎬 TV SHOWS, MOVIES, ANIME & GEEK CULTURE
> Safely surf Reddit during season finales, premiere nights, or comic book releases.
> • **Subreddit patterns:** `television`, `movies`, `anime`, `houseofthedragon`, `severance*`, etc.
> • **Keywords:** plot twists, character deaths, finale, post-credit, leaks, review, spoiler, `Severance`, `Lumon`.
>
> ---
>
> ### ⚙️ WHY IT WORKS BETTER
>
> Standard keyword filters often fail because they only check titles and miss recommendations. Spoiler Shield compiles your wildcards and keywords into highly optimized regular expressions, scanning Reddit's dynamic feeds (www.reddit.com) in real-time as you scroll.
>
> Watch first. Scroll later.
>
> ---
> **Category:** Social & Communication
> **Language:** English (US)

---

## SEO Optimization Strategy

The Chrome Web Store indexing engine prioritizes **Extension Name**, **Summary**, and **Description** density:
1. **High-Volume Search Phrases:** We naturally integrated phrases like *"Reddit spoiler blocker"*, *"block spoilers on Reddit"*, *"Formula 1 spoiler blocker"*, and *"FIFA World Cup spoiler filter"*.
2. **Sports & TV Relevance:** By maintaining dedicated sections for F1, FIFA World Cup, and TV shows, we index on high-intent names (Verstappen, Hamilton, FIFA, World Cup, soccer, television) while keeping a generic name.
3. **Keyword Density:** Avoided keyword stuffing (which Chrome Web Store spam filters flag) by embedding keywords in readable, value-driven feature lists.

---

## Assets prepared

Final store assets live in **`dist/assets/`**, built by `scripts/crop_assets.py` (run with `.venv/bin/python`; crop boxes are hand-tuned to the raw grabs in `screenshots/`, which stay local/un-committed). Upload screenshots in this order:

1. **`01_worldcup_before_after.png` (1280×800):** split-frame — r/worldcup post-match score card fully visible vs. the same page blurred with the "FIFA World Cup spoiler — click to reveal" badge. Labeled WITHOUT / WITH bands.
2. **`02_formula1_before_after.png` (1280×800):** split-frame — race podium results vs. blurred with badges.
3. **`03_home_feed_ambush.png` (1280×800):** home feed with a blurred World Cup post sitting between normal posts — the "spoilers from subs you don't follow" story.
4. **`04_options_community_packs.png` (1280×800):** options page with the Community packs browser and topic editor.
5. **`promo_tile_440x280.png`:** small promo tile — gradient, shield logo, "Watch first. Scroll later."

*(Optional 5th screenshot, not yet taken: the toolbar popup open over a blurred feed showing the FIFA World Cup / Formula 1 toggles. If you grab it — full-screen, popup open — add a crop entry to crop_assets.py.)*

---

## Launch checklist

1. **GitHub Repository Setup:**
   - **About Description:** *Chrome extension that blurs Reddit spoilers by topic — F1, FIFA World Cup, TV shows. Community topic packs.*
   - **Repository Tags:** `chrome-extension`, `reddit`, `spoilers`, `spoiler-blocker`, `formula1`, `world-cup`, `manifest-v3`, `soccer`, `television`.
2. **Live Store Link:** Once approved, add the Chrome Web Store installation link to the `README.md` file.
3. **Launch Promotion:** Time your announcement posts on r/chrome_extensions, r/SideProject, and Show HN to coincide with an F1 race weekend or a World Cup knockout round.

---

## Privacy Justifications (Developer Console)

*When submitting, fill in the Privacy Tab with these justifications to ensure quick approval:*

- **Single purpose:** "Hides user-selected spoiler topics on reddit.com by blurring matching posts."
- **Storage permission:** "Saves the user's custom topic lists and toggle state, synchronized across devices via Chrome's secure storage sync."
- **Host access (`*://www.reddit.com/*`, `*://sh.reddit.com/*`):** "The content script requires host access to inspect post titles, flair, and subreddit names on Reddit pages locally in the browser to determine which posts match the spoiler filters."
- **Remote code:** "None. The extension does not load or run remote code. The only network request fetches public community topic packs (static JSON data) from the open-source GitHub repository when the user manually opens the options page."

---

## Privacy Policy Text

> **Spoiler Shield Privacy Policy**
> Spoiler Shield does not collect, transmit, sell, or share any personal data. All settings, including topic names, subreddit patterns, title keywords, and toggle states, are stored locally in your browser's extension storage. If you are signed into Chrome, these settings are synchronized across your devices using Google's secure `chrome.storage.sync` API. The extension's only network communication is fetching public, open-source topic pack catalog JSON files from our GitHub repository when you open the options page. No user information is transmitted or recorded.
