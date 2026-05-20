# JSON Upload And Asset Folders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `scenes.json` upload plus an in-app run library that groups generated assets into folder-like runs and supports JSON manifest export.

**Architecture:** Extract JSON parsing/validation and run/export helpers into small modules, then wire them into the existing single-page app with minimal disruption to the current generation flow. Keep the default hardcoded scenes and base prompt as the initial dataset, while allowing runtime replacement and preserving past runs in an in-memory library.

**Tech Stack:** React 18, Vite 6, Vitest, Testing Library, browser `FileReader`, browser `Blob`/object URL APIs

---

## File Structure

- Create: `src/pipeline-import.js`
  - Validates uploaded JSON payloads and returns normalized pipeline data
- Create: `src/pipeline-import.test.js`
  - Covers valid payloads and import validation failures
- Create: `src/runs.js`
  - Creates new run records, updates run assets, and builds downloadable export manifests
- Create: `src/runs.test.js`
  - Covers run creation, run asset updates, and export manifest shaping
- Modify: `src/App.jsx`
  - Moves default scenes/base prompt into runtime state, adds upload UI, reset behavior, run library UI, and export action
- Modify: `src/App.test.jsx`
  - Adds UI coverage for JSON upload success/failure and run/folder rendering

### Task 1: JSON Import Helper

**Files:**
- Create: `src/pipeline-import.test.js`
- Create: `src/pipeline-import.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { parsePipelineJson } from "./pipeline-import.js";

describe("parsePipelineJson", () => {
  it("returns normalized pipeline data for a valid upload", () => {
    const json = JSON.stringify({
      basePrompt: "Prompt",
      scenes: [
        {
          id: 1,
          label: "Hook",
          setting: "Living room",
          dialogue: "Hello",
          emotion: "Confident",
          vidPrompt: "She speaks directly to camera."
        }
      ]
    });

    expect(parsePipelineJson(json)).toEqual({
      basePrompt: "Prompt",
      scenes: [
        {
          id: 1,
          label: "Hook",
          setting: "Living room",
          dialogue: "Hello",
          emotion: "Confident",
          vidPrompt: "She speaks directly to camera."
        }
      ]
    });
  });

  it("throws a helpful error for invalid JSON syntax", () => {
    expect(() => parsePipelineJson("{")).toThrow("Invalid JSON syntax");
  });

  it("throws when basePrompt is missing", () => {
    expect(() => parsePipelineJson(JSON.stringify({ scenes: [] }))).toThrow(
      'basePrompt must be a string'
    );
  });

  it("throws when scenes is not an array", () => {
    expect(() =>
      parsePipelineJson(JSON.stringify({ basePrompt: "Prompt", scenes: {} }))
    ).toThrow("scenes must be an array");
  });

  it("throws when a required scene field is missing", () => {
    expect(() =>
      parsePipelineJson(
        JSON.stringify({
          basePrompt: "Prompt",
          scenes: [{ id: 1, label: "Hook", setting: "Room", dialogue: "Hi", emotion: "Warm" }]
        })
      )
    ).toThrow('Scene 1 is missing "vidPrompt"');
  });

  it("throws when a scene field has the wrong type", () => {
    expect(() =>
      parsePipelineJson(
        JSON.stringify({
          basePrompt: "Prompt",
          scenes: [
            {
              id: "1",
              label: "Hook",
              setting: "Room",
              dialogue: "Hi",
              emotion: "Warm",
              vidPrompt: "Prompt"
            }
          ]
        })
      )
    ).toThrow('Scene 1 field "id" must be a number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pipeline-import.test.js`
Expected: FAIL with `Failed to resolve import "./pipeline-import.js"`

- [ ] **Step 3: Write minimal implementation**

