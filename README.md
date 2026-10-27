# Daily Lemming 🟢

One shared, bite-sized creature-rescue puzzle every day. Save the little wanderers in about five minutes, then share how you did.

## Product principles

- **One level per UTC day:** the same puzzle for everyone, with no random difficulty advantage.
- **Play at your pace:** unlimited retries; first completed attempt is recorded separately from later practice runs.
- **Made for mobile:** large touch targets, pause-to-plan controls, landscape-friendly play, and desktop mouse support.
- **Original/licensed content only:** do not ship copyrighted Lemmings game data, branding, sprites, levels or music.
- **Low friction:** no login needed to play; local progress first, optional server-backed accounts and comparisons later.

## Source selection

- [Lix](https://github.com/SimonN/LixD): 700+ Lemmings-inspired levels, graphics and sound effects released under CC0 (some music and fonts have separate licensing). The D/Allegro gameplay engine does **not** run in a browser unchanged.
- [Lemmings.ts](https://github.com/tomsoftware/Lemmings.ts): MIT-licensed TypeScript implementation. Loads original commercial game binaries and lists touch support as unfinished, so only compatible engine code should be reused with permitted assets.
- [LemmingsJS](https://github.com/oklemenz/LemmingsJS): runnable browser and touch reference; verify code and all asset rights before copying anything.

See [docs/roadmap.md](docs/roadmap.md) for the staged implementation. The first scaffold is an original, temporary gameplay proof of concept, **not** a port of Lix levels yet. A proper engine/level importer is a separate milestone.

## Run the proof of concept

```bash
npm install
npm run dev
npm test
npm run build
```

The initial implementation uses Vite and plain JavaScript without any external game assets. It includes four **original prototype levels** that rotate deterministically each day. Levels have not been certified solvable or balanced. The current drawing/gameplay engine is deliberately small and **temporary**, so we can replace it with an appropriately licensed browser engine and a Lix importer without rewriting the daily challenge and results system.

Progress currently uses browser localStorage; it is not suitable for trusted worldwide leaderboards. The UTC challenge changes when you reload the page after midnight.

## Hosting

GitHub Actions tests and builds each change. The Pages workflow deploys `master`, if GitHub Pages is configured to use **GitHub Actions** as its source in repository Settings → Pages. Preview locally with `npm run dev`; no server/database credentials are required.

## Lix community-level integration (in progress)

30 unmodified CC0 source levels from Lix's Lovely pack, their official order, and a tested level parser are included at `content/lix/lovely/`. These are **candidates, not playable daily puzzles yet**: the original Lix mechanics and pixel terrain are not supported by the temporary engine. Their authors, metadata, skill requirements and image dependencies are preserved.

Run `npm run lix:audit` to inspect the 30 candidate levels. The audit outputs `generated/lix/catalogue.json` and `generated/lix/audit.md`. Run `npm run lix:assets` to optionally cache the upstream CC0 image library.

Open `/lab.html` on the local dev server for an **approximate terrain inspection page**. Artwork loads from the pinned upstream Lix repository, so an internet connection is currently required. It is an internal developer aid, **not a playable level**.

See [Lix integration notes](docs/lix-integration.md) for licence detail and what's left to build before these puzzles can enter the daily queue.

## One real Lix level: experimental playable adapter

The new **[6 Gaps, 5 Builders](./play-lix.html)** mode uses the upstream CC0 puzzle by mobius from the imported `Lovely` source files. This is an **isolated experiment**, available at `/play-lix.html` when running `npm run dev`.

This is the first browser adapter that:
- parses an authentic Lix level;
- downloads and decodes its referenced Lix images, removes pure magenta colour-key pixels;
- composes all ordered bitmap terrain layers into a real pixel collision map (including group expansion, dark masks, rotations and steel);
- simulates one walking creature, stair-building assignments, death/water, and exit rescue in a deterministic fixed-timestep loop;
- supports click/touch, pause-to-plan, speed and restart without touching daily records.

**Not verified:** it is not a port of the original Lix physics, skill duration and collision rules are approximations, trigger placements need comparison against original game metadata, and we have **not** proved a human can complete the original puzzle in this adapter. For reliable offline-compatible assets after installation, run `npm run lix:vendor:first` to download just the 11 required CC0 images; GitHub Pages builds run the same command and bundle these images. A pinned remote fallback remains for local dev when images are missing. Please report any mismatch between screenshots, impossible jumps or unresponsive skill assignments. **It is not yet in the daily puzzle rotation.**

To try locally:

```bash
git switch feat/first-lix-playable
npm install
npm run lix:vendor:first
npm test
npm run dev
```

Then open `http://localhost:5173/play-lix.html`. The daily home page and Level Lab also link to the experiment.

## Lix physics and controls: experimental v0.4

The `feat/lix-physics-polish` branch refines the existing CC0 "6 Gaps, 5 Builders" experiment rather than replacing it or changing the global daily challenge.

- Fixed-timestep **15 Lix physics updates/second**, matching the original game's normal play rate.
- Builder assignments create up to 12 short bricks; each rises 2 map pixels. This removes the implausibly huge staircases of the earlier alpha.
- Standing, wall turns, short descents and vertical falling use individual pixel collision checks; assign-builder while airborne is rejected.
- Pause to plan, tap to build on desktop or phone, advance by one frame (`.` on keyboard), speed up, restart.
- While paused, an approximate translucent projection shows where a new builder's staircase would go.
- A separate browser-local practice personal best ranks successful runs by fewest builders then shortest completion time. This **does not affect UTC daily streaks**.

### Deterministic real-asset check

After `npm run lix:vendor:first`, execute `npm run test:real-lix`. It reads the actual pinned Lix PNGs (including multi-frame gadget sheets), constructs the pixel collision map and checks that the walker spawns, lands on the real terrain, and eventually fails if no builder skill is assigned. A simulation trace is written to `generated/lix/first-level-simulation.json`.

`npm test` still covers the unit-level physics, pause stepping, builder restrictions and practice records. The GitHub Actions workflow runs both suites and the Vite production build.

**Still an experiment:** faithfully replaying and solving the original Lix puzzle with exactly the same outcomes has **not** been established. Lix's native state machine, all terrain additions, and some gadget trigger semantics remain approximated. The original human-played 3-builder win happened in the earlier permissive engine and should not be treated as a proof for the recalibrated builder physics. The imported candidates are still excluded from the shared daily rotation until fully verified.

Lix's queued-builder action is also supported: select a unit that is already building to spend another builder and continue its staircase without interruption. The heuristic route-search artifact is diagnostic only; it does not certify solvability or original-engine parity.


## A friendly first playable puzzle (default)

`/play-lix.html` now opens **Little Bridge**, an original Daily Lemming introductory map with genuine CC0 Lix artwork and the same pixel-based browser engine. It offers one tiny 20px gap, no ceiling hazards, three available builders, and a clearly visible `BUILD HERE` marker. Assign **one** builder near the marker and watch the walker reach the exit. The difficulty is deliberately forgiving.

The actual asset-based test searches 26 possible starting positions; **17 positions from x=220 to x=252 (every 2 pixels) result in a one-builder rescue**. It also asserts that the level cannot be completed without a builder. The test runs in CI via `npm run test:real-lix`.

The original community challenge **6 Gaps, 5 Builders** by mobius remains available at `/play-lix.html?level=6gaps`. It is still experimental and has not been certified solvable under our updated physics. Separate local practice scores are stored per level, with the hard level's old record key preserved.

The new introductory layout was authored for this app, not imported from the Lix Lovely pack. Underlying terrain, hatch, goal and water images originate from the upstream Lix CC0 collection. This is still a separate practice mode and does **not** replace the main shared daily game.
