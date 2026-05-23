# NAD Pipeline Cloudflare Pages App

This repo wraps the NAD image/video production pipeline into a deployable Vite + React app that can be hosted on Cloudflare Pages while calling your existing Cloudflare Worker API.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Optionally override the default Worker URL:

```bash
cp .env.example .env.local
```

3. Start the dev server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

Cloudflare Pages should use:

- Build command: `npm run build`
- Output directory: `dist`

## GitHub steps

1. Create a new GitHub repository.
2. Initialize git in this folder if needed:

```bash
git init
git add .
git commit -m "Initial NAD pipeline app"
```

3. Connect the local repo to GitHub:

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

## Cloudflare Pages steps

1. In Cloudflare, open `Workers & Pages`.
2. Choose `Create application`.
3. Choose `Pages`.
4. Choose `Connect to Git`.
5. Authorize GitHub if Cloudflare asks.
6. Select this repository.
7. Use these build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
8. Add environment variables in Pages:
   - `VITE_KIE_PROXY_URL` (required): your Worker API base URL.
   - `VITE_ASSET_PUBLIC_BASE_URL` (optional): public R2 CDN/base URL like `https://media.example.com`.
   - `VITE_ASSET_SIGNER_PATH` (optional): Worker path that returns a signed URL from an R2 key, for example `/api/v1/assets/signed-url`.
9. Start the deployment.
10. After deploy, open the generated `*.pages.dev` URL and test image and video requests.

## Important Worker requirement

Your Worker must allow browser requests from the Pages site. If requests fail in the browser but work elsewhere, add CORS headers to the Worker response, especially:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

If you want, the next step can be wiring this repo to GitHub and then checking the Cloudflare Pages deploy settings together.

## R2 + D1 asset hosting flow

If generated image/video links are expiring or failing to stream in browser, move final assets to Cloudflare R2 and persist references in D1 via your Worker API:

1. Worker stores each completed asset in R2 (object key like `runs/<runId>/scene-<id>.mp4`).
2. Worker writes D1 metadata row per asset (`run_id`, `scene_id`, `asset_type`, `r2_key`, timestamps).
3. Worker API returns either:
   - a direct public URL, or
   - an R2 key payload (`key`, `objectKey`, `r2Key`, etc.) that the app can resolve.
4. Frontend resolves key payloads using:
   - `VITE_ASSET_SIGNER_PATH` for signed/private delivery, or
   - `VITE_ASSET_PUBLIC_BASE_URL` for public bucket/CDN delivery.

This app now supports all of the above response formats automatically when rendering scene media.
