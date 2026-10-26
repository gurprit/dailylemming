# Lix content and engine integration: v0.2 work

**Status: source import and compatibility audit implemented; browser-level gameplay compatibility not implemented.**

## What's actually here

The [Lix](https://github.com/SimonN/LixD) `lemforum/Lovely` pack's first 30 `.txt` level files have been committed to `content/lix/lovely/`, along with the official order. This is an **import candidate pool**, not 30 certified five-minute challenges.

- Source revision (pinned): `f1e805048fe439a4a0e9cc650c613713ababac8b`
- Original levels / graphics / sprites license: **CC0-1.0** (see [Lix copying](https://github.com/SimonN/LixD/blob/master/doc/copying.txt)).
- Retain each original author and level title when presenting their puzzle.
- Fonts and some music have different licenses, and have **not** been imported.
- Existing Daily Lemming `src/game.js` remains a **temporary prototype**, not a Lix engine.

## Reproduce the audit

```bash
npm install
npm test
npm run lix:audit
```

The audit creates `generated/lix/catalogue.json` and `generated/lix/audit.md`. GitHub Actions uploads both as the `lix-level-audit` artifact, with title, author, Lix skills, source link and all image paths.

The 30 sources reference **371 unique image files**. The images aren't in this app yet. To cache CC0 Lix images into `public/lix/images/` for engine work, run:

```bash
npm run lix:assets
```

The asset download is opt-in because it makes hundreds of network requests. The resulting cache is ignored by Git; do not assume asset downloads succeeded unless the command exits successfully. These assets need checking for image frame metadata and trigger behavior before they can be used for accurate physics.

## Why not point the JavaScript engine at these levels immediately?

Lix is a native D/Allegro game. The MIT [Lemmings.ts](https://github.com/tomsoftware/Lemmings.ts) browser engine parses original Lemmings binaries and lists touch support as unfinished. Another HTML5 implementation uses similar source formats. None of those engines directly understands Lix's 2026 level format, custom skills, tile groups, transformed/dark terrain, hatch positions, triggers or pixel-accurate collision.

The 30 files are a *legally reusable source of puzzles*, **not** proof they work in Daily Lemming. The existing rectangle engine cannot represent them faithfully. The audit deliberately sets `compatibility.playable=false` for all imported levels and does not mix them into the daily rotation.

## Next engine milestones

1. Define a browser engine adapter contract that takes a normalized level and exposes fixed-timestep `tick`, `assignSkill`, `reset`, `render`, and `result`. Keep scoring/date/UI logic outside the engine.
2. Load local CC0 PNG terrain pieces with real alpha masks. Apply rotations, flips, dark/erase, group nesting and steel pixels in exact original coordinates. Decode Lix hatch, goal and trap metadata and validate the collision map against Lix screenshots.
3. Implement all skills *required by the chosen puzzle*, one category at a time. Builders/bashers alone aren't enough for the Lovely pack.
4. Reproduce known Lix completion replays in automated deterministic simulation, or obtain verified solutions and manually compare against Lix. Verify 30 puzzles really take around 3–5 minutes for a new mobile player.
5. Only put levels in the immutable daily calendar after they pass functional, solvability and touch QA. Use the **same UTC calendar for everyone**.
6. Bundle/cache all referenced CC0 assets locally for reliable mobile load. Preserve authorship in the level UI.

## Honest launch gates

No Level should be marked `playable` or assigned a public daily date until assets load entirely, skill semantics work, exit saving is correct, and a real human can complete the level on a phone. The initial 30 candidates may need to be replaced with more suitable short puzzles after testing.
