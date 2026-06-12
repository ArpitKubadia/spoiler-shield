// Config persistence in chrome.storage.sync, versioned for future migrations.
var SS = typeof SS !== "undefined" ? SS : {};

SS.storage = (() => {
  const KEY = "config";

  const DEFAULT_CONFIG = {
    version: 1,
    globalEnabled: true,
    topics: [
      {
        id: "f1",
        name: "Formula 1",
        enabled: false,
        subredditPatterns: [
          "formula1",
          "formuladank",
          "*f1*",
          "formula*",
          "grandprix*",
          "redbullracing",
        ],
        keywords: [
          "verstappen",
          "hamilton",
          "norris",
          "leclerc",
          "piastri",
          "russell",
          "alonso",
          "sainz",
          "grand prix",
          "qualifying",
          "pole position",
          "podium",
          "fastest lap",
        ],
        action: "blur",
      },
      {
        id: "tv-shows",
        name: "TV Shows",
        enabled: false,
        subredditPatterns: [],
        keywords: [],
        action: "blur",
      },
    ],
  };

  // Bring any stored value up to the current schema. Unknown/missing -> defaults.
  function migrate(stored) {
    if (!stored || typeof stored.version !== "number" || !Array.isArray(stored.topics)) {
      return structuredClone(DEFAULT_CONFIG);
    }
    // version 1 is current; add stepwise upgrades here when version bumps.
    // Normalize every topic so hand-edited/imported configs can never hand
    // consumers a topic with missing fields.
    return {
      version: 1,
      globalEnabled: stored.globalEnabled !== false,
      topics: stored.topics.map((t) => ({
        id: t.id || crypto.randomUUID(),
        name: String(t.name || "Unnamed topic"),
        enabled: Boolean(t.enabled),
        subredditPatterns: Array.isArray(t.subredditPatterns)
          ? t.subredditPatterns.map(String)
          : [],
        keywords: Array.isArray(t.keywords) ? t.keywords.map(String) : [],
        action: "blur",
      })),
    };
  }

  async function getConfig() {
    const result = await chrome.storage.sync.get(KEY);
    return migrate(result[KEY]);
  }

  async function saveConfig(config) {
    await chrome.storage.sync.set({ [KEY]: config });
  }

  function onConfigChanged(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes[KEY]) {
        callback(migrate(changes[KEY].newValue));
      }
    });
  }

  return { KEY, DEFAULT_CONFIG, getConfig, saveConfig, onConfigChanged };
})();
