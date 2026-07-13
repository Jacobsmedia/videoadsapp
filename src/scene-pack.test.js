import { describe, expect, it } from "vitest";
import {
  draftToScene,
  parseDurationSeconds,
  parseScenePack,
  serializeScenePack
} from "./scene-pack.js";

const validPack = [
  {
    name: "Hook - Energetic Opening",
    timeRange: "0:00-0:08",
    duration: 8,
    still: { type: "text", prompt: "Selfie of a woman, bright living room." },
    motionPrompt: "She leans toward camera with energy.",
    voLine: "Calling all women over 40..."
  },
  {
    name: "Problem - Vulnerable",
    timeRange: "0:08-0:16",
    duration: "8s",
    still: { type: "edit", prompt: "Same woman, lying in bed, morning light." },
    motionPrompt: "She speaks softly and reflectively.",
    voLine: "I'm 47..."
  }
];

describe("parseDurationSeconds", () => {
  it("accepts numbers and second strings", () => {
    expect(parseDurationSeconds(8)).toBe(8);
    expect(parseDurationSeconds("8s")).toBe(8);
    expect(parseDurationSeconds("12")).toBe(12);
    expect(parseDurationSeconds(8.6)).toBe(9);
  });

  it("returns null for unparseable values", () => {
    expect(parseDurationSeconds("abc")).toBeNull();
    expect(parseDurationSeconds(null)).toBeNull();
    expect(parseDurationSeconds({})).toBeNull();
  });
});

describe("parseScenePack", () => {
  it("parses a valid scene pack into internal drafts", () => {
    const drafts = parseScenePack(JSON.stringify(validPack));

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toEqual({
      label: "Hook - Energetic Opening",
      timeRange: "0:00-0:08",
      videoLengthSeconds: 8,
      stillType: "text",
      stillPrompt: "Selfie of a woman, bright living room.",
      vidPrompt: "She leans toward camera with energy.",
      voLine: "Calling all women over 40..."
    });
    expect(drafts[1].videoLengthSeconds).toBe(8);
    expect(drafts[1].stillType).toBe("edit");
  });

  it("also accepts an object with a scenes array", () => {
    expect(parseScenePack(JSON.stringify({ scenes: validPack }))).toHaveLength(2);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseScenePack("[")).toThrow("Invalid JSON syntax");
  });

  it("throws when the root is not an array", () => {
    expect(() => parseScenePack(JSON.stringify({ foo: 1 }))).toThrow(
      "Scene pack must be a JSON array of scenes"
    );
  });

  it("throws on an empty pack", () => {
    expect(() => parseScenePack("[]")).toThrow("Scene pack contains no scenes");
  });

  it("throws when a name is missing", () => {
    const pack = [{ ...validPack[0], name: "" }];
    expect(() => parseScenePack(JSON.stringify(pack))).toThrow(
      'Scene 1: "name" must be a non-empty string'
    );
  });

  it("throws on an invalid still.type", () => {
    const pack = [{ ...validPack[0], still: { type: "photo", prompt: "x" } }];
    expect(() => parseScenePack(JSON.stringify(pack))).toThrow(
      'Scene 1: "still.type" must be "text" or "edit"'
    );
  });

  it("throws when still.prompt is empty", () => {
    const pack = [{ ...validPack[0], still: { type: "text", prompt: "  " } }];
    expect(() => parseScenePack(JSON.stringify(pack))).toThrow(
      'Scene 1: "still.prompt" must be a non-empty string'
    );
  });

  it("throws when duration cannot be parsed", () => {
    const pack = [{ ...validPack[0], duration: "long" }];
    expect(() => parseScenePack(JSON.stringify(pack))).toThrow(
      'Scene 1: "duration" must be a number of seconds'
    );
  });
});

describe("draftToScene", () => {
  it("assigns an id and maps drafts onto the internal scene shape", () => {
    const [draft] = parseScenePack(JSON.stringify(validPack));
    expect(draftToScene(draft, 1)).toEqual({
      id: 1,
      label: "Hook - Energetic Opening",
      setting: "Selfie of a woman, bright living room.",
      dialogue: "Calling all women over 40...",
      emotion: "",
      vidPrompt: "She leans toward camera with energy.",
      videoLengthSeconds: 8,
      timeRange: "0:00-0:08",
      stillType: "text"
    });
  });
});

describe("serializeScenePack", () => {
  it("round-trips scenes back into the pack format", () => {
    const drafts = parseScenePack(JSON.stringify(validPack));
    const scenes = drafts.map((draft, index) => draftToScene(draft, index + 1));
    const prompts = { 1: drafts[0].stillPrompt, 2: drafts[1].stillPrompt };

    // Durations are normalized to numbers on the way out (input scene 2 used "8s").
    const expected = validPack.map((scene) => ({ ...scene, duration: 8 }));
    expect(serializeScenePack(scenes, prompts)).toEqual(expected);
  });

  it("infers still.type from scene id when stillType is absent", () => {
    const scenes = [
      { id: 1, label: "Base", videoLengthSeconds: 8, setting: "base prompt" },
      { id: 2, label: "Edit", videoLengthSeconds: 8, setting: "edit prompt" }
    ];
    const pack = serializeScenePack(scenes, {});
    expect(pack[0].still.type).toBe("text");
    expect(pack[1].still.type).toBe("edit");
  });
});
