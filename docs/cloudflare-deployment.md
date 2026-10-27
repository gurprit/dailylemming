# Deploy Daily Lemming to Cloudflare Workers

Daily Lemming is a multi-page Vite app. Cloudflare Workers Static Assets
serves the generated `dist/` directory without a server script, D1 or R2.
`wrangler.jsonc` is the source of truth. The GitHub Pages workflow is kept
as a fallback; its `/dailylemming/` Vite base is separate from Workers' `/`.

## First deployment from the project directory

1. Run `git pull origin master` and `npm install` using Node.js 22+.
2. Run `npx wrangler login` once to authorize your Cloudflare account.
3. Run `npm run deploy`. This downloads pinned CC0 Lix art, runs Vite,
   and publishes the static assets on a Worker named `daily-lemming`.
4. Wrangler prints the actual URL on success, usually
   `https://daily-lemming.<your-workers-subdomain>.workers.dev/`.
   Don't guess the subdomain; use the URL in Wrangler's output.

To inspect locally before publishing: `npm run dev` for Vite, or
`npm run preview:worker` to run a local Cloudflare asset server.

## Continuous deployment (optional)

Use the GitHub Action **Deploy Cloudflare Worker** in
`.github/workflows/cloudflare.yml`. Configure these GitHub repository
**Actions secrets** (Settings > Secrets and variables > Actions):

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token restricted to the account,
  with Workers Scripts edit permission and any required asset permissions.
- `CLOUDFLARE_ACCOUNT_ID`: your Cloudflare account ID.

Do not commit the token or store it in a public `.env` file.
After the secrets are configured, pushes to `master` automatically build,
test and deploy. Before that, the workflow skips deployment rather than
failing unrelated CI. You can also run it manually via Actions.

Alternatively, connect the GitHub repository under Cloudflare Workers
**Git integration**, setting build command `npm run build` and deploy
command `npx wrangler deploy`. Don't enable both automated deploy methods
for the same Worker, or they can race each other.

## Mobile acceptance checklist

- Open the deployed URL over mobile data, not only home Wi-Fi.
- On Android and iPhone, use **Fit map** to see the layout, then
  **Zoom in** to tap individual Lix.
- Swipe the map in both axes: it should pan, never spend a skill.
- Pause; tap a Lix; assign Builder, Miner, Blocker and Exploder where
  available. Confirm the Exploder countdown stays attached while it moves.
- Check canvas/image loading, restart, pause, undo and daily reset.
- Rotate between portrait and landscape and repeat a skill assignment.

## Deployment notes

- No root SPA fallback: this site intentionally has multiple HTML entrypoints.
- Cloudflare may redirect `/play-lix.html` to `/play-lix`; query strings
  such as `?level=...` must survive that redirect.
- `npm run build` vendors the required Lix artwork before compiling so the
  deployed experience is not dependent on raw.githubusercontent.com.
- Scores and streaks still use browser localStorage, so they don't sync
  between devices. Shared UTC puzzle selection does not require a backend.