```js
const REQUIRED_SCENE_FIELDS = {
  id: "number",
  label: "string",
  setting: "string",
  dialogue: "string",
  emotion: "string",
  vidPrompt: "string"
};

export function parsePipelineJson(sourceText) {
  let parsed;

  try {
    parsed = JSON.parse(sourceText);
  } catch {
    throw new Error("Invalid JSON syntax");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON root must be an object");
  }

  if (typeof parsed.basePrompt !== "string") {
    throw new Error("basePrompt must be a string");
  }

  if (!Array.isArray(parsed.scenes)) {
    throw new Error("scenes must be an array");
  }

  const scenes = parsed.scenes.map((scene, index) => {
    const sceneNumber = index + 1;

    if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
      throw new Error(`Scene ${sceneNumber} must be an object`);
    }

    for (const [field, expectedType] of Object.entries(REQUIRED_SCENE_FIELDS)) {
      if (!(field in scene)) {
        throw new Error(`Scene ${sceneNumber} is missing "${field}"`);
      }

      if (typeof scene[field] !== expectedType) {
        throw new Error(`Scene ${sceneNumber} field "${field}" must be a ${expectedType}`);
      }
    }

    return {
      id: scene.id,
      label: scene.label,
      setting: scene.setting,
      dialogue: scene.dialogue,
      emotion: scene.emotion,
      vidPrompt: scene.vidPrompt
    };
  });

  return {
    basePrompt: parsed.basePrompt,
    scenes
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pipeline-import.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pipeline-import.js src/pipeline-import.test.js
git commit -m "feat: add pipeline json import validation"
```

### Task 2: Run Library Helper

**Files:**
- Create: `src/runs.test.js`
- Create: `src/runs.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, expect, it } from "vitest";
import { attachRunAsset, createRunRecord, createRunExportPayload } from "./runs.js";

describe("run helpers", () => {
  it("creates a new run from the current pipeline data", () => {
    const now = "2026-05-20T14:00:00.000Z";
    const run = createRunRecord({
      basePrompt: "Prompt",
      scenes: [{ id: 1, label: "Hook" }],
      now,
      runId: "run_1"
    });

    expect(run).toMatchObject({
      id: "run_1",
      name: "Run 2026-05-20 14:00",
      createdAt: now,
      basePrompt: "Prompt",
      scenes: [{ id: 1, label: "Hook" }],
      assets: {}
    });
  });

  it("adds image and video asset data to the correct scene entry", () => {
    const nextRun = attachRunAsset(
      {
        id: "run_1",
        assets: {}
      },
      2,
      {
        image: { url: "https://cdn.example.com/scene-2.png", status: "approved" },
        video: { url: "https://cdn.example.com/scene-2.mp4", status: "success" }
      }
    );

    expect(nextRun.assets[2]).toEqual({
      image: { url: "https://cdn.example.com/scene-2.png", status: "approved" },
      video: { url: "https://cdn.example.com/scene-2.mp4", status: "success" }
    });
  });

  it("builds a downloadable export payload for a run", () => {
    expect(
      createRunExportPayload({
        id: "run_1",
        name: "Run 2026-05-20 14:00",
        createdAt: "2026-05-20T14:00:00.000Z",
        basePrompt: "Prompt",
        scenes: [{ id: 1, label: "Hook" }],
        assets: { 1: { image: { url: "https://cdn.example.com/scene-1.png", status: "success" } } }
      })
    ).toEqual({
      id: "run_1",
      name: "Run 2026-05-20 14:00",
      createdAt: "2026-05-20T14:00:00.000Z",
      basePrompt: "Prompt",
      scenes: [{ id: 1, label: "Hook" }],
      assets: { 1: { image: { url: "https://cdn.example.com/scene-1.png", status: "success" } } }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/runs.test.js`
Expected: FAIL with `Failed to resolve import "./runs.js"`

- [ ] **Step 3: Write minimal implementation**

```js
function formatRunName(isoString) {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `Run ${year}-${month}-${day} ${hours}:${minutes}`;
}

export function createRunRecord({ basePrompt, scenes, now, runId }) {
  return {
    id: runId,
    name: formatRunName(now),
    createdAt: now,
    basePrompt,
    scenes,
    assets: {}
  };
}

export function attachRunAsset(run, sceneId, assetPatch) {
  return {
    ...run,
    assets: {
      ...run.assets,
      [sceneId]: {
        ...(run.assets?.[sceneId] || {}),
        ...assetPatch
      }
    }
  };
}

export function createRunExportPayload(run) {
  return {
    id: run.id,
    name: run.name,
    createdAt: run.createdAt,
    basePrompt: run.basePrompt,
    scenes: run.scenes,
    assets: run.assets
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/runs.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/runs.js src/runs.test.js
git commit -m "feat: add run library helpers"
```

