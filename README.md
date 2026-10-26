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
