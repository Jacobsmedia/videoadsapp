import { describe, expect, it } from "vitest";
import {
  getVeoResultUrl,
  getVeo1080pPath,
  getVeoTaskOutcome,
  getVeoTaskStatusPath
} from "./veo.js";

describe("veo helpers", () => {
  it("uses the KIE record-info endpoint for Veo status polling", () => {
    expect(getVeoTaskStatusPath("task_123")).toBe(
      "/api/v1/veo/record-info?taskId=task_123"
    );
  });

  it("uses the KIE get-1080p-video endpoint for Veo HD retrieval", () => {
    expect(getVeo1080pPath("task_123")).toBe(
      "/api/v1/veo/get-1080p-video?taskId=task_123"
    );
  });

  it("maps KIE successFlag values to app task outcomes", () => {
    expect(getVeoTaskOutcome({ successFlag: 0 })).toBe("pending");
    expect(getVeoTaskOutcome({ successFlag: 1 })).toBe("success");
    expect(getVeoTaskOutcome({ successFlag: 2 })).toBe("failed");
    expect(getVeoTaskOutcome({ successFlag: 3 })).toBe("failed");
  });

  it("extracts the first generated video URL from KIE resultUrls payloads", () => {
    expect(
      getVeoResultUrl({
        resultUrls: "[\"https://cdn.example.com/video.mp4\"]"
      })
    ).toBe("https://cdn.example.com/video.mp4");
  });

  it("ignores malformed resultUrls payloads instead of throwing", () => {
    expect(getVeoResultUrl({ resultUrls: "not-json" })).toBe("");
  });
});
