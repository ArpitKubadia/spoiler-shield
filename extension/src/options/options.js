let config = null;

const lines = {
  toText: (arr) => (arr || []).join("\n"),
  toArray: (text) =>
    text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
};

// Case-insensitive, trimming, order-preserving union — import must only ever
// ADD entries, never remove or rewrite existing ones. Case-insensitive
// because matching is case-insensitive anyway ("Verstappen" === "verstappen").
function mergeUnique(base, extra) {
  const out = [];
  const seen = new Set();
  for (const raw of [...(base || []), ...(extra || [])]) {
    const s = String(raw).trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}

// Community pack registry: the packs/ folder of the open-source repo, served
// raw from GitHub. After publishing the repo, replace REPLACE_WITH_YOUR_USER
// below (one place) — the packs browser and Share-to-GitHub flow light up.
const REPO_URL = "https://github.com/ArpitKubadia/spoiler-shield";
const DEFAULT_REGISTRY_URL =
  REPO_URL.replace("github.com", "raw.githubusercontent.com") +
  "/main/packs/index.json";

async function getRegistry() {
  const r = (await chrome.storage.sync.get("registry")).registry || {};
  return { url: r.url || DEFAULT_REGISTRY_URL, installed: r.installed || {} };
}

async function saveRegistry(reg) {
  await chrome.storage.sync.set({ registry: reg });
}

async function init() {
  config = await SS.storage.getConfig();
  render();

  document.getElementById("add-topic").addEventListener("click", () => {
    config.topics.push({
      id: crypto.randomUUID(),
      name: "New topic",
      enabled: false,
      subredditPatterns: [],
      keywords: [],
      action: "blur",
    });
    render();
  });

  document.getElementById("save").addEventListener("click", save);
  document.getElementById("export").addEventListener("click", exportConfig);
  document.getElementById("import").addEventListener("change", importConfig);

  document.getElementById("refresh-packs").addEventListener("click", loadPacks);
  document
    .getElementById("registry-url")
    .addEventListener("change", async (e) => {
      const reg = await getRegistry();
      reg.url = e.target.value.trim() || DEFAULT_REGISTRY_URL;
      await saveRegistry(reg);
      loadPacks();
    });
  loadPacks();
}

// --- community packs ---------------------------------------------------------

async function loadPacks() {
  const listEl = document.getElementById("packs-list");
  const reg = await getRegistry();
  document.getElementById("registry-url").value = reg.url;
  if (reg.url.includes("REPLACE_WITH_YOUR_USER")) {
    listEl.textContent =
      "Registry not published yet — once the repo is on GitHub, set the raw " +
      "URL of packs/index.json above (see README → Sharing & publishing).";
    return;
  }
  listEl.textContent = "Loading…";
  try {
    const res = await fetch(reg.url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const index = await res.json();
    if (!Array.isArray(index.packs)) throw new Error("invalid registry index");
    renderPacks(index.packs, reg);
  } catch (err) {
    listEl.textContent = `Couldn't load registry: ${err.message}`;
  }
}

function renderPacks(packs, reg) {
  const listEl = document.getElementById("packs-list");
  listEl.textContent = "";
  for (const pack of packs) {
    const row = document.createElement("div");
    row.className = "pack-row";
    const info = document.createElement("div");
    info.className = "pack-info";
    const name = document.createElement("strong");
    name.textContent = pack.name;
    const desc = document.createElement("div");
    desc.className = "pack-desc";
    desc.textContent = pack.description || "";
    info.append(name, desc);
    const btn = document.createElement("button");
    btn.type = "button";
    // "Re-sync" re-merges the pack; safe by construction (add-only, deduped).
    btn.textContent = reg.installed[pack.id] ? "Re-sync" : "Add";
    btn.addEventListener("click", () => addPack(pack, reg, btn));
    row.append(info, btn);
    listEl.appendChild(row);
  }
}

async function addPack(pack, reg, btn) {
  btn.disabled = true;
  try {
    const packUrl = new URL(pack.file, reg.url).href;
    const res = await fetch(packUrl, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.topics)) throw new Error("invalid pack file");
    const { added, extended } = mergeTopicsInto(data.topics);
    reg.installed[pack.id] = Date.now();
    await saveRegistry(reg);
    await SS.storage.saveConfig(config);
    render();
    setStatus(
      `"${pack.name}": ${added} topic(s) added, ${extended} extended — nothing removed.`
    );
    btn.textContent = "Re-sync";
  } catch (err) {
    setStatus(`Pack failed: ${err.message}`, true);
  } finally {
    btn.disabled = false;
  }
}

function shareTopic(topic) {
  const slug =
    topic.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "topic";
  const pack = {
    version: 1,
    topics: [
      {
        name: topic.name,
        enabled: false,
        subredditPatterns: topic.subredditPatterns,
        keywords: topic.keywords,
      },
    ],
  };
  const json = JSON.stringify(pack, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slug}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  if (!REPO_URL.includes("REPLACE_WITH_YOUR_USER")) {
    // GitHub's prefilled new-file page handles fork + PR for the user.
    open(
      `${REPO_URL}/new/main?filename=packs/${slug}.json&value=${encodeURIComponent(json)}`
    );
    setStatus("Pack downloaded + GitHub contribution page opened.");
  } else {
    setStatus("Pack file downloaded — share it, or PR it into the repo's packs/ folder.");
  }
}

function render() {
  const root = document.getElementById("topics");
  root.textContent = "";

  for (const topic of config.topics) {
    const card = document.createElement("div");
    card.className = "topic-card";

    const head = document.createElement("div");
    head.className = "topic-head";

    const name = document.createElement("input");
    name.type = "text";
    name.value = topic.name;
    name.placeholder = "Topic name";
    name.addEventListener("input", () => (topic.name = name.value));

    const enabledLabel = document.createElement("label");
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = topic.enabled;
    enabled.addEventListener("change", () => (topic.enabled = enabled.checked));
    enabledLabel.append(enabled, document.createTextNode("enabled"));

    const share = document.createElement("button");
    share.type = "button";
    share.textContent = "Share";
    share.title = "Download this topic as a shareable pack file";
    share.addEventListener("click", () => shareTopic(topic));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      if (confirm(`Delete topic "${topic.name}"?`)) {
        config.topics = config.topics.filter((t) => t !== topic);
        render();
      }
    });

    head.append(name, enabledLabel, share, del);

    const fields = document.createElement("div");
    fields.className = "fields";
    fields.append(
      makeField("Subreddit patterns (one per line, * = wildcard)", topic.subredditPatterns, (arr) => (topic.subredditPatterns = arr)),
      makeField("Title/flair keywords (one per line)", topic.keywords, (arr) => (topic.keywords = arr))
    );

    card.append(head, fields);
    root.appendChild(card);
  }
}

