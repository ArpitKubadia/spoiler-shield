# Contributing topic packs

The whole point of Spoiler Shield's pack system is community knowledge: you
know which subreddits and words spoil *your* thing; sharing that helps the
next person. Packs are plain JSON files in `packs/`, served straight from
this repo — no backend, no build.

## Two ways to contribute

1. **From the extension** — options page → your topic → **Share**. This
   downloads the topic as a pack file and (if the registry repo is
   configured) opens a prefilled GitHub "new file" page; GitHub walks you
   through the fork + pull request automatically.
2. **Manually** — add `packs/<your-topic>.json` and an entry in
   `packs/index.json`, then open a PR. To *improve an existing pack*, just
   edit its file: additions are always safe because the extension merges and
   dedupes on import — users never lose their own entries.

## Pack format

```json
{
  "version": 1,
  "topics": [
    {
      "name": "Formula 1",
      "enabled": false,
      "subredditPatterns": ["formula1", "*f1*"],
      "keywords": ["verstappen", "grand prix"]
    }
  ]
}
```

`index.json` entry: `{ "id": "formula1", "name": "Formula 1", "description": "…", "file": "formula1.json" }`.
The topic `name` is the merge identity — keep it stable across pack updates,
or users will get a duplicate topic instead of an update.

## How matching works (so your entries actually hit)

- **subredditPatterns** match the whole subreddit name, case-insensitively;
  `*` is a wildcard (`*f1*` catches MercedesAMGF1, wtf1, F1Technical).
- **keywords** match post titles + flair as whole words, case-insensitively;
  multi-word keywords match as phrases. `P1` will NOT match "P100".

## Guidelines for good packs

- People/character names are the best keywords: high signal, near-zero false
  positives. Generic words ("race", "finale", "results") over-blur — avoid.
- Err broad on subreddit patterns; a wrong blur costs one click to reveal.
- `"enabled": false` always — never ship a pack that switches itself on.
- Keep packs topic-scoped (a sport, a show, a game). Packs targeting people
  or communities for harassment will be rejected.
- Test before PRing: options page → Import → your file.
