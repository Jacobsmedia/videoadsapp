import { describe, expect, it } from "vitest";
import { attachRunAsset, createRunExportPayload, createRunRecord } from "./runs.js";

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
