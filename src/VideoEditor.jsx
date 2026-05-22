import { useState, useRef, useCallback, useEffect } from "react";

function btnStyle(color = "#58a6ff", small = false) {
  return {
    padding: small ? "6px 12px" : "9px 18px",
    borderRadius: 10,
    border: "none",
    background: color,
    color: "#fff",
    fontSize: small ? 11 : 13,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.3,
    transition: "opacity 0.15s, transform 0.15s"
  };
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ─── Caption style presets ────────────────────────────────────────────────────

const CAPTION_STYLES = [
  {
    id: "pill",
    name: "Pill",
    desc: "Dark bubble — TikTok / Reels"
  },
  {
    id: "shadow",
    name: "Bold Shadow",
    desc: "White text + deep shadow"
  },
  {
    id: "highlight",
    name: "Highlight",
    desc: "Colour pop — YouTube Shorts"
  },
  {
    id: "neon",
    name: "Neon Glow",
    desc: "Glowing text — trending social"
  },
  {
    id: "bar",
    name: "Cinematic Bar",
    desc: "Full-width bar — classic ads"
  }
];

// Returns CSS styles for the draggable caption div in the preview player
function getCaptionCSSStyle(styleId) {
  const base = {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "sans-serif",
    lineHeight: 1.4,
    textAlign: "center",
    maxWidth: 260,
    padding: "6px 12px",
    borderRadius: 8,
    wordBreak: "break-word",
    display: "inline-block",
    cursor: "grab",
    userSelect: "none",
    pointerEvents: "auto",
    boxSizing: "border-box"
  };
  switch (styleId) {
    case "pill":
      return { ...base, background: "rgba(0,0,0,0.65)", color: "#fff" };
    case "shadow":
      return {
        ...base,
        background: "transparent",
        color: "#fff",
        textShadow:
          "2px 2px 5px rgba(0,0,0,1), -1px -1px 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8)",
        padding: "4px 8px"
      };
    case "highlight":
      return {
        ...base,
        background: "#FFE600",
        color: "#111",
        borderRadius: 4,
        padding: "4px 10px"
      };
    case "neon":
      return {
        ...base,
        background: "transparent",
        color: "#fff",
        textShadow:
          "0 0 8px #a855f7, 0 0 16px #a855f7, 0 0 28px #ec4899",
        padding: "4px 8px"
      };
    case "bar":
      return {
        ...base,
        background: "rgba(0,0,0,0.82)",
        color: "#fff",
        borderRadius: 0,
        maxWidth: "none",
        width: "100%",
        padding: "10px 16px"
      };
    default:
      return base;
  }
}

// Draws a caption onto an already-configured canvas context
function drawCaptionOnCanvas(ctx, text, styleId, position, W, H) {
  if (!text?.trim()) return;

  const { xPct, yPct } = position;
  // Bar style is always horizontally centred
  const cx = styleId === "bar" ? W / 2 : (xPct / 100) * W;
  const cy = (yPct / 100) * H;

  const fontSize = Math.round(W * 0.048);
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  const lineHeight = fontSize * 1.35;
  const maxTextWidth = styleId === "bar" ? W - 40 : W - 60;
  const lines = wrapLines(ctx, text.trim(), maxTextWidth);
  const totalTextH = lines.length * lineHeight;
  // Baseline of first line, vertically centred on cy
  const startY = cy - totalTextH / 2 + fontSize * 0.85;

  ctx.save();

  switch (styleId) {
    case "pill": {
      const maxLW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const boxW = Math.min(W - 20, maxLW + 40);
      const boxH = totalTextH + 24;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath();
      ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 12);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;
      lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight));
      break;
    }
    case "shadow": {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.95)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      // Double-draw for denser shadow
      lines.forEach((line, i) => {
        ctx.fillText(line, cx, startY + i * lineHeight);
        ctx.fillText(line, cx, startY + i * lineHeight);
      });
      break;
    }
    case "highlight": {
      const pad = 10;
      lines.forEach((line, i) => {
        const lw = ctx.measureText(line).width + pad * 2;
        const ly = startY + i * lineHeight;
        ctx.fillStyle = "#FFE600";
        ctx.beginPath();
        ctx.roundRect(cx - lw / 2, ly - fontSize * 0.85, lw, fontSize * 1.25, 4);
        ctx.fill();
        ctx.fillStyle = "#111111";
        ctx.fillText(line, cx, ly);
      });
      break;
    }
    case "neon": {
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 20;
      lines.forEach((line, i) => {
        ctx.fillText(line, cx, startY + i * lineHeight);
        ctx.fillText(line, cx, startY + i * lineHeight);
      });
      break;
    }
    case "bar": {
      const barH = totalTextH + 32;
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      ctx.fillRect(0, cy - barH / 2, W, barH);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 2;
      lines.forEach((line, i) => ctx.fillText(line, cx, startY + i * lineHeight));
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

// ─── Add-scene form default ───────────────────────────────────────────────────

const EMPTY_SCENE_FORM = {
  label: "",
  dialogue: "",
  setting: "",
  emotion: "",
  vidPrompt: "",
  videoLengthSeconds: 8
};

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoEditor({ scenes, videos, onAddScene }) {
  const completedScenes = scenes.filter(
    (s) => videos[s.id]?.status === "success" && videos[s.id]?.url
  );

  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionTexts, setCaptionTexts] = useState(() =>
    Object.fromEntries(scenes.map((s) => [s.id, s.dialogue]))
  );
  const [captionStyle, setCaptionStyle] = useState("pill");
  // Per-scene position as percentage {xPct, yPct}, default middle centre
  const [captionPositions, setCaptionPositions] = useState({});

  const [editingCaptionId, setEditingCaptionId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState("");
  const [mergeError, setMergeError] = useState(null);
  const [mergeUrl, setMergeUrl] = useState(null);
  const [showAddScene, setShowAddScene] = useState(false);
  const [newScene, setNewScene] = useState(EMPTY_SCENE_FORM);

  const videoRef = useRef(null);
  const previewContainerRef = useRef(null);
  const dragRef = useRef(null);
  // Keep a live ref to captionStyle for the drag closure
  const captionStyleRef = useRef(captionStyle);
  useEffect(() => { captionStyleRef.current = captionStyle; }, [captionStyle]);

  // Keep caption texts in sync when scenes change
  useEffect(() => {
    setCaptionTexts((prev) => {
      const next = { ...prev };
      scenes.forEach((s) => {
        if (!(s.id in next)) next[s.id] = s.dialogue;
      });
      return next;
    });
  }, [scenes]);

  // ── Playback ──────────────────────────────────────────────────────────────

  const playScene = useCallback(
    (index) => {
      if (index >= completedScenes.length) {
        setCurrentIndex(null);
        setIsPlaying(false);
        return;
      }
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [completedScenes.length]
  );

  useEffect(() => {
    if (currentIndex === null || !videoRef.current) return;
    const vid = videoRef.current;
    vid.src = videos[completedScenes[currentIndex].id].url;
    vid.load();
    vid.play().catch(() => {});
  }, [currentIndex, completedScenes, videos]);

  const handleVideoEnded = useCallback(() => {
    playScene((currentIndex ?? 0) + 1);
  }, [currentIndex, playScene]);

  // ── Caption dragging ──────────────────────────────────────────────────────

  const getPos = useCallback(
    (sceneId) => captionPositions[sceneId] ?? { xPct: 50, yPct: 50 },
    [captionPositions]
  );

  const handleCaptionPointerDown = useCallback(
    (e, sceneId) => {
      e.preventDefault();
      e.stopPropagation();
      const container = previewContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pos = captionPositions[sceneId] ?? { xPct: 50, yPct: 50 };

      dragRef.current = {
        sceneId,
        rect,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startXPct: pos.xPct,
        startYPct: pos.yPct
      };

      const onMove = (ev) => {
        if (!dragRef.current) return;
        const { rect, startMouseX, startMouseY, startXPct, startYPct, sceneId } =
          dragRef.current;
        const dxPct = ((ev.clientX - startMouseX) / rect.width) * 100;
        const dyPct = ((ev.clientY - startMouseY) / rect.height) * 100;
        const isBar = captionStyleRef.current === "bar";
        const newXPct = isBar ? 50 : Math.max(5, Math.min(95, startXPct + dxPct));
        const newYPct = Math.max(5, Math.min(95, startYPct + dyPct));
        setCaptionPositions((prev) => ({
          ...prev,
          [sceneId]: { xPct: newXPct, yPct: newYPct }
        }));
      };

      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [captionPositions]
  );

  // ── Merge & export ────────────────────────────────────────────────────────

  const mergeVideos = useCallback(async () => {
    setMerging(true);
    setMergeError(null);
    setMergeUrl(null);
    setMergeProgress("Preparing canvas…");

    try {
      const W = 540;
      const H = 960;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const stream = canvas.captureStream(30);

      const mimeType = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find(
        (t) => MediaRecorder.isTypeSupported(t)
      );
      if (!mimeType) throw new Error("No supported video recording format in this browser.");

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (e) => reject(new Error(e.error?.message || "Recording failed"));
      });

      recorder.start(100);

      for (let i = 0; i < completedScenes.length; i++) {
        const scene = completedScenes[i];
        setMergeProgress(`Rendering scene ${i + 1} / ${completedScenes.length} — ${scene.label}`);

        await new Promise((resolve, reject) => {
          const vid = document.createElement("video");
          vid.crossOrigin = "anonymous";
          vid.playsInline = true;
          vid.muted = true;
          vid.src = videos[scene.id].url;

          let rafId;
          let settled = false;

          const settle = () => {
            if (settled) return;
            settled = true;
            cancelAnimationFrame(rafId);
            resolve();
          };

          const drawFrame = () => {
            if (vid.paused || vid.ended) {
              settle();
              return;
            }

            ctx.drawImage(vid, 0, 0, W, H);

            if (captionsEnabled && captionTexts[scene.id]?.trim()) {
              const pos = captionPositions[scene.id] ?? { xPct: 50, yPct: 50 };
              drawCaptionOnCanvas(
                ctx,
                captionTexts[scene.id],
                captionStyle,
                pos,
                W,
                H
              );
            }

            rafId = requestAnimationFrame(drawFrame);
          };

          vid.oncanplay = () => {
            vid.play().then(() => {
              rafId = requestAnimationFrame(drawFrame);
            }, reject);
          };

          vid.onended = settle;

          vid.onerror = () => {
            reject(
              new Error(
                `Scene ${scene.id}: video failed to load. ` +
                  "This is often a CORS restriction — the video server must allow cross-origin access."
              )
            );
          };
        });
      }

      recorder.stop();
      setMergeProgress("Finalising file…");
      await recordingDone;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setMergeUrl(url);
      setMergeProgress("Merge complete!");
    } catch (err) {
      setMergeError(err.message);
    } finally {
      setMerging(false);
    }
  }, [completedScenes, videos, captionsEnabled, captionTexts, captionStyle, captionPositions]);

  // ── Add scene ─────────────────────────────────────────────────────────────

  const handleAddSceneSubmit = useCallback(() => {
    if (!newScene.label.trim()) return;
    onAddScene?.({
      label: newScene.label.trim(),
      dialogue: newScene.dialogue.trim(),
      setting: newScene.setting.trim(),
      emotion: newScene.emotion.trim(),
      vidPrompt: newScene.vidPrompt.trim(),
      videoLengthSeconds: Number(newScene.videoLengthSeconds) || 8
    });
    setNewScene(EMPTY_SCENE_FORM);
    setShowAddScene(false);
  }, [newScene, onAddScene]);

  const currentScene = currentIndex !== null ? completedScenes[currentIndex] : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section
      style={{
        background: "rgba(16, 16, 28, 0.92)",
        borderRadius: 20,
        padding: "28px 24px",
        border: "1px solid #2a2a42",
        backdropFilter: "blur(12px)"
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #a855f7, #ec4899)",
            display: "grid",
            placeItems: "center",
            fontSize: 16
          }}
        >
          🎬
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: "#6d6d88",
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: "uppercase"
            }}
          >
            Post-Production
          </div>
          <h2 style={{ margin: 0, fontSize: 20, color: "#f5f7ff" }}>Video Editor</h2>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#7a7a92" }}>
            {completedScenes.length} of {scenes.length} scenes ready
          </span>
          {onAddScene && (
            <button
              type="button"
              onClick={() => setShowAddScene((v) => !v)}
              style={btnStyle(
                showAddScene ? "#444466" : "linear-gradient(135deg, #a855f7, #ec4899)",
                true
              )}
            >
              {showAddScene ? "✕ Cancel" : "+ Add Scene"}
            </button>
          )}
        </div>
      </div>

      {/* ── Add scene form ── */}
      {showAddScene && onAddScene && (
        <div
          style={{
            marginBottom: 24,
            padding: "18px 20px",
            background: "#0e0e1c",
            borderRadius: 16,
            border: "1px solid #a855f740"
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#a855f7",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 14
            }}
          >
            New Scene
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { key: "label", label: "Scene Label *", placeholder: "e.g. Hook - Energetic Opening" },
              { key: "emotion", label: "Emotion / Direction", placeholder: "e.g. Energetic, confident" },
              { key: "setting", label: "Setting", placeholder: "e.g. Bright living room, mint top" },
              { key: "videoLengthSeconds", label: "Length (seconds)", placeholder: "8", type: "number" }
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: "#7a7a92", marginBottom: 4, fontWeight: 600 }}>
                  {label}
                </div>
                <input
                  type={type || "text"}
                  value={newScene[key]}
                  onChange={(e) => setNewScene((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#151524",
                    border: "1px solid #242438",
                    borderRadius: 8,
                    color: "#e8e8f0",
                    fontSize: 12,
                    padding: "8px 10px",
                    fontFamily: "inherit",
                    outline: "none"
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#7a7a92", marginBottom: 4, fontWeight: 600 }}>
              Dialogue / Caption
            </div>
            <textarea
              value={newScene.dialogue}
              onChange={(e) => setNewScene((prev) => ({ ...prev, dialogue: e.target.value }))}
              placeholder="What the person says in this scene…"
              rows={2}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#151524",
                border: "1px solid #242438",
                borderRadius: 8,
                color: "#e8e8f0",
                fontSize: 12,
                padding: "8px 10px",
                resize: "vertical",
                fontFamily: "inherit",
                outline: "none"
              }}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#7a7a92", marginBottom: 4, fontWeight: 600 }}>
              Video Prompt
            </div>
            <textarea
              value={newScene.vidPrompt}
              onChange={(e) => setNewScene((prev) => ({ ...prev, vidPrompt: e.target.value }))}
              placeholder="Describe the video motion, camera style, audio…"
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#151524",
                border: "1px solid #242438",
                borderRadius: 8,
                color: "#e8e8f0",
                fontSize: 12,
                padding: "8px 10px",
                resize: "vertical",
                fontFamily: "inherit",
                outline: "none"
              }}
            />
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleAddSceneSubmit}
              disabled={!newScene.label.trim()}
              style={{
                ...btnStyle("linear-gradient(135deg, #a855f7, #ec4899)"),
                opacity: newScene.label.trim() ? 1 : 0.45
              }}
            >
              Add Scene to Pipeline
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddScene(false);
                setNewScene(EMPTY_SCENE_FORM);
              }}
              style={btnStyle("#444466", true)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {completedScenes.length === 0 && (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            color: "#5f607a",
            fontSize: 13,
            background: "#0e0e1c",
            borderRadius: 16,
            border: "1px dashed #242438",
            marginBottom: 24
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>🎞️</div>
          <div style={{ fontWeight: 600, color: "#7a7a92", marginBottom: 6 }}>
            No videos ready yet
          </div>
          <div>
            Generate and approve scene videos above — they'll appear here for editing and export.
          </div>
        </div>
      )}

      {/* ── Caption controls (only when videos exist) ── */}
      {completedScenes.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap"
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={captionsEnabled}
                onChange={(e) => setCaptionsEnabled(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#a855f7", cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, color: "#d2d2e8", fontWeight: 600 }}>
                Captions (dialogue overlay)
              </span>
            </label>
            {captionsEnabled && (
              <span style={{ fontSize: 11, color: "#7a7a92" }}>
                Click a scene caption to edit text · drag caption in preview to reposition
              </span>
            )}
          </div>

          {/* ── Caption style picker ── */}
          {captionsEnabled && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#6d6d88",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 10
                }}
              >
                Caption Style
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {CAPTION_STYLES.map((s) => {
                  const selected = captionStyle === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCaptionStyle(s.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: selected ? "2px solid #a855f7" : "2px solid #242438",
                        background: selected ? "rgba(168,85,247,0.12)" : "#0e0e1c",
                        cursor: "pointer",
                        textAlign: "left",
                        minWidth: 120,
                        transition: "border-color 0.15s, background 0.15s"
                      }}
                    >
                      {/* Miniature preview */}
                      <div
                        style={{
                          marginBottom: 8,
                          height: 36,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#1a1a2e",
                          borderRadius: 6,
                          overflow: "hidden",
                          position: "relative"
                        }}
                      >
                        {s.id === "bar" && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: "rgba(0,0,0,0.82)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>
                              Sample Caption
                            </span>
                          </div>
                        )}
                        {s.id === "pill" && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#fff",
                              background: "rgba(0,0,0,0.65)",
                              borderRadius: 6,
                              padding: "2px 8px"
                            }}
                          >
                            Sample Caption
                          </span>
                        )}
                        {s.id === "shadow" && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#fff",
                              textShadow: "1px 1px 3px #000, -1px -1px 3px #000"
                            }}
                          >
                            Sample Caption
                          </span>
                        )}
                        {s.id === "highlight" && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#111",
                              background: "#FFE600",
                              borderRadius: 3,
                              padding: "2px 6px"
                            }}
                          >
                            Sample Caption
                          </span>
                        )}
                        {s.id === "neon" && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#fff",
                              textShadow:
                                "0 0 6px #a855f7, 0 0 12px #a855f7, 0 0 20px #ec4899"
                            }}
                          >
                            Sample Caption
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: selected ? "#d4a7ff" : "#c0c0d8"
                        }}
                      >
                        {s.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#5f607a", marginTop: 2 }}>
                        {s.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Scene list ── */}
      {completedScenes.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
            marginBottom: 24
          }}
        >
          {completedScenes.map((scene, idx) => {
            const isEditing = editingCaptionId === scene.id;
            const isActive = currentIndex === idx;

            return (
              <div
                key={scene.id}
                style={{
                  borderRadius: 14,
                  background: isActive ? "rgba(168, 85, 247, 0.12)" : "#151524",
                  border: isActive ? "1px solid #a855f7" : "1px solid #242438",
                  padding: "14px 14px 10px",
                  transition: "border-color 0.2s, background 0.2s"
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#6d6d88",
                    fontWeight: 700,
                    letterSpacing: 1.1,
                    textTransform: "uppercase",
                    marginBottom: 4
                  }}
                >
                  Scene {scene.id}
                </div>
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 10 }}
                >
                  {scene.label}
                </div>

                <video
                  src={videos[scene.id].url}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    display: "block",
                    marginBottom: captionsEnabled ? 10 : 0
                  }}
                  muted
                  playsInline
                  preload="metadata"
                />

                {captionsEnabled && (
                  <div>
                    {isEditing ? (
                      <textarea
                        value={captionTexts[scene.id] ?? ""}
                        onChange={(e) =>
                          setCaptionTexts((prev) => ({ ...prev, [scene.id]: e.target.value }))
                        }
                        onBlur={() => setEditingCaptionId(null)}
                        autoFocus
                        rows={3}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          background: "#0e0e1c",
                          border: "1px solid #a855f7",
                          borderRadius: 8,
                          color: "#e8e8f0",
                          fontSize: 12,
                          padding: "8px 10px",
                          resize: "vertical",
                          fontFamily: "inherit"
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCaptionId(scene.id)}
                        title="Click to edit caption"
                        style={{
                          fontSize: 11,
                          color: "#b0b0cc",
                          fontStyle: "italic",
                          padding: "6px 8px",
                          background: "#0e0e1c",
                          borderRadius: 8,
                          border: "1px solid #242438",
                          cursor: "text",
                          lineHeight: 1.5,
                          minHeight: 36
                        }}
                      >
                        {captionTexts[scene.id] || (
                          <span style={{ color: "#5f607a" }}>No caption — click to add</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Preview player ── */}
      {completedScenes.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            padding: "18px 20px",
            background: "#0e0e1c",
            borderRadius: 16,
            border: "1px solid #1e1e34"
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#6d6d88",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 12
            }}
          >
            Preview Player
            {captionsEnabled && isPlaying && currentScene && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 9,
                  color: "#a855f7",
                  fontWeight: 600,
                  letterSpacing: 0.5
                }}
              >
                · drag caption to reposition
              </span>
            )}
          </div>

          {isPlaying && currentScene ? (
            <>
              <div
                ref={previewContainerRef}
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "100%",
                  maxWidth: 320
                }}
              >
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  onEnded={handleVideoEnded}
                  style={{ width: "100%", borderRadius: 12, display: "block" }}
                />

                {captionsEnabled && captionTexts[currentScene.id]?.trim() && (() => {
                  const pos = getPos(currentScene.id);
                  const isBar = captionStyle === "bar";
                  return (
                    <div
                      style={{
                        position: "absolute",
                        left: isBar ? 0 : `${pos.xPct}%`,
                        top: `${pos.yPct}%`,
                        transform: isBar ? "translateY(-50%)" : "translate(-50%, -50%)",
                        width: isBar ? "100%" : undefined,
                        zIndex: 10
                      }}
                    >
                      <div
                        onMouseDown={(e) => handleCaptionPointerDown(e, currentScene.id)}
                        style={getCaptionCSSStyle(captionStyle)}
                      >
                        {captionTexts[currentScene.id]}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div
                style={{ marginTop: 8, fontSize: 12, color: "#9a9ab5" }}
              >
                Scene {currentScene.id} / {completedScenes.length} — {currentScene.label}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => playScene(0)}
                style={btnStyle("#58a6ff")}
              >
                ▶ Play All Scenes
              </button>
              {completedScenes.map((scene, idx) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => playScene(idx)}
                  style={btnStyle("#2a2a42", true)}
                >
                  Scene {scene.id}
                </button>
              ))}
            </div>
          )}

          {isPlaying && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIndex(null);
                }}
                style={btnStyle("#444466", true)}
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Merge & Export ── */}
      {completedScenes.length > 0 && (
        <div
          style={{
            padding: "18px 20px",
            background: "#0e0e1c",
            borderRadius: 16,
            border: "1px solid #1e1e34"
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#6d6d88",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 10
            }}
          >
            Merge &amp; Export
          </div>

          <div style={{ fontSize: 12, color: "#7a7a92", marginBottom: 14, lineHeight: 1.6 }}>
            Renders all {completedScenes.length} scenes onto a canvas
            {captionsEnabled
              ? ` with ${CAPTION_STYLES.find((s) => s.id === captionStyle)?.name} captions burned in`
              : ""}
            {" "}and exports as a single video file.{" "}
            <strong style={{ color: "#ffcb52" }}>Note:</strong> audio from the original videos is
            not included (browser limitation for cross-origin clips).
          </div>

          {!merging && !mergeUrl && (
            <button
              type="button"
              onClick={mergeVideos}
              style={btnStyle("linear-gradient(135deg, #a855f7, #ec4899)")}
            >
              Merge All &amp; Download
            </button>
          )}

          {merging && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid #a855f7",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite"
                }}
              />
              <span style={{ fontSize: 12, color: "#b0b0cc" }}>{mergeProgress}</span>
            </div>
          )}

          {mergeError && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#f85149",
                  marginBottom: 10,
                  padding: "10px 12px",
                  background: "#2d0f0f",
                  borderRadius: 10
                }}
              >
                {mergeError}
              </div>
              <button type="button" onClick={mergeVideos} style={btnStyle("#a855f7", true)}>
                Retry
              </button>
            </div>
          )}

          {mergeUrl && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#34d058", fontWeight: 600 }}>
                ✓ {mergeProgress}
              </span>
              <a
                href={mergeUrl}
                download="merged-video.webm"
                style={{
                  ...btnStyle("#34d058"),
                  textDecoration: "none",
                  display: "inline-block"
                }}
              >
                Download Merged Video
              </a>
              <button
                type="button"
                onClick={() => {
                  setMergeUrl(null);
                  setMergeProgress("");
                }}
                style={btnStyle("#444466", true)}
              >
                Re-merge
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
