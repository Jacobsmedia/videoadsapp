import { useCallback, useEffect, useRef, useState } from "react";
import { getProxyUrl } from "./config.js";
import { parsePipelineJson } from "./pipeline-import.js";
import { VideoEditor } from "./VideoEditor.jsx";
import {
  attachRunAsset,
  createRunExportPayload,
  createRunRecord
} from "./runs.js";
import {
  createVideoGenerationRequest,
  DEFAULT_VIDEO_MODEL_ID,
  getSupportedVideoLengthSeconds,
  getVideoModelById,
  resolveVideoLengthForModel,
  VIDEO_MODEL_OPTIONS
} from "./video-models.js";
import {
  getVeo1080pPath,
  getVeoResultUrl,
  getVeoTaskOutcome,
  getVeoTaskStatusPath
} from "./veo.js";

const PROXY = getProxyUrl();
const headers = { "Content-Type": "application/json" };

const defaultScenes = [
  {
    id: 1,
    label: "Hook - Energetic Opening",
    setting:
      "Mint green tank top, sitting up on cream linen couch, bright sunlit modern living room",
    dialogue:
      "Calling all women over 40 who are tired of being told to just age gracefully...",
    emotion: "Energetic, confident, leaning toward camera",
    vidPrompt:
      "She speaks with bold confident energy directly into the camera, eyes wide and expressive. She leans forward slightly, eyebrows raised on 'age gracefully'. Small head shake on 'tired'. Loose blonde hair shifts naturally. Handheld selfie, subtle sway. Clear natural voice with light room ambient.",
    videoLengthSeconds: 8
  },
  {
    id: 2,
    label: "Problem - Vulnerable",
    setting:
      "White oversized t-shirt, lying in bed propped on pillows, soft morning window light",
    dialogue:
      "I'm 47. For years I accepted the energy crashes, the brain fog, the slow recovery as just... getting older. Everyone said it was normal.",
    emotion: "Vulnerable, reflective, slightly tired",
    vidPrompt:
      "She speaks softly, reflectively, looking into camera with a slight frown. Pauses after 'just...' with a small sigh. Eyes look down briefly then back up. Lying propped on white pillows. Handheld selfie from above, gentle sway. Clear soft voice with quiet bedroom ambient.",
    videoLengthSeconds: 8
  },
  {
    id: 3,
    label: "Whisper - Secret Reveal",
    setting:
      "Cream silk slip top, reclined on beige couch with throw pillows, warm afternoon light, glass of water on side table",
    dialogue:
      "But here's what nobody tells you. Aging isn't inevitable. It's a treatable condition. And there's one molecule your cells run out of after 40 that changes everything.",
    emotion: "Intimate whisper, leaning close, conspiratorial",
    vidPrompt:
      "She whispers intimately to the camera, leaning in close. Voice drops to a soft whisper on 'here's what nobody tells you'. Eyes widen on 'treatable condition'. Small knowing nod on 'changes everything'. Very close framing. Minimal movement. Handheld selfie very close. Whispered voice with quiet ambient.",
    videoLengthSeconds: 8
  },
  {
    id: 4,
    label: "Credibility - Educational",
    setting:
      "Mint green tank top, sitting upright on cream couch, same room as scene 1, natural light",
    dialogue:
      "It's called NAD+. Harvard's Dr. David Sinclair has spent 30 years studying it. By 60, you have half the NAD+ you had at 40 - that's what's actually aging you.",
    emotion: "Confident, educational, engaged eye contact",
    vidPrompt:
      "She speaks with confident educational energy, eye contact throughout. Gestures with left hand on 'Harvard' for emphasis. Nods on 'that's what's actually aging you'. Natural breathing, slight posture shifts. Sitting upright. Handheld selfie, subtle sway. Clear confident voice with light room ambient.",
    videoLengthSeconds: 8
  },
  {
    id: 5,
    label: "Outcome - Excited",
    setting:
      "White t-shirt, sitting in bed propped on pillows, morning light, relaxed and happy",
    dialogue:
      "Three weeks in, my energy is back. I sleep like I'm 30. My skin is clearer than it's been in a decade. And my husband can't keep his hands off me.",
    emotion: "Excited, genuine smile, glowing confidence",
    vidPrompt:
      "She speaks with growing excitement, genuine wide smile. Touches her face briefly on 'my skin'. Laughs lightly on 'can't keep his hands off me'. Eyes bright and sparkling. Sitting in bed, relaxed. Handheld selfie, subtle sway. Clear happy voice with light ambient.",
    videoLengthSeconds: 8
  },
  {
    id: 6,
    label: "CTA - Product Reveal",
    setting:
      "Mint green tank top, on couch, holding NAD+ injection vial in right hand, label facing camera",
    dialogue:
      "From 99 dollars a month. Free consult, no insurance needed. Link below.",
    emotion: "Calm confidence, small smile, product held up",
    vidPrompt:
      "She speaks with calm closing confidence, holding NAD+ vial at chest height. Lifts vial toward camera midway and tilts label so it's readable, holds elevated for final 3 seconds. Small genuine smile. Subtle nod at the end. Handheld selfie, subtle sway. Clear voice with light ambient.",
    videoLengthSeconds: 8
  }
];

const defaultBasePrompt =
  "Photorealistic iPhone front-camera selfie of a woman age 47, natural beauty, shoulder-length wavy blonde hair, soft hazel-green eyes, light freckles, no makeup or very minimal, fine natural skin texture with subtle laugh lines, warm sun-kissed complexion. Candid mid-sentence expression, mouth slightly open. Slightly grainy iPhone quality, no filter, shallow depth of field. Vertical 9:16. ";

