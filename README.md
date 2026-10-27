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


## Character animations: the original Lix CC0 sprite sheet

The playable **Little Bridge** practice level now renders the original Lix creature animations rather than the temporary hand-drawn block figure. The image is `data/images/lixsprites.png` from the pinned [LixD source](https://github.com/SimonN/LixD), distributed under CC0.

- **Actual atlas:** 913 × 946 pixels, a Cutbit grid with 26 columns, 27 activity rows, and 34 × 34-pixel character frames.
- **Working gameplay states:** walking, falling/spawning, builder.
- **Other animated previews:** blocker, digger, basher, miner, climber, floater, jumper, exiting and more. These are **art previews, not implemented gameplay skills**.
- **Animation gallery:** open `/sprites.html` to see original frames cycling, slow down/speed up playback, or pause and inspect them.
- **Failure-safe:** the original hand-drawn placeholder renders if the sprite sheet is unavailable.
- **Local / static deployment:** `npm run lix:vendor:first` downloads the original character PNG along with the existing terrain images. GitHub Actions bundles it for deployment; local dev has a pinned upstream fallback.

No character animation changes the existing physics, builder assignment logic or streak scores.

```bash
git switch feat/lix-character-animations
git pull --ff-only origin feat/lix-character-animations
npm install
npm run lix:vendor:first
npm run dev
```

Open `http://localhost:5173/sprites.html` (or the local Vite port). Click back to Little Bridge and test the walking/falling/building transitions in `/play-lix.html`. This is the next **visual** milestone before extending the gameplay with blocker/basher/digger actions.


## v0.6: Sprite transparency, full-width water and more levels

- **Original Lix characters:** black background is now flood-filled away *inside each 34×34 frame*; connected exterior black pixels become transparent, while isolated black details remain. The original Lix character gallery uses this loader too. `npm run lix:inspect:characters` confirms that the real PNG contains background pixels eligible for removal.
- **Water:** Little Bridge and Double Trouble repeat the genuine animated water tiles across the complete playfield, behind land and in a shallow bottom-edge waterline, instead of showing one odd blue rectangle.
- **Verified progression:** Little Bridge (one gap, one builder) now leads to **Double Trouble**, an original two-gap, two-builder practice level. The latter passed **64 different two-builder starting combinations** in automated simulation with original CC0 graphics and fails without builder assignments. The former retains its existing proof.
- **Imported original Lix community puzzles:** **Pitfall** (Insane Steve) and **Building Block Maze** (Insane Steve) can be selected alongside 6 Gaps, 5 Builders (mobius). These retain their original level files and their source links. Asset loading, sprite decoding, actual terrain collision and creature spawning are CI-tested. **They are not verified solvable**: our adapter still only supports the Builder skill; original skills like climbing, bashing, mining, digging, platforming, blockers and their interactions are still missing. They are presented explicitly as experimental gameplay previews, not part of the shared daily rotation.
- **Practice isolation:** each level has its own local practice record; none affects the shared daily result/streak.

Run locally:

```bash
git fetch origin
git switch feat/lix-sprite-water-levels
git pull --ff-only
npm install
npm run lix:vendor:first
npm test
npm run test:real-lix
npm run test:double-trouble
npm run test:community-lix
npm run dev
```

Open `/play-lix.html` and use **Choose a level**, or follow the next-level action after rescuing Little Bridge. For actual community source artwork previews, `/lab.html` remains available.


## v0.7: More skills and an animated escape!

Original Lix character animation rows are now wired to new working browser skills: **Blocker**, **Basher** and **Digger**, alongside **Builder**. Choose a skill from the toolbar and tap a grounded Lix. Blockers hold position and turn other walkers away. Bashers carve a horizontal tunnel through non-steel terrain; Diggers carve a vertical shaft and fall when they break through. Each skill has an independent finite inventory, and Undo restores both skill supplies and modified terrain. These mechanics are genuine pixel collision interactions but **not yet a frame-perfect port** of original Lix.

When a Lix enters its exit, it now spends **18 physics updates** in an `exiting` state. The original CC0 **Exiter** sprite animation plays with a small jumping arc and gentle sparkling effect, then the creature is counted as saved and the victory popup appears. Both existing verified levels remain simulation tested.

### Third verified practice level: Tunnel Time

`/play-lix.html?level=tunnel-time` introduces the Basher with a sandstone obstacle and a clear "BASH HERE" marker. The real-asset test `npm run test:tunnel-time` found **eight one-Basher winning positions** (x=284..298 in 2-pixel increments), rescuing one Lix in about 26–27 simulated seconds. A no-skill run cannot win. The victory flow offers **Little Bridge → Double Trouble → Tunnel Time → Dig for Freedom**.

The two imported community level experiments still are **not certified solvable**. Although Builder, Blocker, Basher and Digger are now present, other original Lix mechanics and precise interaction semantics remain unsupported. Scores stay independent of the shared daily challenge.

```bash
git fetch origin
git switch feat/lix-skills-and-exit
git pull --ff-only
npm install
npm run lix:vendor:first
npm test
npm run test:real-lix
npm run test:double-trouble
npm run test:tunnel-time
npm run dev
```

Try `/play-lix.html` and watch the character jump into the exit *before* results appear.

### Fourth verified practice level: Dig for Freedom

`/play-lix.html?level=dig-for-freedom` has a full-length upper sandstone platform and a lower exit corridor. A Lix must use the **Digger** skill to tunnel downward, fall safely to the lower passage, and walk to its exit. The test `npm run test:dig-for-freedom` solved this stage with **20 different one-Digger starting positions**, each around 26 simulated seconds; no-skill play cannot win. This completes our first four verified practice puzzles: Little Bridge → Double Trouble → Tunnel Time → Dig for Freedom. They use CC0 Lix tiles with original Daily Lemming-authored layouts.

## v0.8: precise Lix hover targeting, Miner and the first two-skill puzzle

- **Hover targeting:** desktop mouse / pen changes from a crosshair to an animated-frame-following **four-corner `[ ]` reticle** when pointing at a creature eligible for the selected skill. Click and touch now use the same nearest-eligible-Lix hit test; non-selectable creatures (falling, escaping, lost or busy with other skills) are not highlighted. Character selection is checked again as they walk or the chosen skill changes.
- **Miner:** the fifth playable skill carves a **descending diagonal tunnel** through genuine pixel terrain. The official CC0 Lix Miner animation is used. Steel stops the operation; a breakthrough becomes a fall. Its stock is finite and Undo restores the original terrain and inventory. The animation and skill physics are adapter approximations, **not replay-exact original Lix**.
- **Secret Passage:** the fifth authored and solver-verified practice puzzle now requires **both Miner and Basher**. Mine down from the upper platform, land in the lower corridor, then bash through a solid underground wall. The second skill is automatically selected after mining breaks through, with clear `MINE HERE` and `BASH HERE` hints. A real-PNG solver checked 54 successful two-skill timing pairs, with the first completing in approximately 32 seconds. Without skills or with Miner alone, it cannot be finished.
- Progression now reads **Little Bridge → Double Trouble → Tunnel Time → Dig for Freedom → Secret Passage**, before the still-unverified original CC0 community level experiments. Practice records remain per level; shared daily streaks are unchanged.

```bash
git fetch origin
git switch feat/lix-targeting-miner
git pull --ff-only
npm install
npm run lix:vendor:first
npm test
npm run test:secret-passage
npm run dev
```

Try `/play-lix.html?level=secret-passage` and move your pointer over a standing Lix to see the reticle.

## v0.9: Dirt particles and Blocker crowd levels

- The rendering layer now draws lightweight **2–3px sandstone dirt chips** whenever the engine emits a `dug` or `mined` event. Digger chips spray mostly upwards; Miner chips spray up/backwards. They arc down under gravity and fade within ~0.3–0.6 seconds. 160 particles maximum. They're visual-only, with no effect on physics or score; effects clear on Restart and Undo.
- **Turnaround:** 3 Lix, 1 Blocker, 2 required rescues. A first Lix becomes a permanent Blocker near the left edge, turning the next two back towards the exit. Actual-image simulation confirms **26 successful placements** and a no-skill failure. The game ends promptly once the quota is reached, without waiting for the volunteering Blocker to disappear.
- **Bridge Brigade:** a second 3-Lix puzzle. Block the first to redirect its friends, then build a staircase over the gap with the second. This teaches two skills and switches the selected skill from Blocker to Builder automatically. Real PNG simulation confirms **nine Builder starting positions** work and that neither skill alone solves the level.
- Both new stages use original Daily Lemming layouts and official CC0 Lix artwork. They follow Secret Passage in the verified practice progression: **Little Bridge → Double Trouble → Tunnel Time → Dig for Freedom → Secret Passage → Turnaround → Bridge Brigade.**
- Imported community levels are still explicitly experimental; the shared UTC daily puzzle and streak logic remain unchanged.

To test:

```bash
git fetch origin
git switch feat/lix-dirt-particles-blockers
git pull --ff-only
npm install
npm run lix:vendor:first
npm test
npm run test:turnaround
npm run test:bridge-brigade
npm run dev
```

Open `/play-lix.html?level=turnaround` or `/play-lix.html?level=bridge-brigade`. To see the dirt particles, replay Dig for Freedom or Secret Passage.


## Main site and original Lix basic tutorials (October 2026)

The main `/index.html` now opens the Lix-art puzzle engine directly. `/play-lix.html` redirects to the new homepage, preserving `?level=...` bookmarks. The older standalone daily challenge prototype is retained as `/daily.html`. Vite builds all three entry points.

The main level menu now leads with original **Lix Basic Tutorial** maps: Builders, Bashers, Diggers, Miners, and Blockers, from the pinned CC0 [SimonN/LixD tutorial collection](https://github.com/SimonN/LixD/tree/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic). These are authentic preserved map files, with attribution to Simon and Simon/Wuzzy as appropriate. The five maps have original artwork vendored and undergo CI loading, terrain/collision and spawn smoke tests. The browser engine now supports round-robin spawning from multiple entrances, which the native Diggers tutorial uses. **Full winning routes are not verified for these native tutorials**; do not treat them as completed or include them in a public daily rotation until replay-tested. The previously verified original Daily Lemming practice stages remain accessible as safe alternatives.

Basher excavation now emits a handful of short-lived soil chips. Miners still excavate at their established physics rhythm, but decorative debris is emitted only on every fourth carving stroke, synchronized to the pickaxe's selected impact phase, instead of gushing continuously. This is a visual adjustment only and does not alter winning routes.

```bash
git switch master
git pull --ff-only origin master
npm install
npm run lix:vendor:first
npm run test:official-tutorials
npm run dev
```

Open `http://localhost:5173/` (or the Vite port) to see the new main game. `/daily.html` contains the earlier prototype.

## Shared daily Lix challenges

The main page `/` now defaults to one deterministic **UTC daily challenge**, using the actual Lix-art gameplay engine rather than the earlier placeholder prototype. The default daily pool is intentionally limited to **seven existing real-PNG, route-verified Daily Lemming levels**. Their order is fixed; on consecutive UTC days the game cycles through Little Bridge, Tunnel Time, Dig for Freedom, Turnaround, Double Trouble, Bridge Brigade, then Secret Passage. After seven days this small starter pool repeats. As we verify more native Lix tutorials, the pool can be extended deliberately. None of the original CC0 Lix basic tutorial imports is misrepresented as verified or included in the shared challenge yet.

Click `Choose a puzzle → Today's Daily Challenge` to return to the shared daily mode. Explicit `?level=lix-bashers` or another named level instead opens ordinary practice, which never changes the daily streak. The original pre-Lix daily prototype remains at `/daily.html` with separate saved data.

Daily results are stored locally in `daily-lemming-lix-challenge-v1`, independent from the original prototype and ordinary practice. The first attempt is immutable for the day, later runs improve the best result, and consecutive UTC winning days create a streak. The game shows a shareable text summary. Existing tabs are paused and told to reload after the next 00:00 UTC reset. Daily level selection is source-controlled and tested in `tests/lix-daily-challenge.test.js`.

```bash
git switch master
git pull --ff-only origin master
npm install
npm run lix:vendor:first
npm test
npm run dev
```
