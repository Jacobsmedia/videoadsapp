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
