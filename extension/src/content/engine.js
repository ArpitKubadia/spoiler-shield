// Site-agnostic filtering engine: compiles topics, watches the DOM via
// MutationObserver, and blurs matching posts.
//
// IMPORTANT: this engine never inserts elements into Reddit's feed. Reddit's
// feed is a framework-managed list (lit); inserting sibling overlays into it
// made Reddit unmount neighboring posts (see PLAN.md bug log). Blocked posts
// are blurred via attribute + CSS, click-to-reveal is a capture listener, and
// the "<topic> spoiler" label lives in a position:fixed badge layer appended
// to document.body that tracks post positions from outside the feed.
var SS = typeof SS !== "undefined" ? SS : {};

SS.engine = (() => {
  const DEBUG = false; // set true to log an audit summary after activity

  let compiledTopics = [];
  let adapter = null;
  let observer = null;
  const stats = { errors: 0 };
  let auditTimer = null;

  function setConfig(config) {
    const active = config.globalEnabled
      ? config.topics.filter((t) => t.enabled)
      : [];
    compiledTopics = active.map(SS.matching.compileTopic);
    // Arms the pre-paint guard in content.css. Safe because rescan() runs
    // synchronously right after, so no paint happens in between.
    document.documentElement.toggleAttribute(
      "data-ss-active",
      compiledTopics.length > 0
    );
    if (adapter) rescan();
  }

  function observe(siteAdapter) {
    adapter = siteAdapter;
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      // Reddit may hydrate post attributes after the element is inserted;
      // re-classify when the attributes we extract from actually change.
      ...(adapter.attributeHints?.length
        ? { attributes: true, attributeFilter: adapter.attributeHints }
        : {}),
    });

    // Click-to-reveal without injecting any button: capture-phase listener
    // intercepts the first click on a blocked post.
    document.addEventListener(
      "click",
      (e) => {
        const blocked = e
          .composedPath()
          .find(
            (n) =>
              n instanceof Element &&
              n.getAttribute("data-ss-state") === "blocked"
          );
        if (blocked) {
          e.preventDefault();
          e.stopImmediatePropagation();
          reveal(blocked);
        }
      },
      true
    );

    // Badges live outside the page flow, so they must follow posts manually.
    // capture:true catches scrolling inside nested containers too.
    addEventListener("scroll", scheduleReposition, {
      capture: true,
      passive: true,
    });
    addEventListener("resize", scheduleReposition, { passive: true });

    rescan();
  }

  function onMutations(mutations) {
    for (const m of mutations) {
      if (m.type === "attributes") {
        if (
          m.target.nodeType === Node.ELEMENT_NODE &&
          m.target.matches(adapter.unitSelector)
        ) {
          processUnit(m.target);
        }
        continue;
      }
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches(adapter.unitSelector)) processUnit(node);
        if (!node.firstElementChild) continue; // leaf — nothing to search
        for (const unit of node.querySelectorAll(adapter.unitSelector)) {
          processUnit(unit);
        }
      }
    }
    // Feed insertions shift layout under existing badges.
    if (badges.size > 0) scheduleReposition();
  }

  function rescan() {
    for (const unit of document.querySelectorAll(adapter.unitSelector)) {
      processUnit(unit);
    }
  }

  // A "unit" is whatever the adapter's selector finds (a post element, a
  // search-result anchor, …); the adapter maps it to the element to blur.
  function processUnit(unitEl) {
    const target = adapter.resolveTarget ? adapter.resolveTarget(unitEl) : unitEl;
    if (target) processPost(target);
  }

  function processPost(el) {
    try {
      // A user's explicit reveal sticks for the session, across re-scans.
      if (el.getAttribute("data-ss-state") === "revealed") return;
      const topic =
        compiledTopics.length > 0
          ? SS.matching.classify(compiledTopics, adapter.extract(el))
          : null;
      if (topic) block(el, topic);
      else clear(el);
    } catch (err) {
      // Fail open: a broken post must end up visible, never invisible, and
      // must not abort processing of the rest of the batch.
      stats.errors++;
      console.warn(
        "[Spoiler Shield] failed to process post — failing open:",
        err,
        el
      );
      el.setAttribute("data-ss-state", "clear");
    } finally {
      if (DEBUG) scheduleAudit();
    }
  }

  function block(el, topic) {
    el.setAttribute("data-ss-state", "blocked");
    addBadge(el, topic);
  }

  function clear(el) {
    el.setAttribute("data-ss-state", "clear");
    removeBadge(el);
  }

  function reveal(el) {
    el.setAttribute("data-ss-state", "revealed");
    removeBadge(el);
  }

  // --- badge layer -----------------------------------------------------------

  let badgeLayer = null;
  const badges = new Map(); // post element -> badge element
  let repositionQueued = false;

  function ensureBadgeLayer() {
    if (!badgeLayer || !badgeLayer.isConnected) {
      badgeLayer = document.createElement("div");
      badgeLayer.id = "ss-badge-layer";
      document.body.appendChild(badgeLayer);
    }
    return badgeLayer;
  }

  function addBadge(el, topic) {
    let badge = badges.get(el);
    if (!badge || !badge.isConnected) {
      badge = document.createElement("div");
      badge.className = "ss-badge";
      badges.set(el, badge);
      ensureBadgeLayer().appendChild(badge);
    }
    badge.textContent = `${topic.name} spoiler — click to reveal`;
    scheduleReposition();
  }

  function removeBadge(el) {
    const badge = badges.get(el);
    if (badge) {
      badge.remove();
      badges.delete(el);
    }
  }

  function scheduleReposition() {
    if (repositionQueued || badges.size === 0) return;
    repositionQueued = true;
    requestAnimationFrame(() => {
      repositionQueued = false;
      repositionBadges();
    });
  }

  function repositionBadges() {
    for (const [post, badge] of badges) {
      if (
        !post.isConnected ||
        post.getAttribute("data-ss-state") !== "blocked"
      ) {
        badge.remove();
        badges.delete(post);
        continue;
      }
      const r = post.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        badge.style.display = "none"; // post is display:none / collapsed
        continue;
      }
      badge.style.display = "";
      // Page coordinates, not viewport: the badge layer scrolls with the
      // document, so badges track their posts with zero scroll lag.
      const x = (r.left + scrollX + r.width / 2).toFixed(1);
      const y = (
        r.top + scrollY + Math.min(24, Math.max(4, r.height / 2 - 16))
      ).toFixed(1);
      badge.style.transform = `translate(calc(${x}px - 50%), ${y}px)`;
    }
  }

  // --- debug instrumentation -------------------------------------------------

  function scheduleAudit() {
    clearTimeout(auditTimer);
    auditTimer = setTimeout(audit, 2000);
  }

  function audit() {
    const posts = [
      ...new Set(
        [...document.querySelectorAll(adapter.unitSelector)]
          .map((u) => (adapter.resolveTarget ? adapter.resolveTarget(u) : u))
          .filter(Boolean)
      ),
    ];
    const byState = { clear: 0, blocked: 0, revealed: 0, none: 0 };
    let emptyMeta = 0;
    let sampleUnprocessed = null;
    let sampleEmpty = null;
    for (const p of posts) {
      const state = p.getAttribute("data-ss-state");
      if (state) byState[state] = (byState[state] || 0) + 1;
      else {
        byState.none++;
        sampleUnprocessed ??= p;
      }
      let meta = null;
      try {
        meta = adapter.extract(p);
      } catch {}
      if (!meta || (!meta.subreddit && !meta.title)) {
        emptyMeta++;
        sampleEmpty ??= p;
      }
    }
    console.log(
      `[Spoiler Shield] audit: ${posts.length} posts in DOM — ` +
        `${byState.clear} clear, ${byState.blocked} blocked, ` +
        `${byState.revealed} revealed, ${byState.none} UNPROCESSED, ` +
        `${emptyMeta} with empty metadata, ${stats.errors} processing errors`
    );
    if (sampleUnprocessed) {
      console.log("[Spoiler Shield] sample UNPROCESSED post:", sampleUnprocessed);
    }
    if (sampleEmpty) {
      console.log(
        "[Spoiler Shield] sample empty-metadata post:",
        sampleEmpty,
        "attributes:",
        sampleEmpty.getAttributeNames().join(", ")
      );
    }
  }

  function enabledTopicNames() {
    return compiledTopics.map((t) => t.name);
  }

  return { setConfig, observe, enabledTopicNames };
})();
