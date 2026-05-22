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

export function VideoEditor({ scenes, videos }) {
  const completedScenes = scenes.filter(
    (s) => videos[s.id]?.status === "success" && videos[s.id]?.url
  );

  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionTexts, setCaptionTexts] = useState(() =>
    Object.fromEntries(scenes.map((s) => [s.id, s.dialogue]))
  );
  const [editingCaptionId, setEditingCaptionId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState("");
  const [mergeError, setMergeError] = useState(null);
  const [mergeUrl, setMergeUrl] = useState(null);

  const videoRef = useRef(null);

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

  const mergeVideos = useCallback(async () => {
    setMerging(true);
    setMergeError(null);
    setMergeUrl(null);
    setMergeProgress("Preparing canvas…");

    try {
      // 9:16 portrait at 540×960 for reasonable file size
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
          vid.muted = true; // canvas stream can't capture audio from crossOrigin videos easily
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
              const text = captionTexts[scene.id].trim();
              const fontSize = Math.round(W * 0.048);
              ctx.font = `bold ${fontSize}px sans-serif`;
              ctx.textAlign = "center";
              const lineHeight = fontSize * 1.4;
              const maxTextWidth = W - 40;
              const lines = wrapLines(ctx, text, maxTextWidth);

              const boxH = lines.length * lineHeight + 24;
              const boxY = H - boxH - 32;

              ctx.fillStyle = "rgba(0,0,0,0.62)";
              ctx.beginPath();
              ctx.roundRect(10, boxY - 4, W - 20, boxH + 8, 8);
              ctx.fill();

              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "rgba(0,0,0,0.8)";
              ctx.shadowBlur = 4;
              lines.forEach((line, li) => {
                ctx.fillText(line, W / 2, boxY + li * lineHeight + fontSize);
              });
              ctx.shadowBlur = 0;
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

      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setMergeUrl(url);
      setMergeProgress("Merge complete!");
    } catch (err) {
      setMergeError(err.message);
    } finally {
      setMerging(false);
    }
  }, [completedScenes, videos, captionsEnabled, captionTexts]);

  if (completedScenes.length === 0) return null;

  const currentScene = currentIndex !== null ? completedScenes[currentIndex] : null;

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 24
        }}
      >
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
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#7a7a92" }}>
          {completedScenes.length} of {scenes.length} scenes ready
        </div>
      </div>

      {/* Caption controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap"
        }}
      >
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
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
            Click a caption below to edit the text
          </span>
        )}
      </div>

      {/* Scene list */}
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

      {/* Preview player */}
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
        </div>

        {isPlaying && currentScene ? (
          <div style={{ position: "relative", display: "inline-block", width: "100%", maxWidth: 320 }}>
            <video
              ref={videoRef}
              controls
              playsInline
              onEnded={handleVideoEnded}
              style={{ width: "100%", borderRadius: 12, display: "block" }}
            />
            {captionsEnabled && captionTexts[currentScene.id]?.trim() && (
              <div
                style={{
                  position: "absolute",
                  bottom: 44,
                  left: 0,
                  right: 0,
                  padding: "8px 14px",
                  background: "rgba(0,0,0,0.68)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "center",
                  lineHeight: 1.5,
                  borderRadius: "0 0 10px 10px",
                  pointerEvents: "none"
                }}
              >
                {captionTexts[currentScene.id]}
              </div>
            )}
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#9a9ab5",
                textAlign: "center"
              }}
            >
              Scene {currentScene.id} / {completedScenes.length} — {currentScene.label}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => playScene(0)} style={btnStyle("#58a6ff")}>
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

      {/* Merge & Download */}
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
          Renders all {completedScenes.length} scenes onto a canvas{captionsEnabled ? " with captions burned in" : ""}
          {" "}and exports as a single video file.{" "}
          <strong style={{ color: "#ffcb52" }}>Note:</strong> audio from the original videos is not
          included (browser limitation for cross-origin clips).
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
            <button
              type="button"
              onClick={mergeVideos}
              style={btnStyle("#a855f7", true)}
            >
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
