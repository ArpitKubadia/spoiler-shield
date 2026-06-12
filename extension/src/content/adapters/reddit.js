// The ONLY file allowed to know Reddit's DOM. Engine talks to this interface;
// future sites (YouTube, etc.) implement the same shape.
var SS = typeof SS !== "undefined" ? SS : {};
SS.adapters = SS.adapters || {};

SS.adapters.reddit = {
  matches(url) {
    try {
      return /(^|\.)reddit\.com$/i.test(new URL(url).hostname);
    } catch {
      return false;
    }
  },

  // Anything that can represent a post:
  // - <shreddit-post>: feeds, subreddit pages, post detail
  // - a[data-testid="post-title"]: search-result pages, which don't use
  //   shreddit-post (confirmed from a live DOM snippet, 2026-06)
  unitSelector: 'shreddit-post, a[data-testid="post-title"]',

  // Attributes that drive extract(); the engine re-classifies a post when
  // these change (Reddit hydrates some attributes after insertion).
  attributeHints: ["subreddit-prefixed-name", "subreddit-name", "post-title", "permalink"],

  // Map a matched unit to the element that should be blurred/tracked,
  // or null to skip it.
  resolveTarget(el) {
    if (el.localName === "shreddit-post") return el;

    // Search-result title anchor. Feed posts contain title anchors too but
    // are already handled at the shreddit-post level.
    if (el.closest("shreddit-post")) return null;
    // The card is div[data-testid="search-post-unit"] (confirmed from a live
    // DOM snippet). Do NOT use search-telemetry-tracker here: Reddit nests
    // one around just the title link, which is smaller than the card.
    const card =
      el.closest('[data-testid="search-post-unit"]') ||
      // The title anchor is absolutely positioned to cover its card, so its
      // offsetParent IS the card — a markup-agnostic fallback.
      el.offsetParent ||
      el.parentElement;
    if (!card || card === document.body || card === document.documentElement) {
      return null;
    }
    // Safety: never blur a container holding multiple results.
    if (card.querySelectorAll('a[data-testid="post-title"]').length > 1) {
      return null;
    }
    return card;
  },

  extract(el) {
    if (el.localName === "shreddit-post") {
      // Several fallbacks because attribute names drift across Reddit
      // deploys and some posts hydrate late.
      let subreddit = (
        el.getAttribute("subreddit-prefixed-name") ||
        el.getAttribute("subreddit-name") ||
        ""
      ).replace(/^r\//i, "");
      if (!subreddit) {
        const fromLink = (el.getAttribute("permalink") || "").match(/\/r\/([^/]+)\//i);
        if (fromLink) subreddit = fromLink[1];
      }

      const title =
        el.getAttribute("post-title") ||
        el.querySelector('[slot="title"]')?.textContent?.trim() ||
        "";

      // Flair lives in slotted light-DOM content; selector is best-effort
      // and harmless when nothing matches.
      const flairEl = el.querySelector(
        'shreddit-post-flair, [slot="post-flair"], .flair-content'
      );

      return {
        subreddit,
        title,
        flair: (flairEl?.textContent || "").replace(/\s+/g, " ").trim(),
      };
    }

    // Search-result card: everything comes from the title anchor.
    const a = el.matches('a[data-testid="post-title"]')
      ? el
      : el.querySelector('a[data-testid="post-title"]');
    const fromHref = (a?.getAttribute("href") || "").match(/\/r\/([^/]+)\//i);
    return {
      subreddit: fromHref ? fromHref[1] : "",
      title: a?.getAttribute("aria-label") || a?.textContent?.trim() || "",
      flair: "",
    };
  },
};
