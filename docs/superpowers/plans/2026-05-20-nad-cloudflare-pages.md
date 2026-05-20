# NAD Cloudflare Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the provided NAD production pipeline component into a deployable React app that can be pushed to GitHub and hosted on Cloudflare Pages while continuing to call the existing Cloudflare Worker API.

**Architecture:** Build a small Vite-powered React single-page app with the pipeline UI as the main surface. Keep the worker base URL in a tiny config helper so the production default works out of the box and can still be overridden with a `VITE_KIE_PROXY_URL` environment variable later.

**Tech Stack:** React 18, Vite 5, Vitest, Testing Library, Cloudflare Pages

---

### Task 1: Project Scaffolding And Config

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.jsx`
- Create: `src/styles.css`
- Create: `src/config.test.js`
- Create: `src/config.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it, vi } from "vitest";

describe("getProxyUrl", () => {
  it("trims a trailing slash from the configured worker URL", async () => {
    vi.stubEnv("VITE_KIE_PROXY_URL", "https://kie-proxy.jacobsmedia12.workers.dev/");
    const { getProxyUrl } = await import("./config.js");
    expect(getProxyUrl()).toBe("https://kie-proxy.jacobsmedia12.workers.dev");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/config.test.js`
Expected: FAIL because `src/config.js` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```js
const DEFAULT_PROXY_URL = "https://kie-proxy.jacobsmedia12.workers.dev";

export function getProxyUrl() {
  const configured = import.meta.env.VITE_KIE_PROXY_URL || DEFAULT_PROXY_URL;
  return configured.replace(/\/$/, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/config.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js index.html .gitignore src/main.jsx src/styles.css src/config.test.js src/config.js
git commit -m "feat: scaffold vite app for nad pipeline"
```

### Task 2: Pipeline UI

**Files:**
- Create: `src/App.test.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  it("renders the pipeline title and base avatar action", () => {
    render(<App />);
    expect(screen.getByText("NAD+ Ad Pipeline")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate Base Avatar/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL because the component does not exist yet

- [ ] **Step 3: Write minimal implementation**

```jsx
export default function App() {
  return (
    <main>
      <h1>NAD+ Ad Pipeline</h1>
      <button type="button">1. Generate Base Avatar (S1)</button>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 5: Expand the component to the full pipeline UI**

Replace the minimal component with the production pipeline UI, keeping the request behavior aligned to the Worker API and using the config helper for the proxy base URL.

- [ ] **Step 6: Re-run the targeted test**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/App.test.jsx src/App.jsx
git commit -m "feat: add nad pipeline interface"
```

### Task 3: Deployment Handoff

**Files:**
- Create: `README.md`
- Create: `.env.example`

- [ ] **Step 1: Write the deployment guide**

Document:
- local setup
- GitHub push flow
- Cloudflare Pages import flow
- build command `npm run build`
- output directory `dist`
- optional `VITE_KIE_PROXY_URL`
- Worker CORS reminder

- [ ] **Step 2: Verify the production build**

Run: `npm run build`
Expected: Vite build completes successfully and outputs `dist/`

- [ ] **Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add github and cloudflare deployment steps"
```
