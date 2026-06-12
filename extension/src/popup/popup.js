let config = null;

async function init() {
  config = await SS.storage.getConfig();
  const master = document.getElementById("master");
  master.checked = config.globalEnabled;
  master.addEventListener("change", () => {
    config.globalEnabled = master.checked;
    persist();
    renderTopics();
  });
  document
    .getElementById("open-options")
    .addEventListener("click", () => chrome.runtime.openOptionsPage());
  renderTopics();
}

function renderTopics() {
  const root = document.getElementById("topics");
  root.classList.toggle("disabled", !config.globalEnabled);
  root.textContent = "";

  for (const topic of config.topics) {
    const row = document.createElement("div");
    row.className = "topic-row";

    const name = document.createElement("span");
    name.className = "topic-name";
    name.textContent = topic.name;
    const hasRules =
      (topic.subredditPatterns || []).length > 0 ||
      (topic.keywords || []).length > 0;
    if (!hasRules) {
      const hint = document.createElement("span");
      hint.className = "topic-empty";
      hint.textContent = "(no rules yet)";
      name.appendChild(hint);
    }

    const label = document.createElement("label");
    label.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = topic.enabled;
    input.addEventListener("change", () => {
      topic.enabled = input.checked;
      persist();
    });
    const slider = document.createElement("span");
    slider.className = "slider";
    label.append(input, slider);

    row.append(name, label);
    root.appendChild(row);
  }
}

function persist() {
  // Open Reddit tabs pick this up via chrome.storage.onChanged and re-scan.
  SS.storage.saveConfig(config);
}

init();
