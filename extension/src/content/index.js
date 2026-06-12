// Content-script entry point. Runs at document_start. Quiet by default —
// flip DEBUG in engine.js for audit logging.
(async () => {
  try {
    const config = await SS.storage.getConfig();
    SS.engine.setConfig(config);
    SS.engine.observe(SS.adapters.reddit);
    SS.storage.onConfigChanged((newConfig) => SS.engine.setConfig(newConfig));
  } catch (err) {
    console.error("[Spoiler Shield] startup failed:", err);
  }
})();
