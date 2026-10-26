# Daily Lemming implementation plan

## v0.1: playable proof of concept (this branch)

- Original, minimal side-scrolling physics prototype with falling/walking/rescuing creatures, terrain and basic skills.
- One puzzle per UTC day, deterministic rotation, plus small hand-made sandbox levels.
- Large tap-friendly controls; pause, restart, speed toggle, mouse and touch.
- On-device attempt tracking, streak and spoiler-free share text. No login, tracking or external assets.
- GitHub Pages-ready Vite build.
- **Not production-ready**: no claim that the handcrafted puzzles are all solvable/balanced and no imported Lix levels.

## v0.2: real engine, real levels

- Prototype an adapter around a browser-capable engine, without original commercial data files.
- Inspect and retain required notices for reused engine code; prefer MIT or similar licensed implementation.
- Parse Lix level metadata, placements and terrain and implement/render every skill needed by chosen levels.
- Create a tiny Lix compatibility set first, then automate replay/solvability tests.
- Import 30 CC0 levels and record source credit; exclude separately licensed music/fonts.
- QA actual touch selection, panning, pinch zoom, gesture cancellation on mobile Safari/Chrome.

## v0.3: daily-game polish

- Exactly one curated 3–5 minute level/day, with difficulty escalation across the week.
- First completed run frozen; replay is practice. Move integrity-sensitive scores from localStorage to backend.
- Anonymous identity, streak sync, share cards, optional leaderboard.
- Daily fallback and timezone rules documented, no duplicate/reused puzzles until pool cycles.

## v1

- 90+ verified levels in a managed queue, editor/import tooling, PWA, accessibility, audio and analytics.
- Branding/legal review: distinguish from Sony's Lemmings; use original or confirmed CC0 art.
- Daily automated smoke tests across mobile widths and fresh dates.

## Licensing notes

Lix repository: https://github.com/SimonN/LixD

Lix readme explicitly dedicates its code, levels, sprites, sound effects, graphic sets and some music to CC0, but **not all music or fonts**. Preserve credit in-app even when attribution is not required. An MIT licence for the *engine* never grants rights to the original commercial *game content*.
