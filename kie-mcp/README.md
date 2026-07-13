# kie-mcp

Remote MCP server (Cloudflare Worker, Streamable HTTP transport, built with
Cloudflare's `agents` SDK / `McpAgent`) that exposes the kie.ai still-image and
video pipeline as tools for an LLM client such as Claude.ai's custom connector.

This is a standalone Worker — it does not touch the existing producer app or
its proxy Worker.

## Tools

- `generate_still` — submit a Nano Banana text-to-image or edit job, returns `job_id`.
- `generate_video` — submit a Seedance or Veo 3.1 image-to-video job, returns `job_id`.
- `job_status` — poll a job by `job_id`, returns state and result URL(s) when complete.
- `list_recent_jobs` — last 20 submitted jobs (id, type, model, state, created time) from a KV-backed job log.

## One-time setup

```bash
cd kie-mcp
npm install

# Create the KV namespace used for the job log, then put its id into wrangler.jsonc
npx wrangler kv namespace create JOBS_KV
# copy the returned id into wrangler.jsonc -> kv_namespaces[0].id

# Set secrets (never stored in code)
npx wrangler secret put KIE_API_KEY
npx wrangler secret put MCP_AUTH_TOKEN
```

## Local testing

```bash
cp .dev.vars.example .dev.vars   # fill in a real/test KIE_API_KEY and a token
npx wrangler dev
```

Test with the MCP inspector CLI:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:8787/mcp \
  --transport http --header "X-MCP-Token: <your token>" --method tools/list
```

## Deploy

```bash
npx wrangler deploy
```

## Connecting from Claude.ai

Add a custom connector pointing at `https://<your-worker>.workers.dev/mcp`
with an HTTP header `X-MCP-Token: <MCP_AUTH_TOKEN value>`. Every request
without a matching header is rejected with `401`.