function makeField(labelText, value, onChange) {
  const field = document.createElement("div");
  field.className = "field";
  const label = document.createElement("label");
  label.textContent = labelText;
  const ta = document.createElement("textarea");
  ta.value = lines.toText(value);
  ta.spellcheck = false;
  ta.addEventListener("input", () => onChange(lines.toArray(ta.value)));
  field.append(label, ta);
  return field;
}

async function save() {
  config.topics = config.topics.filter((t) => t.name.trim());
  for (const t of config.topics) t.name = t.name.trim();
  await SS.storage.saveConfig(config);
  render();
  setStatus("Saved — applies to open Reddit tabs immediately.");
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "spoiler-shield-config.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

// Merge topics into config by NAME (case-insensitive): the shared core of
// file import and community packs. Add-only — never overwrites or deletes.
function mergeTopicsInto(topics) {
  const existingByName = new Map(
    config.topics.map((t) => [t.name.toLowerCase(), t])
  );
  let added = 0;
  let extended = 0;

  for (const t of topics) {
    const incomingName = String(t.name || "Unnamed topic").trim();
    const key = incomingName.toLowerCase();
    const incomingPatterns = (t.subredditPatterns || []).map(String);
    const incomingKeywords = (t.keywords || []).map(String);

    if (existingByName.has(key)) {
      const existing = existingByName.get(key);
      const before = existing.subredditPatterns.length + existing.keywords.length;
      existing.subredditPatterns = mergeUnique(
        existing.subredditPatterns,
        incomingPatterns
      );
      existing.keywords = mergeUnique(existing.keywords, incomingKeywords);
      if (existing.subredditPatterns.length + existing.keywords.length > before) {
        extended++;
      }
    } else {
      // Always a fresh id: imported ids can collide with an existing
      // different-named topic's id (everyone's export says "f1") — name is
      // the merge identity, ids must stay unique.
      const newTopic = {
        id: crypto.randomUUID(),
        name: incomingName,
        enabled: Boolean(t.enabled),
        subredditPatterns: mergeUnique([], incomingPatterns),
        keywords: mergeUnique([], incomingKeywords),
        action: "blur",
      };
      config.topics.push(newTopic);
      existingByName.set(key, newTopic);
      added++;
    }
  }
  return { added, extended };
}

async function importConfig(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.topics)) {
      throw new Error("not a Spoiler Shield config (missing topics array)");
    }

    const { added, extended } = mergeTopicsInto(parsed.topics);
    await SS.storage.saveConfig(config);
    render();
    setStatus(
      `Imported: ${added} topic(s) added, ${extended} extended — nothing removed.`
    );
  } catch (err) {
    setStatus(`Import failed: ${err.message}`, true);
  }
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.classList.toggle("error", isError);
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => (el.textContent = ""), 4000);
}

init();
