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
8. Add an environment variable only if you want to override the built-in default:
   - Key: `VITE_KIE_PROXY_URL`
   - Value: `https://kie-proxy.jacobsmedia12.workers.dev`
9. Start the deployment.
10. After deploy, open the generated `*.pages.dev` URL and test image and video requests.

## Important Worker requirement

Your Worker must allow browser requests from the Pages site. If requests fail in the browser but work elsewhere, add CORS headers to the Worker response, especially:

- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`

If you want, the next step can be wiring this repo to GitHub and then checking the Cloudflare Pages deploy settings together.