function buildPrompts(scenes, basePrompt) {
  const nextPrompts = {};

  scenes.forEach((scene) => {
    if (scene.id === 1) {
      nextPrompts[scene.id] = `${basePrompt}${scene.setting}. ${scene.emotion}.`;
      return;
    }

    nextPrompts[scene.id] =
      "Keep the exact same woman's face, features, hair color, eye color, and skin tone from the reference image. " +
      `Change only her outfit and setting to: ${scene.setting}. ` +
      `Expression: ${scene.emotion}. She is mid-sentence, mouth slightly open. ` +
      "iPhone selfie, vertical 9:16, photorealistic.";
  });

  return nextPrompts;
}

function countRunAssets(run) {
  return Object.values(run.assets || {}).reduce(
    (totals, asset) => ({
      images: asset?.image?.url ? totals.images + 1 : totals.images,
      videos: asset?.video?.url ? totals.videos + 1 : totals.videos
    }),
    { images: 0, videos: 0 }
  );
}

function readFileText(file) {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsText(file);
  });
}

function normalizeScenesForVideoModel(scenes, modelId) {
  const warnings = {};
  const nextScenes = scenes.map((scene) => {
    const resolution = resolveVideoLengthForModel({
      modelId,
      requestedSeconds: scene.videoLengthSeconds
    });

    if (resolution.warning) {
      warnings[scene.id] = resolution.warning;
    }

    return {
      ...scene,
      videoLengthSeconds: resolution.seconds
    };
  });

  return { scenes: nextScenes, warnings };
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${PROXY}${path}`, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.msg || payload?.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function createNanoBanana(prompt) {
  const payload = await requestJson("/api/v1/jobs/createTask", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "nano-banana-2",
      input: {
        prompt,
        image_input: [],
        aspect_ratio: "9:16",
        resolution: "2K",
        output_format: "png"
      }
    })
  });

  if (payload?.code !== 200 || !payload?.data?.taskId) {
    throw new Error(payload?.msg || "Failed to create image task");
  }

  return payload.data.taskId;
}

async function createNanoBananaEdit(prompt, imageUrls) {
  const payload = await requestJson("/api/v1/jobs/createTask", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "google/nano-banana-edit",
      input: {
        prompt,
        image_urls: imageUrls,
        output_format: "png",
        image_size: "9:16"
      }
    })
  });

  if (payload?.code !== 200 || !payload?.data?.taskId) {
    throw new Error(payload?.msg || "Failed to create edit task");
  }

  return payload.data.taskId;
}

async function getTaskResult(taskId) {
  const payload = await requestJson(`/api/v1/jobs/recordInfo?taskId=${taskId}`, {
    headers
  });
  return payload?.data;
}

async function createVeo(prompt, imageUrls, model = "veo3_fast") {
  const body = {
    prompt,
    model,
    aspect_ratio: "9:16",
    enableTranslation: false
  };

  if (imageUrls?.length) {
    body.imageUrls = imageUrls;
    body.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
  } else {
    body.generationType = "TEXT_2_VIDEO";
  }

  const payload = await requestJson("/api/v1/veo/generate", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (payload?.code !== 200 || !payload?.data?.taskId) {
    throw new Error(payload?.msg || "Veo failed");
  }

  return payload.data.taskId;
}

async function createJobTask(body) {
  const payload = await requestJson("/api/v1/jobs/createTask", {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (payload?.code !== 200 || !payload?.data?.taskId) {
    throw new Error(payload?.msg || "Video generation failed");
  }

  return payload.data.taskId;
}

async function getVeo1080p(taskId) {
  const payload = await requestJson(getVeo1080pPath(taskId), {
    headers
  });
  return payload?.data;
}

async function getVeoResult(taskId) {
  const payload = await requestJson(getVeoTaskStatusPath(taskId), {
    headers
  });
  return payload?.data;
}

function extractAssetUrl(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedUrl = extractAssetUrl(item);

      if (nestedUrl) {
        return nestedUrl;
      }
    }

    return "";
  }

  if (typeof value !== "object") {
    return "";
  }

  const directKeys = [
    "videoUrl",
    "video_url",
    "resultUrl",
    "outputUrl",
    "output_url",
    "imageUrl",
    "image_url",
    "url"
  ];

  for (const key of directKeys) {
    const nestedUrl = extractAssetUrl(value[key]);

    if (nestedUrl) {
      return nestedUrl;
    }
  }

  const collectionKeys = [
    "resultUrls",
    "videoUrls",
    "video_urls",
    "videos",
    "images",
    "outputs",
    "data"
  ];

  for (const key of collectionKeys) {
    const nestedUrl = extractAssetUrl(value[key]);

    if (nestedUrl) {
      return nestedUrl;
    }
  }

  return "";
}

function parseResultUrl(result) {
  if (!result) {
    return "";
  }

  const veoResultUrl = getVeoResultUrl(result);

  if (veoResultUrl) {
    return veoResultUrl;
  }

  const directUrl = extractAssetUrl(result);

  if (directUrl) {
    return directUrl;
  }

  if (!result.resultJson) {
    return "";
  }

  try {
    const parsed =
      typeof result.resultJson === "string"
        ? JSON.parse(result.resultJson)
        : result.resultJson;

    return extractAssetUrl(parsed);
  } catch {
    return "";
  }
}

function StatusBadge({ status }) {
  const states = {
    idle: ["#2a2a3e", "#666680", "READY"],
    generating: ["#3d2f00", "#ffb800", "GENERATING"],
    polling: ["#3d2f00", "#ffb800", "PROCESSING"],
    success: ["#0a3d1a", "#34d058", "DONE"],
    fail: ["#3d0a0a", "#f85149", "FAILED"],
    approved: ["#0a2d3d", "#58a6ff", "APPROVED"],
    locked: ["#1a1a2e", "#555570", "WAITING S1"]
  };
  const [background, foreground, label] = states[status] || states.idle;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        background,
        color: foreground,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.8
      }}
    >
      {(status === "generating" || status === "polling") && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: foreground,
            animation: "pulse 1.2s infinite"
          }}
        />
      )}
      {label}
    </span>
  );
}

function buttonStyle(color, filled = false) {
  return {
    padding: "8px 16px",
    borderRadius: 10,
    background: filled ? color : "transparent",
    color: filled ? "#0d0d14" : color,
    border: `1px solid ${color}`,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2
  };
}

function SceneCard({
  scene,
  imageState,
  videoState,
  baseUrl,
  videoModelId,
  videoLengthWarning,
  proposedVideoLength,
  onChangeVideoLength,
  onGenerateImage,
  onApproveImage,
  onRegenerateImage,
  onGenerateVideo,
  availableSourceScenes,
  onReuseImage
}) {
  const isBaseScene = scene.id === 1;
  const waitingForBase = !isBaseScene && !baseUrl;
  const status = waitingForBase ? "locked" : imageState?.status || "idle";
  const selectedModel = getVideoModelById(videoModelId);
  const supportedLengths = getSupportedVideoLengthSeconds(videoModelId);

  return (
    <section
      style={{
        background: "rgba(22, 22, 30, 0.88)",
        borderRadius: 18,
        padding: 22,
        border: "1px solid #2a2a3e",
        backdropFilter: "blur(12px)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 14
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#6d6d88",
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              marginBottom: 6
            }}
          >
            Scene {scene.id} {isBaseScene ? "- Base Avatar" : ""}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: "#f5f7ff",
              lineHeight: 1.2
            }}
          >
            {scene.label}
          </h2>
        </div>
        <StatusBadge status={status} />
      </div>

      <p style={{ margin: "0 0 8px", color: "#9a9ab5", fontSize: 12 }}>
        <strong style={{ color: "#d2d2e8" }}>Setting:</strong> {scene.setting}
      </p>
      <p style={{ margin: "0 0 12px", color: "#9a9ab5", fontSize: 12 }}>
        <strong style={{ color: "#d2d2e8" }}>Emotion:</strong> {scene.emotion}
      </p>

      <blockquote
        style={{
          margin: "0 0 16px",
          padding: "12px 14px",
          background: "#1e1e2e",
          borderRadius: 12,
          borderLeft: "3px solid #58a6ff",
          color: "#d5d7eb",
          fontSize: 13,
          fontStyle: "italic"
        }}
      >
        "{scene.dialogue}"
      </blockquote>

      <div
        style={{
          marginBottom: 16,
          padding: "12px 14px",
          background: "#161624",
          border: "1px solid #242438",
          borderRadius: 12
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#6d6d88",
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 8
          }}
        >
          Video Production
        </div>

        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#9fa4c6" }}>
            {selectedModel.provider} — {selectedModel.label}
          </span>
        </div>

        {/* Proposed length badge */}
        {proposedVideoLength !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              padding: "6px 10px",
              background: "rgba(88,166,255,0.08)",
              border: "1px solid rgba(88,166,255,0.22)",
              borderRadius: 8,
              fontSize: 11
            }}
          >
            <span style={{ color: "#58a6ff", fontWeight: 700 }}>Script suggests:</span>
            <span style={{ color: "#d2d2e8" }}>{proposedVideoLength}s</span>
            {scene.videoLengthSeconds !== proposedVideoLength && (
              <button
                type="button"
                onClick={() => onChangeVideoLength(scene.id, proposedVideoLength)}
                style={{
                  marginLeft: 4,
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid #58a6ff",
                  background: "transparent",
                  color: "#58a6ff",
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Use
              </button>
            )}
            {scene.videoLengthSeconds === proposedVideoLength && (
              <span style={{ color: "#34d058", fontWeight: 700 }}>✓ Applied</span>
            )}
          </div>
        )}

        {/* Length selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#d2d2e8", fontWeight: 700 }}>
            Length: <span style={{ color: "#a855f7" }}>{scene.videoLengthSeconds}s</span>
          </span>

          {supportedLengths.length === 1 && (
            <span style={{ fontSize: 11, color: "#7a7a92" }}>
              Fixed at {supportedLengths[0]}s for this model
            </span>
          )}

          {supportedLengths.length > 1 && supportedLengths.length <= 8 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {supportedLengths.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  aria-pressed={scene.videoLengthSeconds === seconds}
                  onClick={() => onChangeVideoLength(scene.id, seconds)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: scene.videoLengthSeconds === seconds
                      ? "1.5px solid #a855f7"
                      : "1px solid #2a2a3e",
                    background: scene.videoLengthSeconds === seconds
                      ? "rgba(168,85,247,0.18)"
                      : "#141420",
                    color: scene.videoLengthSeconds === seconds ? "#d8b4fe" : "#9a9ab5",
                    fontSize: 12,
                    fontWeight: scene.videoLengthSeconds === seconds ? 700 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          )}

          {supportedLengths.length > 8 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                aria-label={`Video length for scene ${scene.id}`}
                min={supportedLengths[0]}
                max={supportedLengths[supportedLengths.length - 1]}
                step={supportedLengths[1] - supportedLengths[0]}
                value={scene.videoLengthSeconds}
                onChange={(e) => onChangeVideoLength(scene.id, Number(e.target.value))}
                style={{ flex: 1, accentColor: "#a855f7", cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, color: "#7a7a92", minWidth: 60 }}>
                {supportedLengths[0]}s – {supportedLengths[supportedLengths.length - 1]}s
              </span>
            </div>
          )}
        </div>

        {videoLengthWarning && (
          <div style={{ fontSize: 11, color: "#ffcb52", marginTop: 8 }}>{videoLengthWarning}</div>
        )}
      </div>

      {isBaseScene && !baseUrl && (
        <div
          style={{
            fontSize: 12,
            color: "#ffcb52",
            marginBottom: 12,
            padding: "10px 12px",
            background: "#2d2200",
            borderRadius: 12
          }}
        >
          Approve this base avatar first so scenes 2-6 can reuse the same face.
        </div>
      )}

      {waitingForBase && (
        <div
          style={{
            fontSize: 12,
            color: "#7a7a92",
            marginBottom: 12,
            padding: "10px 12px",
            background: "#1a1a24",
            borderRadius: 12
          }}
        >
          Waiting for Scene 1 approval before generating this scene.
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#6d6d88",
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 8
          }}
        >
          Avatar Image {baseUrl && !isBaseScene ? "- edit from Scene 1" : ""}
        </div>

        {imageState?.url && (
          <div style={{ marginBottom: 10 }}>
            <img
              src={imageState.url}
              alt={`Scene ${scene.id}`}
              style={{
                width: "100%",
                maxWidth: 280,
                borderRadius: 14,
                display: "block",
                border:
                  imageState.status === "approved"
                    ? "2px solid #58a6ff"
                    : "1px solid #2a2a3e"
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(status === "idle" || status === "fail") && !waitingForBase && (
            <button
              type="button"
              onClick={() => onGenerateImage(scene.id)}
              style={buttonStyle("#58a6ff")}
            >
              Generate Image
            </button>
          )}

          {status === "success" && (
            <>
              <button
                type="button"
                onClick={() => onApproveImage(scene.id)}
                style={buttonStyle("#34d058")}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => onRegenerateImage(scene.id)}
                style={buttonStyle("#ffb800")}
              >
                Regen
              </button>
            </>
          )}

          {status === "approved" && (
            <span style={{ fontSize: 12, color: "#58a6ff", fontWeight: 600 }}>
              Approved
            </span>
          )}
        </div>

        {availableSourceScenes?.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#6d6d88" }}>Reuse image from:</span>
            {availableSourceScenes.map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => onReuseImage(src.id)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 8,
                  border: "1px solid #44445b",
                  background: "transparent",
                  color: "#9a9ab5",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                S{src.id}
              </button>
            ))}
          </div>
        )}

        {imageState?.error && (
          <div style={{ fontSize: 11, color: "#f85149", marginTop: 6 }}>
            {imageState.error}
          </div>
        )}
      </div>

      {imageState?.status === "approved" && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#6d6d88",
              letterSpacing: 1,
              textTransform: "uppercase",
            marginBottom: 8
          }}
        >
          Video Output
        </div>

          <div style={{ fontSize: 11, color: "#7a7a92", marginBottom: 8 }}>
            Sending {scene.videoLengthSeconds}s to {selectedModel.provider} {selectedModel.label}
          </div>

          {videoState?.status && <StatusBadge status={videoState.status} />}

          {videoState?.url && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <video
                src={videoState.url}
                controls
                style={{ width: "100%", maxWidth: 280, borderRadius: 14 }}
              />
            </div>
          )}

          {(!videoState?.status ||
            videoState.status === "idle" ||
            videoState.status === "fail") && (
            <button
              type="button"
              onClick={() => onGenerateVideo(scene.id)}
              style={{ ...buttonStyle("#a855f7"), marginTop: 8 }}
            >
              Generate Video
            </button>
          )}

          {videoState?.error && (
            <div style={{ fontSize: 11, color: "#f85149", marginTop: 6 }}>
              {videoState.error}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function App() {
  const [scenes, setScenes] = useState(() =>
    normalizeScenesForVideoModel(defaultScenes, DEFAULT_VIDEO_MODEL_ID).scenes
  );
  const [basePrompt, setBasePrompt] = useState(defaultBasePrompt);
  const [images, setImages] = useState({});
  const [videos, setVideos] = useState({});
  const [videoModelId, setVideoModelId] = useState(DEFAULT_VIDEO_MODEL_ID);
  const [videoLengthWarnings, setVideoLengthWarnings] = useState(() =>
    normalizeScenesForVideoModel(defaultScenes, DEFAULT_VIDEO_MODEL_ID).warnings
  );
  const [proposedVideoLengths, setProposedVideoLengths] = useState({});
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [expandedRunIds, setExpandedRunIds] = useState({});
  const [editSceneId, setEditSceneId] = useState(null);
  const [importMessage, setImportMessage] = useState(null);
  const [prompts, setPrompts] = useState(() =>
    buildPrompts(
      normalizeScenesForVideoModel(defaultScenes, DEFAULT_VIDEO_MODEL_ID).scenes,
      defaultBasePrompt
    )
  );
  const timers = useRef({});
  const fileInputRef = useRef(null);
  const activeRunIdRef = useRef(null);

  const baseUrl = images[1]?.status === "approved" ? images[1].url : null;
  const approvedCount = Object.values(images).filter(
    (image) => image?.status === "approved"
  ).length;
  const allApproved = scenes.every((scene) => images[scene.id]?.status === "approved");

  const clearAllTimers = useCallback(() => {
    Object.values(timers.current).forEach(clearInterval);
    timers.current = {};
  }, []);

  useEffect(() => {
    activeRunIdRef.current = activeRunId;
  }, [activeRunId]);

  useEffect(() => {
    if (!activeRunId) {
      return;
    }

    setRuns((current) =>
      current.map((run) =>
        run.id === activeRunId ? { ...run, scenes: scenes.map((scene) => ({ ...scene })) } : run
      )
    );
  }, [activeRunId, scenes]);

  useEffect(() => clearAllTimers, [clearAllTimers]);

  const ensureActiveRun = useCallback(() => {
    if (activeRunIdRef.current) {
      return activeRunIdRef.current;
    }

    const runId = `run_${Date.now()}`;
    const run = createRunRecord({
      basePrompt,
      scenes: scenes.map((scene) => ({ ...scene })),
      now: new Date().toISOString(),
      runId
    });

    activeRunIdRef.current = runId;
    setActiveRunId(runId);
    setRuns((current) => [run, ...current]);
    setExpandedRunIds((current) => ({ ...current, [runId]: true }));
    return runId;
  }, [basePrompt, scenes]);

  const updateRunAssets = useCallback(
    (sceneId, assetPatch) => {
      const runId = ensureActiveRun();

      setRuns((current) =>
        current.map((run) => (run.id === runId ? attachRunAsset(run, sceneId, assetPatch) : run))
      );
    },
    [ensureActiveRun]
  );

  const exportRun = useCallback((run) => {
    const payload = createRunExportPayload(run);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = objectUrl;
    link.download = `${run.id}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }, []);

  const handleScenesUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      try {
        const uploadedPipeline = parsePipelineJson(await readFileText(file));
        const nextPipeline = normalizeScenesForVideoModel(
          uploadedPipeline.scenes,
          videoModelId
        );

        const proposed = {};
        uploadedPipeline.scenes.forEach((scene) => {
          if (scene.videoLengthSeconds !== undefined) {
            proposed[scene.id] = scene.videoLengthSeconds;
          }
        });

        clearAllTimers();
        activeRunIdRef.current = null;
        setScenes(nextPipeline.scenes);
        setBasePrompt(uploadedPipeline.basePrompt);
        setPrompts(buildPrompts(nextPipeline.scenes, uploadedPipeline.basePrompt));
        setImages({});
        setVideos({});
        setActiveRunId(null);
        setEditSceneId(null);
        setVideoLengthWarnings(nextPipeline.warnings);
        setProposedVideoLengths(proposed);
        setImportMessage({
          type: "success",
          text: `Loaded ${nextPipeline.scenes.length} scenes from ${file.name}`
        });
      } catch (error) {
        setImportMessage({
          type: "error",
          text: error.message
        });
      } finally {
        event.target.value = "";
      }
    },
    [clearAllTimers, videoModelId]
  );

  const handleVideoModelChange = useCallback((nextModelId) => {
    setVideoModelId(nextModelId);
    setScenes((current) => {
      const nextResolution = normalizeScenesForVideoModel(current, nextModelId);

      setVideoLengthWarnings(nextResolution.warnings);
      return nextResolution.scenes;
    });
  }, []);

  const handleSceneVideoLengthChange = useCallback((sceneId, nextSeconds) => {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId ? { ...scene, videoLengthSeconds: nextSeconds } : scene
      )
    );
    setVideoLengthWarnings((current) => {
      const nextWarnings = { ...current };

      delete nextWarnings[sceneId];
      return nextWarnings;
    });
  }, []);

  const addScene = useCallback(
    (sceneData) => {
      setScenes((current) => {
        const maxId = current.reduce((m, s) => Math.max(m, s.id), 0);
        const newId = maxId + 1;
        return [
          ...current,
          {
            id: newId,
            label: sceneData.label,
            setting: sceneData.setting || "",
            dialogue: sceneData.dialogue || "",
            emotion: sceneData.emotion || "",
            vidPrompt: sceneData.vidPrompt || "",
            videoLengthSeconds: sceneData.videoLengthSeconds || 8
          }
        ];
      });
    },
    []
  );

  const toggleRunExpanded = useCallback((runId) => {
    setExpandedRunIds((current) => ({
      ...current,
      [runId]: !current[runId]
    }));
  }, []);

  const pollTask = useCallback((sceneId, taskId, type) => {
    const timerKey = `${type}_${sceneId}`;
    const updateState = type === "img" ? setImages : setVideos;

    if (timers.current[timerKey]) {
      clearInterval(timers.current[timerKey]);
    }

    let attempts = 0;

    timers.current[timerKey] = setInterval(async () => {
      if (++attempts > 150) {
        clearInterval(timers.current[timerKey]);
        updateState((current) => ({
          ...current,
          [sceneId]: {
            ...current[sceneId],
            status: "fail",
            error: "Timeout waiting for job completion"
          }
        }));
        return;
      }

      try {
        const result =
          type === "img" || type === "vidJob"
            ? await getTaskResult(taskId)
            : await getVeoResult(taskId);

        if (!result) {
          return;
        }

        const taskOutcome =
          type === "vidVeo"
            ? getVeoTaskOutcome(result)
            : result.state || result.status;

        if (taskOutcome === "success") {
          clearInterval(timers.current[timerKey]);
          delete timers.current[timerKey];
          let assetUrl = parseResultUrl(result);

          if (type === "vidVeo") {
            try {
              const hdResult = await getVeo1080p(taskId);
              assetUrl = parseResultUrl(hdResult) || assetUrl;
            } catch {
              // Keep the first successful video URL if 1080p retrieval fails.
            }
          }

          if (!assetUrl) {
            updateState((current) => ({
              ...current,
              [sceneId]: {
                ...current[sceneId],
                status: "fail",
                error: "Task completed but no asset URL was returned"
              }
            }));
            return;
          }

          updateRunAssets(sceneId, {
            [type === "img" ? "image" : "video"]: {
              url: assetUrl,
              status: "success",
              taskId
            }
          });

          updateState((current) => ({
            ...current,
            [sceneId]: {
              ...current[sceneId],
              status: "success",
              url: assetUrl,
              taskId
            }
          }));
          return;
        }

        if (taskOutcome === "fail" || taskOutcome === "failed") {
          clearInterval(timers.current[timerKey]);
          delete timers.current[timerKey];
          updateState((current) => ({
            ...current,
            [sceneId]: {
              ...current[sceneId],
              status: "fail",
              error: result.failMsg || "Job failed"
            }
          }));
        }
      } catch (error) {
        clearInterval(timers.current[timerKey]);
        delete timers.current[timerKey];
        updateState((current) => ({
          ...current,
          [sceneId]: {
            ...current[sceneId],
            status: "fail",
            error: error.message
          }
        }));
      }
    }, 5000);
  }, [updateRunAssets]);

  const generateImage = useCallback(
    async (sceneId) => {
      ensureActiveRun();
      setImages((current) => ({ ...current, [sceneId]: { status: "generating" } }));

      try {
        const taskId =
          sceneId === 1
            ? await createNanoBanana(prompts[sceneId])
            : await createNanoBananaEdit(prompts[sceneId], [baseUrl]);

        setImages((current) => ({
          ...current,
          [sceneId]: { status: "polling", taskId }
        }));
        pollTask(sceneId, taskId, "img");
      } catch (error) {
        setImages((current) => ({
          ...current,
          [sceneId]: { status: "fail", error: error.message }
        }));
      }
    },
    [baseUrl, ensureActiveRun, pollTask, prompts]
  );

  const approveImage = useCallback(
    (sceneId) => {
      setImages((current) => ({
        ...current,
        [sceneId]: { ...current[sceneId], status: "approved" }
      }));

      updateRunAssets(sceneId, {
        image: {
          ...(images[sceneId] || {}),
          status: "approved"
        }
      });
    },
    [images, updateRunAssets]
  );

  const reuseImage = useCallback(
    (targetSceneId, sourceSceneId) => {
      const sourceImage = images[sourceSceneId];
      if (!sourceImage?.url) return;
      setImages((current) => ({
        ...current,
        [targetSceneId]: { url: sourceImage.url, status: "success" }
      }));
    },
    [images]
  );

  const generateVideo = useCallback(
    async (sceneId) => {
      const scene = scenes.find((entry) => entry.id === sceneId);
      const imageUrl = images[sceneId]?.url;

      if (!scene || !imageUrl) {
        return;
      }

      ensureActiveRun();
      setVideos((current) => ({ ...current, [sceneId]: { status: "generating" } }));

      try {
        const videoLengthSeconds = scene.videoLengthSeconds;
        const prompt =
          `Vertical 9:16, ${videoLengthSeconds} seconds, photorealistic UGC selfie video, iPhone front camera. ` +
          `Match the woman from the reference image exactly. She says: "${scene.dialogue}" ${scene.vidPrompt}`;
        const request = createVideoGenerationRequest({
          prompt,
          imageUrl,
          modelId: videoModelId,
          durationSeconds: videoLengthSeconds
        });
        const taskId =
          request.type === "veo"
            ? await createVeo(prompt, [imageUrl], request.body.model)
            : await createJobTask(request.body);

        setVideos((current) => ({
          ...current,
          [sceneId]: {
            status: "polling",
            taskId,
            modelId: videoModelId,
            videoLengthSeconds: request.durationSeconds
          }
        }));
        pollTask(sceneId, taskId, request.pollType);
      } catch (error) {
        setVideos((current) => ({
          ...current,
          [sceneId]: { status: "fail", error: error.message }
        }));
      }
    },
    [ensureActiveRun, images, pollTask, scenes, videoModelId]
  );

  const generateAllRemaining = useCallback(() => {
    scenes.forEach((scene) => {
      const imageState = images[scene.id];
      const shouldGenerate =
        scene.id !== 1 &&
        baseUrl &&
        (!imageState || imageState.status === "idle" || imageState.status === "fail");

      if (shouldGenerate) {
        generateImage(scene.id);
      }
    });
  }, [baseUrl, generateImage, images]);

  const generateAllVideos = useCallback(() => {
    scenes.forEach((scene) => {
      const videoState = videos[scene.id];
      const shouldGenerate =
        images[scene.id]?.status === "approved" &&
        (!videoState || videoState.status === "idle" || videoState.status === "fail");

      if (shouldGenerate) {
        generateVideo(scene.id);
      }
    });
  }, [generateVideo, images, videos]);

  return (
    <div style={{ minHeight: "100vh", color: "#e8e8f0" }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        textarea:focus { outline: none; border-color: #58a6ff !important; }
      `}</style>

      <header
        style={{
          padding: "24px 20px 18px",
          borderBottom: "1px solid #1e1e2e",
          background:
            "linear-gradient(180deg, rgba(18, 18, 28, 0.96), rgba(13, 13, 20, 0.92))"
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 14,
              alignItems: "center",
              marginBottom: 10
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #58a6ff, #a855f7)",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 800,
                color: "#ffffff"
              }}
            >
              P
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#7a7a92", letterSpacing: 1.2 }}>
                IMAGE AND VIDEO PRODUCTION
              </div>
              <h1
                style={{
                  margin: "2px 0 4px",
                  fontSize: "clamp(28px, 5vw, 42px)",
                  lineHeight: 1,
                  letterSpacing: -1.4
                }}
              >
                NAD+ Ad Pipeline
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: 760,
                  color: "#9fa4c6",
                  fontSize: 14
                }}
              >
                Generate a base avatar, lock the face, spin up the remaining scenes,
                then send approved stills into Veo.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              margin: "16px 0",
              flexWrap: "wrap"
            }}
          >
            {scenes.map((scene) => {
              const imageStatus = images[scene.id]?.status || "idle";
              const videoStatus = videos[scene.id]?.status || "idle";
              const color =
                videoStatus === "success"
                  ? "#a855f7"
                  : imageStatus === "approved"
                    ? "#58a6ff"
                    : imageStatus === "success"
                      ? "#34d058"
                      : imageStatus === "generating" || imageStatus === "polling"
                        ? "#ffb800"
                        : imageStatus === "fail"
                          ? "#f85149"
                          : "#44445b";

              return (
                <div
                  key={scene.id}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: color
                    }}
                  />
                  <span style={{ fontSize: 11, color: "#7a7a92" }}>S{scene.id}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!baseUrl && (
              <button
                type="button"
                onClick={() => generateImage(1)}
                disabled={
                  images[1]?.status === "generating" || images[1]?.status === "polling"
                }
                style={buttonStyle("#58a6ff", true)}
              >
                {images[1]?.status === "generating" || images[1]?.status === "polling"
                  ? "Generating S1..."
                  : "1. Generate Base Avatar (S1)"}
              </button>
            )}

            {baseUrl && (
              <button
                type="button"
                onClick={generateAllRemaining}
                style={buttonStyle("#34d058", true)}
              >
                2. Generate All Remaining Scenes
              </button>
            )}

            {allApproved && (
              <button
                type="button"
                onClick={generateAllVideos}
                style={{
                  ...buttonStyle("#a855f7"),
                  color: "#ffffff",
                  background: "#a855f7"
                }}
              >
                3. Generate All Videos
              </button>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center"
            }}
          >
            <label
              htmlFor="video-model-select"
              style={{
                fontSize: 12,
                color: "#9fa4c6",
                fontWeight: 700,
                letterSpacing: 0.2
              }}
            >
              Video Model
            </label>
            <select
              id="video-model-select"
              aria-label="Video model"
              value={videoModelId}
              onChange={(event) => handleVideoModelChange(event.target.value)}
              style={{
                minWidth: 280,
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #2a2a3e",
                background: "#141420",
                color: "#e8e8f0",
                fontSize: 12
              }}
            >
              {VIDEO_MODEL_OPTIONS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.provider} - {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 20px 32px" }}>
        <section
          style={{
            marginBottom: 18,
            padding: 18,
            borderRadius: 18,
            border: "1px solid #242438",
            background: "rgba(16, 16, 24, 0.72)"
          }}
        >
          <button
            type="button"
            onClick={() => setEditSceneId(editSceneId ? null : 1)}
            style={buttonStyle("#666680")}
          >
            {editSceneId ? "Hide Prompts" : "Edit Prompts"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={buttonStyle("#58a6ff")}
          >
            Load Scenes JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Upload Scenes JSON"
            style={{ display: "none" }}
            onChange={handleScenesUpload}
          />

          {importMessage && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background:
                  importMessage.type === "success" ? "rgba(10, 61, 26, 0.45)" : "rgba(61, 10, 10, 0.45)",
                color: importMessage.type === "success" ? "#7ee787" : "#ff9b9b",
                fontSize: 12
              }}
            >
              {importMessage.text}
            </div>
          )}

          {editSceneId && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => setEditSceneId(scene.id)}
                    style={{
                      ...buttonStyle(editSceneId === scene.id ? "#58a6ff" : "#44445b"),
                      background: editSceneId === scene.id ? "#16263a" : "transparent",
                      padding: "6px 10px"
                    }}
                  >
                    S{scene.id} {scene.id === 1 ? "(text2img)" : "(edit)"}
                  </button>
                ))}
              </div>

              {(() => {
                const activeScene = scenes.find((s) => s.id === editSceneId);
                if (!activeScene) return null;

                const fieldStyle = {
                  width: "100%",
                  background: "#1e1e2e",
                  border: "1px solid #2a2a3e",
                  borderRadius: 10,
                  color: "#d0d0e8",
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 12,
                  padding: "10px 12px",
                  resize: "vertical",
                  lineHeight: 1.5,
                  boxSizing: "border-box"
                };

                const labelStyle = {
                  fontSize: 11,
                  color: "#8a8ca6",
                  marginBottom: 4,
                  display: "block"
                };

                const updateScene = (field, value) => {
                  setScenes((current) =>
                    current.map((s) => (s.id === editSceneId ? { ...s, [field]: value } : s))
                  );
                };

                const rebuildImagePrompt = () => {
                  setScenes((current) => {
                    const updated = current.map((s) =>
                      s.id === editSceneId
                        ? { ...s }
                        : s
                    );
                    setPrompts((currentPrompts) => ({
                      ...currentPrompts,
                      ...buildPrompts(
                        updated.filter((s) => s.id === editSceneId),
                        basePrompt
                      )
                    }));
                    return updated;
                  });
                };

                return (
                  <div style={{ display: "grid", gap: 14 }}>
                    {editSceneId === 1 && (
                      <div>
                        <label style={labelStyle}>Base avatar prompt (used to build Scene 1 image prompt):</label>
                        <textarea
                          value={basePrompt}
                          rows={3}
                          onChange={(e) => {
                            setBasePrompt(e.target.value);
                            setPrompts((current) => ({
                              ...current,
                              1: `${e.target.value}${activeScene.setting}. ${activeScene.emotion}.`
                            }));
                          }}
                          style={fieldStyle}
                        />
                        <div style={{ marginTop: 4, fontSize: 10, color: "#5f607a" }}>{basePrompt.length} chars</div>
                      </div>
                    )}

                    <div>
                      <label style={labelStyle}>Dialogue (what she says):</label>
                      <textarea
                        value={activeScene.dialogue}
                        rows={2}
                        onChange={(e) => updateScene("dialogue", e.target.value)}
                        style={fieldStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Setting (outfit + location):</label>
                      <textarea
                        value={activeScene.setting}
                        rows={2}
                        onChange={(e) => {
                          updateScene("setting", e.target.value);
                          setPrompts((current) => {
                            if (editSceneId === 1) {
                              return { ...current, 1: `${basePrompt}${e.target.value}. ${activeScene.emotion}.` };
                            }
                            return {
                              ...current,
                              [editSceneId]:
                                "Keep the exact same woman's face, features, hair color, eye color, and skin tone from the reference image. " +
                                `Change only her outfit and setting to: ${e.target.value}. ` +
                                `Expression: ${activeScene.emotion}. She is mid-sentence, mouth slightly open. ` +
                                "iPhone selfie, vertical 9:16, photorealistic."
                            };
                          });
                        }}
                        style={fieldStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Emotion / expression:</label>
                      <textarea
                        value={activeScene.emotion}
                        rows={2}
                        onChange={(e) => {
                          updateScene("emotion", e.target.value);
                          setPrompts((current) => {
                            if (editSceneId === 1) {
                              return { ...current, 1: `${basePrompt}${activeScene.setting}. ${e.target.value}.` };
                            }
                            return {
                              ...current,
                              [editSceneId]:
                                "Keep the exact same woman's face, features, hair color, eye color, and skin tone from the reference image. " +
                                `Change only her outfit and setting to: ${activeScene.setting}. ` +
                                `Expression: ${e.target.value}. She is mid-sentence, mouth slightly open. ` +
                                "iPhone selfie, vertical 9:16, photorealistic."
                            };
                          });
                        }}
                        style={fieldStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Video motion prompt (how she moves and speaks):</label>
                      <textarea
                        value={activeScene.vidPrompt}
                        rows={3}
                        onChange={(e) => updateScene("vidPrompt", e.target.value)}
                        style={fieldStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>
                        {editSceneId === 1
                          ? "Image generation prompt (auto-built from base prompt + setting + emotion):"
                          : "Image generation prompt (auto-built from setting + emotion):"}
                      </label>
                      <textarea
                        value={prompts[editSceneId] || ""}
                        rows={4}
                        onChange={(event) =>
                          setPrompts((current) => ({
                            ...current,
                            [editSceneId]: event.target.value
                          }))
                        }
                        style={{ ...fieldStyle, borderColor: "#3a3a5e" }}
                      />
                      <div style={{ marginTop: 4, fontSize: 10, color: "#5f607a" }}>
                        {(prompts[editSceneId] || "").length} chars · edit directly or change fields above to auto-rebuild
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        <section
          style={{
            marginBottom: 18,
            padding: 18,
            borderRadius: 18,
            border: "1px solid #242438",
            background: "rgba(16, 16, 24, 0.72)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap"
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: "#f5f7ff" }}>Asset Folders</h2>
              <div style={{ fontSize: 12, color: "#8a8ca6", marginTop: 4 }}>
                Every generation run stays here during this session and can be exported.
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#5f607a" }}>{runs.length} runs</div>
          </div>

          {runs.length === 0 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "#1a1a24",
                color: "#7a7a92",
                fontSize: 12
              }}
            >
              No asset folders yet. Start generating to create your first run.
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {runs.map((run) => {
              const counts = countRunAssets(run);
              const isExpanded = expandedRunIds[run.id];

              return (
                <article
                  key={run.id}
                  style={{
                    border: "1px solid #2a2a3e",
                    borderRadius: 16,
                    background: "rgba(20, 20, 30, 0.9)",
                    padding: 14
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleRunExpanded(run.id)}
                      style={{
                        ...buttonStyle("#d0d0e8"),
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      {run.name}
                    </button>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#8a8ca6" }}>
                        {new Date(run.createdAt).toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, color: "#8a8ca6" }}>
                        {run.scenes.length} scenes
                      </span>
                      <span style={{ fontSize: 11, color: "#8a8ca6" }}>
                        {counts.images} images / {counts.videos} videos
                      </span>
                      <button
                        type="button"
                        onClick={() => exportRun(run)}
                        style={buttonStyle("#58a6ff")}
                      >
                        Export Run
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 12,
                        marginTop: 14
                      }}
                    >
                      {run.scenes.map((scene) => {
                        const asset = run.assets?.[scene.id];

                        return (
                          <section
                            key={`${run.id}_${scene.id}`}
                            style={{
                              padding: 12,
                              borderRadius: 12,
                              background: "#151520",
                              border: "1px solid #242438"
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#f5f7ff" }}>
                              {scene.label}
                            </div>
                            <div style={{ fontSize: 11, color: "#7a7a92", marginTop: 4 }}>
                              Scene {scene.id}
                            </div>

                            {asset?.image?.url && (
                              <img
                                src={asset.image.url}
                                alt={`${run.name} scene ${scene.id}`}
                                style={{
                                  width: "100%",
                                  marginTop: 10,
                                  borderRadius: 10,
                                  display: "block"
                                }}
                              />
                            )}

                            {asset?.video?.url && (
                              <video
                                src={asset.video.url}
                                controls
                                style={{
                                  width: "100%",
                                  marginTop: 10,
                                  borderRadius: 10,
                                  display: "block"
                                }}
                              />
                            )}

                            {!asset?.image?.url && !asset?.video?.url && (
                              <div style={{ fontSize: 11, color: "#5f607a", marginTop: 10 }}>
                                No saved assets yet for this scene.
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16
          }}
        >
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              imageState={images[scene.id]}
              videoState={videos[scene.id]}
              baseUrl={baseUrl}
              videoModelId={videoModelId}
              videoLengthWarning={videoLengthWarnings[scene.id]}
              proposedVideoLength={proposedVideoLengths[scene.id]}
              onChangeVideoLength={handleSceneVideoLengthChange}
              onGenerateImage={generateImage}
              onApproveImage={approveImage}
              onRegenerateImage={generateImage}
              onGenerateVideo={generateVideo}
              availableSourceScenes={scenes
                .filter((s) => s.id !== scene.id && images[s.id]?.url)
                .map((s) => ({ id: s.id, label: s.label }))}
              onReuseImage={(sourceSceneId) => reuseImage(scene.id, sourceSceneId)}
            />
          ))}
        </section>

        <VideoEditor scenes={scenes} videos={videos} onAddScene={addScene} />
      </main>

      <footer
        style={{
          borderTop: "1px solid #1e1e2e",
          padding: "14px 20px 28px",
          color: "#5d627d",
          fontSize: 11
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap"
          }}
        >
          <span>
            Proxy: Cloudflare Worker - kie.ai | Images: Nano Banana 2K 9:16 |
            Videos: KIE selected model 9:16
          </span>
          <span>
            {approvedCount}/{scenes.length} approved | {PROXY}
          </span>
        </div>
      </footer>
    </div>
  );
}
