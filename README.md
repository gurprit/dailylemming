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