### Task 3: Upload UI And Live Pipeline Reset

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`
- Use: `src/pipeline-import.js`

- [ ] **Step 1: Write the failing test**

```jsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

describe("App uploads", () => {
  it("loads a valid scenes json file and replaces the visible pipeline", async () => {
    render(<App />);

    const file = new File(
      [
        JSON.stringify({
          basePrompt: "Uploaded base prompt",
          scenes: [
            {
              id: 1,
              label: "Uploaded Hook",
              setting: "Studio",
              dialogue: "New dialogue",
              emotion: "Direct",
              vidPrompt: "She speaks to camera."
            }
          ]
        })
      ],
      "scenes.json",
      { type: "application/json" }
    );

    fireEvent.click(screen.getByRole("button", { name: /load scenes json/i }));
    fireEvent.change(screen.getByLabelText(/upload scenes json/i), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText("Uploaded Hook")).toBeInTheDocument();
    });

    expect(screen.getByText(/loaded 1 scenes from scenes\.json/i)).toBeInTheDocument();
  });

  it("shows a validation error for an invalid upload and keeps the current scenes", async () => {
    render(<App />);

    const file = new File(
      [JSON.stringify({ basePrompt: "Broken", scenes: [{ id: 1 }] })],
      "broken.json",
      { type: "application/json" }
    );

    fireEvent.click(screen.getByRole("button", { name: /load scenes json/i }));
    fireEvent.change(screen.getByLabelText(/upload scenes json/i), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText(/scene 1 is missing "label"/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Hook - Energetic Opening")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL because the `Load Scenes JSON` button and upload flow do not exist yet

- [ ] **Step 3: Write minimal implementation**

```jsx
const defaultScenes = [...];
const defaultBasePrompt = "...";

function buildPrompts(scenes, basePrompt) {
  const nextPrompts = {};

  scenes.forEach((scene) => {
    if (scene.id === 1) {
      nextPrompts[scene.id] = `${basePrompt}${scene.setting}. ${scene.emotion}.`;
      return;
    }

    nextPrompts[scene.id] =
      "Keep the exact same woman's face, features, hair color, eye color, and skin tone from the reference image. " +
      `Change only her outfit and setting to: ${scene.setting}. ` +
      `Expression: ${scene.emotion}. She is mid-sentence, mouth slightly open. ` +
      "iPhone selfie, vertical 9:16, photorealistic.";
  });

  return nextPrompts;
}

export default function App() {
  const [scenes, setScenes] = useState(defaultScenes);
  const [basePrompt, setBasePrompt] = useState(defaultBasePrompt);
  const [images, setImages] = useState({});
  const [videos, setVideos] = useState({});
  const [editSceneId, setEditSceneId] = useState(null);
  const [importMessage, setImportMessage] = useState(null);
  const fileInputRef = useRef(null);

  const [prompts, setPrompts] = useState(() => buildPrompts(defaultScenes, defaultBasePrompt));

  function clearAllTimers() {
    Object.values(timers.current).forEach(clearInterval);
    timers.current = {};
  }

  async function handleScenesUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const nextPipeline = parsePipelineJson(text);

      clearAllTimers();
      setScenes(nextPipeline.scenes);
      setBasePrompt(nextPipeline.basePrompt);
      setPrompts(buildPrompts(nextPipeline.scenes, nextPipeline.basePrompt));
      setImages({});
      setVideos({});
      setEditSceneId(null);
      setActiveRunId(null);
      setImportMessage({
        type: "success",
        text: `Loaded ${nextPipeline.scenes.length} scenes from ${file.name}`
      });
    } catch (error) {
      setImportMessage({ type: "error", text: error.message });
    } finally {
      event.target.value = "";
    }
  }

  return (
    <>
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        Load Scenes JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        aria-label="Upload Scenes JSON"
        style={{ display: "none" }}
        onChange={handleScenesUpload}
      />
      {importMessage && <div>{importMessage.text}</div>}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.jsx`
Expected: PASS for the new upload tests and the existing render test

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: add pipeline json upload flow"
```

### Task 4: Run Creation, Asset Folder UI, And Export

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.test.jsx`
- Use: `src/runs.js`

- [ ] **Step 1: Write the failing test**

```jsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

describe("App asset folders", () => {
  it("shows a new run folder after generated assets are recorded", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { taskId: "task_1" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            state: "success",
            resultJson: JSON.stringify({ resultUrls: ["https://cdn.example.com/scene-1.png"] })
          }
        })
      });

    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /generate base avatar/i }));
    await vi.runOnlyPendingTimersAsync();

    expect(await screen.findByText(/asset folders/i)).toBeInTheDocument();
    expect(await screen.findByText(/run \d{4}-\d{2}-\d{2}/i)).toBeInTheDocument();
  });

  it("exports a run manifest when export is clicked", async () => {
    const createObjectURL = vi.fn(() => "blob:run-export");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    render(<App />);

    // Seed a run through the app's generation path or a test-only helper interaction.
    // After the run is visible:
    fireEvent.click(screen.getByRole("button", { name: /export run/i }));

    expect(createObjectURL).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.jsx`
Expected: FAIL because the run library and export button do not exist yet

- [ ] **Step 3: Write minimal implementation**

```jsx
const [runs, setRuns] = useState([]);
const [activeRunId, setActiveRunId] = useState(null);
const [expandedRunIds, setExpandedRunIds] = useState({});

function ensureActiveRun() {
  if (activeRunId) {
    return activeRunId;
  }

  const runId = `run_${Date.now()}`;
  const run = createRunRecord({
    basePrompt,
    scenes,
    now: new Date().toISOString(),
    runId
  });

  setRuns((current) => [run, ...current]);
  setActiveRunId(runId);
  setExpandedRunIds((current) => ({ ...current, [runId]: true }));
  return runId;
}

function updateRunAssets(sceneId, assetPatch) {
  const runId = ensureActiveRun();

  setRuns((current) =>
    current.map((run) => (run.id === runId ? attachRunAsset(run, sceneId, assetPatch) : run))
  );
}

function exportRun(run) {
  const payload = createRunExportPayload(run);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${run.id}.json`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

// Call updateRunAssets when an image or video succeeds:
updateRunAssets(sceneId, {
  image: { url: assetUrl, status: "success" }
});

updateRunAssets(sceneId, {
  video: { url: assetUrl, status: "success" }
});

// Render panel:
<section>
  <h2>Asset Folders</h2>
  {runs.map((run) => (
    <article key={run.id}>
      <button type="button" onClick={() => toggleRunExpanded(run.id)}>
        {run.name}
      </button>
      <button type="button" onClick={() => exportRun(run)}>
        Export Run
      </button>
    </article>
  ))}
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.jsx`
Expected: PASS for the run folder and export tests plus prior app tests

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx src/runs.js src/runs.test.js
git commit -m "feat: add asset folder library and export"
```

### Task 5: Final Verification

**Files:**
- Verify: `src/App.jsx`
- Verify: `src/pipeline-import.js`
- Verify: `src/runs.js`
- Verify: `src/App.test.jsx`
- Verify: `src/pipeline-import.test.js`
- Verify: `src/runs.test.js`

- [ ] **Step 1: Run the focused helper tests**

Run: `npm test -- src/pipeline-import.test.js src/runs.test.js`
Expected: PASS

- [ ] **Step 2: Run the app tests**

Run: `npm test -- src/App.test.jsx`
Expected: PASS

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS with all test files green

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS and Vite emits `dist/`

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx src/pipeline-import.js src/pipeline-import.test.js src/runs.js src/runs.test.js
git commit -m "feat: support scene uploads and asset folders"
```
