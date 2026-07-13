// Parse and serialize the "scene pack" paste format:
//
//   [
//     {
//       "name": "Hook - Energetic Opening",
//       "timeRange": "0:00-0:08",
//       "duration": 8,
//       "still": { "type": "text", "prompt": "..." },
//       "motionPrompt": "...",
//       "voLine": "..."
//     },
//     ...
//   ]
//
// `still.type` is "text" for the base avatar (text-to-image) and "edit" for
// every scene that edits from the approved base still. This maps onto the app's
// internal scene model, where scene 1 is the text2img base and the rest are edits.

const STILL_TYPES = new Set(["text", "edit"]);

export function parseDurationSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (match) {
      return Math.round(Number.parseFloat(match[0]));
    }
  }

  return null;
}

function assertString(value, sceneLabel, field) {
  if (typeof value !== "string") {
    throw new Error(`${sceneLabel}: "${field}" must be a string`);
  }
}

// Returns an array of "scene drafts" (internal scene fields without an id).
// The caller assigns ids (position-based for replace, continuing for append)
// and derives the per-scene image prompt from `stillPrompt`.
export function parseScenePack(sourceText) {
  let parsed;

  try {
    parsed = JSON.parse(sourceText);
  } catch {
    throw new Error("Invalid JSON syntax");
  }

  let rawScenes;
  if (Array.isArray(parsed)) {
    rawScenes = parsed;
  } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.scenes)) {
    rawScenes = parsed.scenes;
  } else {
    throw new Error("Scene pack must be a JSON array of scenes");
  }

  if (rawScenes.length === 0) {
    throw new Error("Scene pack contains no scenes");
  }

  return rawScenes.map((scene, index) => {
    const sceneLabel = `Scene ${index + 1}`;

    if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
      throw new Error(`${sceneLabel} must be an object`);
    }

    if (typeof scene.name !== "string" || scene.name.trim() === "") {
      throw new Error(`${sceneLabel}: "name" must be a non-empty string`);
    }

    if (!scene.still || typeof scene.still !== "object" || Array.isArray(scene.still)) {
      throw new Error(`${sceneLabel}: "still" must be an object`);
    }

    if (!STILL_TYPES.has(scene.still.type)) {
      throw new Error(`${sceneLabel}: "still.type" must be "text" or "edit"`);
    }

    if (typeof scene.still.prompt !== "string" || scene.still.prompt.trim() === "") {
      throw new Error(`${sceneLabel}: "still.prompt" must be a non-empty string`);
    }

    assertString(scene.motionPrompt ?? "", sceneLabel, "motionPrompt");
    assertString(scene.voLine ?? "", sceneLabel, "voLine");

    if (scene.timeRange !== undefined && typeof scene.timeRange !== "string") {
      throw new Error(`${sceneLabel}: "timeRange" must be a string`);
    }

    const duration = parseDurationSeconds(scene.duration);
    if (duration === null || duration <= 0) {
      throw new Error(`${sceneLabel}: "duration" must be a number of seconds`);
    }

    return {
      label: scene.name,
      timeRange: scene.timeRange ?? "",
      videoLengthSeconds: duration,
      stillType: scene.still.type,
      stillPrompt: scene.still.prompt,
      vidPrompt: scene.motionPrompt ?? "",
      voLine: scene.voLine ?? ""
    };
  });
}

// Turn one parsed draft plus an assigned id into the app's internal scene shape.
export function draftToScene(draft, id) {
  return {
    id,
    label: draft.label,
    setting: draft.stillPrompt,
    dialogue: draft.voLine,
    emotion: "",
    vidPrompt: draft.vidPrompt,
    videoLengthSeconds: draft.videoLengthSeconds,
    timeRange: draft.timeRange,
    stillType: draft.stillType
  };
}

// Serialize the current scenes (plus their resolved image prompts) back into the
// pasteable scene-pack format.
export function serializeScenePack(scenes, prompts = {}) {
  return scenes.map((scene) => ({
    name: scene.label ?? "",
    timeRange: scene.timeRange ?? "",
    duration: scene.videoLengthSeconds ?? 0,
    still: {
      type: scene.stillType || (scene.id === 1 ? "text" : "edit"),
      prompt: prompts[scene.id] ?? scene.setting ?? ""
    },
    motionPrompt: scene.vidPrompt ?? "",
    voLine: scene.dialogue ?? ""
  }));
}
