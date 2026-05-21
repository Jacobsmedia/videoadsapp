export const DEFAULT_VIDEO_MODEL_ID = "veo3_fast";

function createModel(config) {
  return {
    supportedDurationSeconds: [8],
    defaultDurationSeconds: 8,
    ...config
  };
}

function asStringDuration(durationSeconds) {
  return String(durationSeconds);
}

function asNumberDuration(durationSeconds) {
  return durationSeconds;
}

export const VIDEO_MODEL_OPTIONS = [
  createModel({
    id: "veo3",
    label: "Veo 3.1 Quality",
    provider: "Veo",
    api: "veo",
    supportedDurationSeconds: [8],
    defaultDurationSeconds: 8
  }),
  createModel({
    id: "veo3_fast",
    label: "Veo 3.1 Fast",
    provider: "Veo",
    api: "veo",
    supportedDurationSeconds: [8],
    defaultDurationSeconds: 8
  }),
  createModel({
    id: "kling-2.6/image-to-video",
    label: "Kling 2.6 Image to Video",
    provider: "Kling",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_urls: [imageUrl],
      sound: false,
      duration: asStringDuration(durationSeconds)
    })
  }),
  createModel({
    id: "kling/v2-5-turbo-image-to-video-pro",
    label: "Kling 2.5 Turbo Image to Video Pro",
    provider: "Kling",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      duration: asStringDuration(durationSeconds)
    })
  }),
  createModel({
    id: "kling/v2-1-master-image-to-video",
    label: "Kling V2.1 Master Image to Video",
    provider: "Kling",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      duration: asStringDuration(durationSeconds)
    })
  }),
  createModel({
    id: "bytedance/v1-pro-fast-image-to-video",
    label: "Bytedance V1 Pro Fast Image to Video",
    provider: "Bytedance",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      resolution: "720p",
      duration: asStringDuration(durationSeconds),
      nsfw_checker: true
    })
  }),
  createModel({
    id: "bytedance/v1-pro-image-to-video",
    label: "Bytedance V1 Pro Image to Video",
    provider: "Bytedance",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      resolution: "720p",
      duration: asStringDuration(durationSeconds),
      nsfw_checker: true
    })
  }),
  createModel({
    id: "bytedance/v1-lite-image-to-video",
    label: "Bytedance V1 Lite Image to Video",
    provider: "Bytedance",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      resolution: "720p",
      duration: asStringDuration(durationSeconds),
      nsfw_checker: false
    })
  }),
  createModel({
    id: "bytedance/seedance-1.5-pro",
    label: "Bytedance Seedance 1.5 Pro",
    provider: "Bytedance",
    api: "job",
    supportedDurationSeconds: [8],
    defaultDurationSeconds: 8,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      input_urls: [imageUrl],
      aspect_ratio: "9:16",
      resolution: "720p",
      duration: asStringDuration(durationSeconds),
      generate_audio: false,
      nsfw_checker: false
    })
  }),
  createModel({
    id: "bytedance/seedance-2",
    label: "Bytedance Seedance 2.0",
    provider: "Bytedance",
    api: "job",
    supportedDurationSeconds: [15],
    defaultDurationSeconds: 15,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      first_frame_url: imageUrl,
      generate_audio: false,
      resolution: "720p",
      aspect_ratio: "9:16",
      duration: asNumberDuration(durationSeconds)
    })
  }),
  createModel({
    id: "bytedance/seedance-2-fast",
    label: "Bytedance Seedance 2.0 Fast",
    provider: "Bytedance",
    api: "job",
    supportedDurationSeconds: [15],
    defaultDurationSeconds: 15,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      first_frame_url: imageUrl,
      generate_audio: false,
      resolution: "720p",
      aspect_ratio: "9:16",
      duration: asNumberDuration(durationSeconds)
    })
  }),
  createModel({
    id: "hailuo/02-image-to-video-standard",
    label: "Hailuo Standard Image to Video",
    provider: "Hailuo",
    api: "job",
    supportedDurationSeconds: [10],
    defaultDurationSeconds: 10,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      duration: asStringDuration(durationSeconds),
      resolution: "768P",
      prompt_optimizer: true
    })
  }),
  createModel({
    id: "hailuo/02-image-to-video-pro",
    label: "Hailuo Pro Image to Video",
    provider: "Hailuo",
    api: "job",
    supportedDurationSeconds: [6],
    defaultDurationSeconds: 6,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      duration: asStringDuration(durationSeconds),
      prompt_optimizer: true
    })
  }),
  createModel({
    id: "hailuo/2-3-image-to-video-standard",
    label: "Hailuo 2.3 Standard Image to Video",
    provider: "Hailuo",
    api: "job",
    supportedDurationSeconds: [6],
    defaultDurationSeconds: 6,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      duration: asStringDuration(durationSeconds)
    })
  }),
  createModel({
    id: "hailuo/2-3-image-to-video-pro",
    label: "Hailuo 2.3 Pro Image to Video",
    provider: "Hailuo",
    api: "job",
    supportedDurationSeconds: [6],
    defaultDurationSeconds: 6,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_url: imageUrl,
      duration: asStringDuration(durationSeconds)
    })
  }),
  createModel({
    id: "sora-2-image-to-video",
    label: "Sora2 Image to Video",
    provider: "Sora2",
    api: "job",
    supportedDurationSeconds: [10],
    defaultDurationSeconds: 10,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_urls: [imageUrl],
      aspect_ratio: "portrait",
      n_frames: asStringDuration(durationSeconds),
      remove_watermark: true,
      upload_method: "s3"
    })
  }),
  createModel({
    id: "sora-2-pro-image-to-video",
    label: "Sora2 Pro Image to Video",
    provider: "Sora2",
    api: "job",
    supportedDurationSeconds: [10],
    defaultDurationSeconds: 10,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_urls: [imageUrl],
      aspect_ratio: "portrait",
      n_frames: asStringDuration(durationSeconds),
      size: "standard",
      remove_watermark: true,
      upload_method: "s3"
    })
  }),
  createModel({
    id: "wan/2-2-a14b-image-to-video-turbo",
    label: "Wan 2.2 A14B Image to Video Turbo",
    provider: "Wan",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl) => ({
      prompt,
      image_url: imageUrl
    })
  }),
  createModel({
    id: "wan/2-5-image-to-video",
    label: "Wan 2.5 Image to Video",
    provider: "Wan",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl) => ({
      prompt,
      image_urls: [imageUrl]
    })
  }),
  createModel({
    id: "wan/2-6-image-to-video",
    label: "Wan 2.6 Image to Video",
    provider: "Wan",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_urls: [imageUrl],
      duration: asStringDuration(durationSeconds),
      resolution: "1080p",
      nsfw_checker: false
    })
  }),
  createModel({
    id: "wan/2-6-flash-image-to-video",
    label: "Wan 2.6 Flash Image to Video",
    provider: "Wan",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_urls: [imageUrl],
      duration: asStringDuration(durationSeconds),
      resolution: "1080p",
      audio: false,
      multi_shots: false,
      nsfw_checker: false
    })
  }),
  createModel({
    id: "wan/2-7-image-to-video",
    label: "Wan 2.7 Image to Video",
    provider: "Wan",
    api: "job",
    supportedDurationSeconds: [5],
    defaultDurationSeconds: 5,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      first_frame_url: imageUrl,
      resolution: "1080p",
      duration: asNumberDuration(durationSeconds),
      prompt_extend: true,
      watermark: false
    })
  }),
  createModel({
    id: "grok-imagine/image-to-video",
    label: "Grok Imagine Image to Video",
    provider: "Grok Imagine",
    api: "job",
    supportedDurationSeconds: [6],
    defaultDurationSeconds: 6,
    buildInput: (prompt, imageUrl, durationSeconds) => ({
      prompt,
      image_urls: [imageUrl],
      mode: "normal",
      duration: asStringDuration(durationSeconds),
      resolution: "480p",
      aspect_ratio: "9:16"
    })
  })
];

