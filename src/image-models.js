// Each model defines:
//   createPath  – POST endpoint to create the task
//   pollType    – "img" (jobs API), "imgFluxKontext", or "imgGpt4o"
//   buildT2iBody(prompt)           – payload for Scene 1 (text-to-image)
//   buildI2iBody(prompt, imageUrls) – payload for Scenes 2+ (image-to-image/edit)

const JOBS_PATH = "/api/v1/jobs/createTask";
const FLUX_KONTEXT_PATH = "/api/v1/flux/kontext/generate";
const GPT4O_PATH = "/api/v1/gpt4o-image/generate";

export const DEFAULT_IMAGE_MODEL_ID = "nano-banana";

export const IMAGE_MODEL_OPTIONS = [
  // ── Google ─────────────────────────────────────────────────────────────────
  {
    id: "nano-banana",
    label: "Nano Banana 2K",
    provider: "Google",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "nano-banana-2",
      input: { prompt, image_input: [], aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "google/nano-banana-edit",
      input: { prompt, image_urls: imageUrls, output_format: "png", image_size: "9:16" }
    })
  },
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    provider: "Google",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "nano-banana-pro",
      input: { prompt, image_input: [], aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "nano-banana-pro",
      input: { prompt, image_input: imageUrls, aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    })
  },
  {
    id: "imagen4",
    label: "Imagen 4",
    provider: "Google",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "google/imagen4",
      input: { prompt, aspect_ratio: "9:16" }
    }),
    // No native i2i — use Nano Banana Pro with image reference
    buildI2iBody: (prompt, imageUrls) => ({
      model: "nano-banana-pro",
      input: { prompt, image_input: imageUrls, aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    })
  },
  {
    id: "imagen4-ultra",
    label: "Imagen 4 Ultra",
    provider: "Google",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "google/imagen4-ultra",
      input: { prompt, aspect_ratio: "9:16" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "nano-banana-pro",
      input: { prompt, image_input: imageUrls, aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    })
  },

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    provider: "OpenAI",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "gpt-image-2-text-to-image",
      input: { prompt, aspect_ratio: "9:16", resolution: "2K" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "gpt-image-2-image-to-image",
      input: { prompt, input_urls: imageUrls, aspect_ratio: "9:16", resolution: "2K" }
    })
  },
  {
    // GPT-4o image does not support 9:16 — uses 2:3 (closest available)
    id: "gpt-4o",
    label: "GPT-4o Image (2:3)",
    provider: "OpenAI",
    createPath: GPT4O_PATH,
    pollType: "imgGpt4o",
    buildT2iBody: (prompt) => ({
      prompt,
      size: "2:3",
      nVariants: 1
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      prompt,
      filesUrl: imageUrls,
      size: "2:3",
      nVariants: 1
    })
  },

  // ── Black Forest Labs ───────────────────────────────────────────────────────
  {
    id: "flux-kontext-pro",
    label: "Flux Kontext Pro",
    provider: "Black Forest Labs",
    createPath: FLUX_KONTEXT_PATH,
    pollType: "imgFluxKontext",
    buildT2iBody: (prompt) => ({
      prompt,
      model: "flux-kontext-pro",
      aspectRatio: "9:16",
      outputFormat: "png"
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      prompt,
      model: "flux-kontext-pro",
      inputImage: imageUrls[0],
      aspectRatio: "9:16",
      outputFormat: "png"
    })
  },
  {
    id: "flux-kontext-max",
    label: "Flux Kontext Max",
    provider: "Black Forest Labs",
    createPath: FLUX_KONTEXT_PATH,
    pollType: "imgFluxKontext",
    buildT2iBody: (prompt) => ({
      prompt,
      model: "flux-kontext-max",
      aspectRatio: "9:16",
      outputFormat: "png"
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      prompt,
      model: "flux-kontext-max",
      inputImage: imageUrls[0],
      aspectRatio: "9:16",
      outputFormat: "png"
    })
  },
  {
    id: "flux-2-pro",
    label: "Flux 2 Pro",
    provider: "Black Forest Labs",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "flux-2/pro-text-to-image",
      input: { prompt, aspect_ratio: "9:16", resolution: "2K" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "flux-2/pro-image-to-image",
      input: { input_urls: imageUrls, prompt, aspect_ratio: "9:16", resolution: "2K" }
    })
  },

  // ── xAI ────────────────────────────────────────────────────────────────────
  {
    id: "grok-imagine",
    label: "Grok Imagine",
    provider: "xAI",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "grok-imagine/text-to-image",
      input: { prompt, aspect_ratio: "9:16" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "nano-banana-pro",
      input: { prompt, image_input: imageUrls, aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    })
  },

  // ── Alibaba / Qwen ─────────────────────────────────────────────────────────
  {
    id: "qwen2",
    label: "Qwen 2",
    provider: "Alibaba",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "qwen2/text-to-image",
      input: { prompt, image_size: "9:16", output_format: "png" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "nano-banana-pro",
      input: { prompt, image_input: imageUrls, aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    })
  },

  // ── Wan ────────────────────────────────────────────────────────────────────
  {
    id: "wan-2-7",
    label: "Wan 2.7 Image",
    provider: "Wan",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "wan/2-7-image",
      input: { prompt, input_urls: [], aspect_ratio: "9:16", resolution: "2K", nsfw_checker: false }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "wan/2-7-image",
      input: { prompt, input_urls: imageUrls, aspect_ratio: "9:16", resolution: "2K", nsfw_checker: false }
    })
  },

  // ── Z-Image ────────────────────────────────────────────────────────────────
  {
    id: "z-image",
    label: "Z-Image",
    provider: "Z-Image",
    createPath: JOBS_PATH,
    pollType: "img",
    buildT2iBody: (prompt) => ({
      model: "z-image",
      input: { prompt, aspect_ratio: "9:16" }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "nano-banana-pro",
      input: { prompt, image_input: imageUrls, aspect_ratio: "9:16", resolution: "2K", output_format: "png" }
    })
  }
];

export function getImageModelById(id) {
  return IMAGE_MODEL_OPTIONS.find((m) => m.id === id) ?? IMAGE_MODEL_OPTIONS[0];
}
