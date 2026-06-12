// Pure matching logic. No chrome.* APIs here — this file must stay runnable in
// plain node (see test/matching.test.js).
var SS = typeof SS !== "undefined" ? SS : {};

SS.matching = (() => {
  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Wildcard subreddit pattern ("*f1*", "formula*") -> anchored case-insensitive RegExp.
  // Matched against the bare subreddit name, no "r/" prefix.
  function compilePattern(pattern) {
    const body = pattern.trim().split("*").map(escapeRegex).join(".*");
    return new RegExp("^" + body + "$", "i");
  }

  // Keyword -> case-insensitive phrase regex with word boundaries on both ends,
  // so "P1" matches "P1!" but not "P100" or "MP1". Multi-word keywords match as
  // a phrase across any whitespace ("grand prix" matches "grand  prix").
  function compileKeyword(keyword) {
    const phrase = keyword.trim().split(/\s+/).map(escapeRegex).join("\\s+");
    return new RegExp(
      "(?<![\\p{L}\\p{N}])" + phrase + "(?![\\p{L}\\p{N}])",
      "iu"
    );
  }

  function compileTopic(topic) {
    return {
      id: topic.id,
      name: topic.name,
      action: topic.action || "blur",
      subredditRegexes: (topic.subredditPatterns || [])
        .filter((p) => p && p.trim())
        .map(compilePattern),
      keywordRegexes: (topic.keywords || [])
        .filter((k) => k && k.trim())
        .map(compileKeyword),
    };
  }

  // post: { subreddit, title, flair } — strings, may be empty.
  // Returns the first matching compiled topic, or null. Callers pass only
  // enabled topics; this function doesn't know about enabled/globalEnabled.
  function classify(compiledTopics, post) {
    const subreddit = (post.subreddit || "").trim();
    const text = ((post.title || "") + " " + (post.flair || "")).trim();
    for (const topic of compiledTopics) {
      if (subreddit && topic.subredditRegexes.some((rx) => rx.test(subreddit))) {
        return topic;
      }
      if (text && topic.keywordRegexes.some((rx) => rx.test(text))) {
        return topic;
      }
    }
    return null;
  }

  return { compilePattern, compileKeyword, compileTopic, classify };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SS.matching;
}
