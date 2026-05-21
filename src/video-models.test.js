import { describe, expect, it } from "vitest";
import {
  createVideoGenerationRequest,
  DEFAULT_VIDEO_MODEL_ID,
  getSupportedVideoLengthSeconds,
  resolveVideoLengthForModel,
  VIDEO_MODEL_OPTIONS
} from "./video-models.js";

describe("video model helpers", () => {
  it("uses Veo as the default video model", () => {
    expect(DEFAULT_VIDEO_MODEL_ID).toBe("veo3_fast");
  });

  it("includes current KIE image-to-video options in the selector list", () => {
    expect(VIDEO_MODEL_OPTIONS.some((model) => model.id === "veo3")).toBe(true);
    expect(
      VIDEO_MODEL_OPTIONS.some((model) => model.id === "sora-2-pro-image-to-video")
    ).toBe(true);
    expect(
      VIDEO_MODEL_OPTIONS.some((model) => model.id === "wan/2-7-image-to-video")
    ).toBe(true);
  });

  it("exposes supported length options per model", () => {
    expect(getSupportedVideoLengthSeconds("veo3_fast")).toEqual([8]);
    expect(getSupportedVideoLengthSeconds("grok-imagine/image-to-video")).toEqual([6]);
    expect(getSupportedVideoLengthSeconds("bytedance/seedance-2")).toEqual([15]);
  });

  it("falls back to the model default when a requested length is unsupported", () => {
    expect(
      resolveVideoLengthForModel({
        modelId: "veo3_fast",
        requestedSeconds: 10
      })
    ).toMatchObject({
      seconds: 8
    });

    expect(
      resolveVideoLengthForModel({
        modelId: "veo3_fast",
        requestedSeconds: 10
      }).warning
    ).toMatch(/requested 10s/i);
  });

  it("builds Veo requests against the Veo endpoint", () => {
    expect(
      createVideoGenerationRequest({
        prompt: "Prompt",
        imageUrl: "https://cdn.example.com/frame.png",
        modelId: "veo3",
        durationSeconds: 8
      })
    ).toMatchObject({
      endpoint: "/api/v1/veo/generate",
      pollType: "vidVeo",
      body: {
        prompt: "Prompt",
        model: "veo3",
        imageUrls: ["https://cdn.example.com/frame.png"]
      }
    });
  });

  it("builds unified job requests for non-Veo KIE video models", () => {
    expect(
      createVideoGenerationRequest({
        prompt: "Prompt",
        imageUrl: "https://cdn.example.com/frame.png",
        modelId: "wan/2-6-image-to-video",
        durationSeconds: 5
      })
    ).toMatchObject({
      endpoint: "/api/v1/jobs/createTask",
      pollType: "vidJob",
      body: {
        model: "wan/2-6-image-to-video",
        input: {
          prompt: "Prompt",
          image_urls: ["https://cdn.example.com/frame.png"]
        }
      }
    });
  });

  it("uses the selected scene length when building non-Veo generation payloads", () => {
    expect(
      createVideoGenerationRequest({
        prompt: "Prompt",
        imageUrl: "https://cdn.example.com/frame.png",
        modelId: "bytedance/seedance-2",
        durationSeconds: 15
      })
    ).toMatchObject({
      body: {
        model: "bytedance/seedance-2",
        input: {
          duration: 15
        }
      }
    });
  });
});
