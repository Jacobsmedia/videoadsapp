export const DEFAULT_IMAGE_MODEL_ID = "nano-banana";

export const IMAGE_MODEL_OPTIONS = [
  {
    id: "nano-banana",
    label: "Nano Banana 2K",
    provider: "Google",
    // Scene 1: text-to-image
    buildT2iBody: (prompt) => ({
      model: "nano-banana-2",
      input: {
        prompt,
        image_input: [],
        aspect_ratio: "9:16",
        resolution: "2K",
        output_format: "png"
      }
    }),
    // Scenes 2-6: image-to-image edit
    buildI2iBody: (prompt, imageUrls) => ({
      model: "google/nano-banana-edit",
      input: {
        prompt,
        image_urls: imageUrls,
        output_format: "png",
        image_size: "9:16"
      }
    })
  },
  {
    id: "flux-kontext-pro",
    label: "Flux Kontext Pro",
    provider: "Black Forest Labs",
    buildT2iBody: (prompt) => ({
      model: "black-forest-labs/flux-kontext-pro",
      input: {
        prompt,
        aspect_ratio: "9:16",
        output_format: "png"
      }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "black-forest-labs/flux-kontext-pro",
      input: {
        prompt,
        image_url: imageUrls[0],
        aspect_ratio: "9:16",
        output_format: "png"
      }
    })
  },
  {
    id: "flux-kontext-max",
    label: "Flux Kontext Max",
    provider: "Black Forest Labs",
    buildT2iBody: (prompt) => ({
      model: "black-forest-labs/flux-kontext-max",
      input: {
        prompt,
        aspect_ratio: "9:16",
        output_format: "png"
      }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "black-forest-labs/flux-kontext-max",
      input: {
        prompt,
        image_url: imageUrls[0],
        aspect_ratio: "9:16",
        output_format: "png"
      }
    })
  },
  {
    id: "flux-1-1-pro-ultra",
    label: "Flux 1.1 Pro Ultra",
    provider: "Black Forest Labs",
    buildT2iBody: (prompt) => ({
      model: "black-forest-labs/flux-1-1-pro-ultra",
      input: {
        prompt,
        aspect_ratio: "9:16",
        output_format: "png"
      }
    }),
    // Pair with nano-banana-edit for scene variations since ultra is t2i only
    buildI2iBody: (prompt, imageUrls) => ({
      model: "google/nano-banana-edit",
      input: {
        prompt,
        image_urls: imageUrls,
        output_format: "png",
        image_size: "9:16"
      }
    })
  },
  {
    id: "recraft-v3",
    label: "Recraft V3",
    provider: "Recraft",
    buildT2iBody: (prompt) => ({
      model: "recraft-v3",
      input: {
        prompt,
        size: "1024x1820",
        output_format: "png"
      }
    }),
    buildI2iBody: (prompt, imageUrls) => ({
      model: "recraft-v3",
      input: {
        prompt,
        image_url: imageUrls[0],
        size: "1024x1820",
        output_format: "png"
      }
    })
  }
];

export function getImageModelById(id) {
  return IMAGE_MODEL_OPTIONS.find((m) => m.id === id) ?? IMAGE_MODEL_OPTIONS[0];
}
