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
