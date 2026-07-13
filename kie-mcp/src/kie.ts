// Client for the kie.ai Market/Jobs and Veo3 APIs.
// Docs: https://docs.kie.ai/

export interface Env {
  KIE_API_KEY: string;
  MCP_AUTH_TOKEN: string;
  JOBS_KV: KVNamespace;
}

const KIE_BASE = "https://api.kie.ai";

export type StillMode = "text" | "edit";
export type VideoModel = "seedance" | "veo-3.1";

export const SEEDANCE_MODEL_ID = "bytedance/seedance-1.5-pro";
export const VEO_MODEL_ID = "veo3"; // full-quality Veo 3.1 (kie.ai has no separate "veo3.1" model id)

export const VIDEO_DURATIONS: Record<VideoModel, { min: number; max: number } | number[]> = {
  "veo-3.1": [4, 6, 8],
  seedance: { min: 4, max: 12 },
};

export function validateDuration(model: VideoModel, duration: number): string | null {
  const spec = VIDEO_DURATIONS[model];
  if (Array.isArray(spec)) {
    if (!spec.includes(duration)) {
      return `Invalid duration ${duration} for model "${model}". Allowed values: ${spec.join(", ")} (seconds).`;
    }
  } else {
    if (!Number.isInteger(duration) || duration < spec.min || duration > spec.max) {
      return `Invalid duration ${duration} for model "${model}". Allowed range: ${spec.min}-${spec.max} seconds (integer).`;
    }
  }
  return null;
}

async function kieFetch(env: Env, path: string, init: RequestInit): Promise<any> {
  const res = await fetch(`${KIE_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.KIE_API_KEY}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`kie.ai returned non-JSON response (HTTP ${res.status})`);
  }
  if (!res.ok || (payload.code && payload.code !== 200)) {
    throw new Error(payload.msg || `kie.ai request failed (HTTP ${res.status})`);
  }
  return payload;
}

export async function submitStill(
  env: Env,
  opts: { prompt: string; mode: StillMode; referenceImageUrl?: string; aspectRatio: string }
): Promise<string> {
  const model = opts.mode === "edit" ? "google/nano-banana-edit" : "google/nano-banana";
  const input: Record<string, unknown> =
    opts.mode === "edit"
      ? { prompt: opts.prompt, image_urls: [opts.referenceImageUrl], aspect_ratio: opts.aspectRatio, output_format: "png" }
      : { prompt: opts.prompt, aspect_ratio: opts.aspectRatio, output_format: "png" };

  const payload = await kieFetch(env, "/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({ model, input }),
  });
  const taskId = payload.data?.taskId;
  if (!taskId) throw new Error("kie.ai did not return a taskId");
  return taskId;
}

export async function submitVideo(
  env: Env,
  opts: { model: VideoModel; prompt: string; startImageUrl: string; duration: number; aspectRatio: string }
): Promise<string> {
  if (opts.model === "veo-3.1") {
    const payload = await kieFetch(env, "/api/v1/veo/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: opts.prompt,
        model: VEO_MODEL_ID,
        aspect_ratio: opts.aspectRatio,
        duration: opts.duration,
        imageUrls: [opts.startImageUrl],
        generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO",
        enableTranslation: false,
      }),
    });
    const taskId = payload.data?.taskId;
    if (!taskId) throw new Error("kie.ai did not return a taskId");
    return taskId;
  }

  const payload = await kieFetch(env, "/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model: SEEDANCE_MODEL_ID,
      input: {
        prompt: opts.prompt,
        input_urls: [opts.startImageUrl],
        aspect_ratio: opts.aspectRatio,
        duration: opts.duration,
        resolution: "720p",
        nsfw_checker: false,
      },
    }),
  });
  const taskId = payload.data?.taskId;
  if (!taskId) throw new Error("kie.ai did not return a taskId");
  return taskId;
}

export type PollResult =
  | { state: "pending" }
  | { state: "completed"; resultUrls: string[] }
  | { state: "failed"; error: string };

function extractUrls(source: unknown): string[] {
  if (!source) return [];
  let obj = source;
  if (typeof obj === "string") {
    try {
      obj = JSON.parse(obj);
    } catch {
      return [obj as string];
    }
  }
  if (Array.isArray(obj)) return obj.filter((v) => typeof v === "string");
  if (typeof obj === "object" && obj !== null) {
    const o = obj as Record<string, unknown>;
    for (const key of ["resultUrls", "fullResultUrls", "originUrls", "result_urls"]) {
      if (o[key]) return extractUrls(o[key]);
    }
    for (const key of ["resultImageUrl", "videoUrl", "imageUrl", "url"]) {
      if (typeof o[key] === "string") return [o[key] as string];
    }
  }
  return [];
}

export async function pollVeo(env: Env, taskId: string): Promise<PollResult> {
  const payload = await kieFetch(env, `/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`, { method: "GET" });
  const data = payload.data ?? {};
  const flag = data.successFlag;
  if (flag === 1) {
    return { state: "completed", resultUrls: extractUrls(data.response) };
  }
  if (flag === 2 || flag === 3) {
    return { state: "failed", error: data.errorMessage || "Veo generation failed" };
  }
  return { state: "pending" };
}

export async function pollGenericJob(env: Env, taskId: string): Promise<PollResult> {
  const payload = await kieFetch(env, `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { method: "GET" });
  const data = payload.data ?? {};
  const state = data.state;
  if (state === "success") {
    return { state: "completed", resultUrls: extractUrls(data.resultJson) };
  }
  if (state === "fail") {
    return { state: "failed", error: data.failMsg || "Job failed" };
  }
  return { state: "pending" };
}