export function getVideoModelById(modelId) {
  return VIDEO_MODEL_OPTIONS.find((model) => model.id === modelId) || VIDEO_MODEL_OPTIONS[0];
}

export function getSupportedVideoLengthSeconds(modelId) {
  return [...getVideoModelById(modelId).supportedDurationSeconds];
}

export function getDefaultVideoLengthSeconds(modelId) {
  return getVideoModelById(modelId).defaultDurationSeconds;
}

function formatSupportedSeconds(secondsList) {
  return secondsList.map((seconds) => `${seconds}s`).join(", ");
}

export function resolveVideoLengthForModel({ modelId, requestedSeconds }) {
  const model = getVideoModelById(modelId);
  const supportedSeconds = model.supportedDurationSeconds;
  const defaultSeconds = model.defaultDurationSeconds;

  if (
    requestedSeconds === undefined ||
    requestedSeconds === null ||
    supportedSeconds.includes(requestedSeconds)
  ) {
    return {
      seconds: requestedSeconds ?? defaultSeconds,
      warning: null
    };
  }

  return {
    seconds: defaultSeconds,
    warning:
      `Requested ${requestedSeconds}s, but ${model.provider} ${model.label} only supports ` +
      `${formatSupportedSeconds(supportedSeconds)}. Using ${defaultSeconds}s instead.`
  };
}

export function createVideoGenerationRequest({
  prompt,
  imageUrl,
  modelId,
  durationSeconds
}) {
  const model = getVideoModelById(modelId);
  const resolvedDuration = resolveVideoLengthForModel({
    modelId: model.id,
    requestedSeconds: durationSeconds
  }).seconds;

  if (model.api === "veo") {
    return {
      model,
      type: "veo",
      endpoint: "/api/v1/veo/generate",
      body: {
        prompt,
        model: model.id,
        aspect_ratio: "9:16",
        enableTranslation: false,
        imageUrls: [imageUrl],
        generationType: "FIRST_AND_LAST_FRAMES_2_VIDEO"
      },
      durationSeconds: resolvedDuration,
      pollType: "vidVeo"
    };
  }

  return {
    model,
    type: "job",
    endpoint: "/api/v1/jobs/createTask",
    body: {
      model: model.id,
      input: model.buildInput(prompt, imageUrl, resolvedDuration)
    },
    durationSeconds: resolvedDuration,
    pollType: "vidJob"
  };
}
