// Run with: node test/matching.test.js
const assert = require("node:assert/strict");
const matching = require("../extension/src/shared/matching.js");

let passed = 0;
const failures = [];
function t(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push({ name, err });
  }
}

// --- subreddit wildcard patterns -------------------------------------------

t("exact pattern matches, case-insensitive", () => {
  const rx = matching.compilePattern("formula1");
  assert.ok(rx.test("formula1"));
  assert.ok(rx.test("Formula1"));
});

t("exact pattern is anchored (no substring match)", () => {
  const rx = matching.compilePattern("formula1");
  assert.ok(!rx.test("formula1point5"));
  assert.ok(!rx.test("xformula1"));
});

t("*f1* matches f1 anywhere in the name — including wtf1 (intentional)", () => {
  const rx = matching.compilePattern("*f1*");
  assert.ok(rx.test("MercedesAMGF1"));
  assert.ok(rx.test("F1Technical"));
  assert.ok(rx.test("wtf1")); // WTF1 is an F1 media sub; broad on purpose
});

t("formula* matches prefix subs", () => {
  const rx = matching.compilePattern("formula*");
  assert.ok(rx.test("formuladank"));
  assert.ok(rx.test("formula1point5"));
  assert.ok(!rx.test("f1formula")); // prefix only
});

t("regex metacharacters in patterns are escaped", () => {
  const rx = matching.compilePattern("a.b");
  assert.ok(rx.test("a.b"));
  assert.ok(!rx.test("aXb"));
});

// --- keywords ---------------------------------------------------------------

t("keyword matches with word boundaries, case-insensitive", () => {
  const rx = matching.compileKeyword("verstappen");
  assert.ok(rx.test("VERSTAPPEN WINS!"));
  assert.ok(rx.test("Verstappen's pole lap"));
  assert.ok(!rx.test("verstappens")); // plural deliberately not matched
});

t("P1 does not false-positive on P100 or MP1", () => {
  const rx = matching.compileKeyword("P1");
  assert.ok(rx.test("P1 for Max"));
  assert.ok(rx.test("(P1)"));
  assert.ok(!rx.test("P100 laps"));
  assert.ok(!rx.test("the MP1 chassis"));
});

t("multi-word keyword matches as phrase across whitespace", () => {
  const rx = matching.compileKeyword("grand prix");
  assert.ok(rx.test("Monaco Grand Prix highlights"));
  assert.ok(rx.test("grand  prix")); // double space
  assert.ok(!rx.test("grand slam at the prix")); // words must be adjacent
});

// --- classify ---------------------------------------------------------------

const f1 = matching.compileTopic({
  id: "f1",
  name: "Formula 1",
  subredditPatterns: ["formula1", "formuladank", "*f1*", "formula*"],
  keywords: ["verstappen", "pole position", "P1"],
});

t("subreddit layer blocks regardless of title", () => {
  const hit = matching.classify([f1], {
    subreddit: "formuladank",
    title: "completely innocuous meme",
    flair: "",
  });
  assert.equal(hit && hit.name, "Formula 1");
});

t("keyword layer catches leakage into general subs", () => {
  const hit = matching.classify([f1], {
    subreddit: "sports",
    title: "Verstappen takes pole in Monaco",
    flair: "",
  });
  assert.equal(hit && hit.name, "Formula 1");
});

t("flair text is matched too", () => {
  const hit = matching.classify([f1], {
    subreddit: "sports",
    title: "Sunday thread",
    flair: "pole position",
  });
  assert.equal(hit && hit.name, "Formula 1");
});

t("unrelated post passes through", () => {
  const hit = matching.classify([f1], {
    subreddit: "cooking",
    title: "My first sourdough",
    flair: "",
  });
  assert.equal(hit, null);
});

t("empty topic lists never match", () => {
  const empty = matching.compileTopic({
    id: "tv",
    name: "TV Shows",
    subredditPatterns: [],
    keywords: [],
  });
  assert.equal(
    matching.classify([empty], { subreddit: "formula1", title: "spoiler!", flair: "" }),
    null
  );
});

t("first matching topic wins", () => {
  const broad = matching.compileTopic({
    id: "broad",
    name: "Broad",
    subredditPatterns: ["*"],
    keywords: [],
  });
  const hit = matching.classify([f1, broad], {
    subreddit: "formula1",
    title: "",
    flair: "",
  });
  assert.equal(hit.name, "Formula 1");
});

t("blank/whitespace patterns and keywords are ignored", () => {
  const topic = matching.compileTopic({
    id: "x",
    name: "X",
    subredditPatterns: ["", "  "],
    keywords: ["", "  "],
  });
  assert.equal(topic.subredditRegexes.length, 0);
  assert.equal(topic.keywordRegexes.length, 0);
});

// --- report -----------------------------------------------------------------

if (failures.length === 0) {
  console.log(`ok — ${passed} tests passed`);
} else {
  for (const { name, err } of failures) {
    console.error(`FAIL: ${name}\n  ${err.message}`);
  }
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
