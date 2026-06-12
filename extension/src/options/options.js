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

    head.append(name, enabledLabel, del);

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

async function importConfig(e) {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!parsed || !Array.isArray(parsed.topics)) {
      throw new Error("not a Spoiler Shield config (missing topics array)");
    }

    // Build a lookup of existing topics by lowercase name for dedup
    const existingByName = new Map(
      config.topics.map((t) => [t.name.toLowerCase(), t])
    );

    for (const t of parsed.topics) {
      const incomingName = String(t.name || "Unnamed topic").trim();
      const key = incomingName.toLowerCase();
      const incomingPatterns = (t.subredditPatterns || []).map(String);
      const incomingKeywords = (t.keywords || []).map(String);

      if (existingByName.has(key)) {
        // Merge: deduplicate subredditPatterns and keywords. Survives topics
        // whose arrays are missing (hand-edited configs) and dedupes
        // case-insensitively.
        const existing = existingByName.get(key);
        existing.subredditPatterns = mergeUnique(
          existing.subredditPatterns,
          incomingPatterns
        );
        existing.keywords = mergeUnique(existing.keywords, incomingKeywords);
      } else {
        // Append new topic. Always a fresh id: imported ids can collide with
        // an existing different-named topic's id (everyone's export says
        // "f1") — name is the merge identity, ids must stay unique.
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
      }
    }

    await SS.storage.saveConfig(config);
    render();
    setStatus("Imported and merged.");
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
