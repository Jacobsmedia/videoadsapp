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
      "basePrompt must be a string"
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
