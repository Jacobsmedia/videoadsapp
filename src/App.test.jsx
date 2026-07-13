import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  async function seedBaseScene() {
    const file = new File(
      [
        JSON.stringify({
          basePrompt: "Seed base prompt",
          scenes: [
            {
              id: 1,
              label: "Base",
              setting: "Room",
              dialogue: "Hi",
              emotion: "Warm",
              vidPrompt: "She speaks to camera.",
              videoLengthSeconds: 8
            }
          ]
        })
      ],
      "seed.json",
      { type: "application/json" }
    );

    fireEvent.change(screen.getByLabelText(/upload scenes json/i), {
      target: { files: [file] }
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /generate base avatar/i })
      ).toBeInTheDocument()
    );
  }

  it("boots into an empty from-scratch state", () => {
    render(<App />);

    expect(screen.getByText("NAD+ Ad Pipeline")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /video model/i })).toBeInTheDocument();
    expect(screen.getByText(/start a new video from scratch/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate base avatar/i })
    ).not.toBeInTheDocument();
  });

  it("imports scenes from an uploaded scene pack file", async () => {
    render(<App />);

    const pack = JSON.stringify([
      {
        name: "Hook",
        timeRange: "0:00-0:08",
        duration: 8,
        still: { type: "text", prompt: "Base still, vertical 9:16." },
        motionPrompt: "She leans in.",
        voLine: "Calling all women over 40..."
      },
      {
        name: "Reveal",
        timeRange: "0:08-0:18",
        duration: 10,
        still: { type: "edit", prompt: "Same woman, reclined on couch." },
        motionPrompt: "She whispers.",
        voLine: "Here's what nobody tells you."
      }
    ]);

    const file = new File([pack], "pack.json", { type: "application/json" });

    fireEvent.change(screen.getByLabelText(/upload scene pack json/i), {
      target: { files: [file] }
    });

    await waitFor(() => expect(screen.getByText("Hook")).toBeInTheDocument());
    expect(screen.getByText("Reveal")).toBeInTheDocument();
    // Imported scenes get the same per-scene controls as authored ones.
    expect(
      screen.getByRole("button", { name: /generate base avatar/i })
    ).toBeInTheDocument();
  });

  it("loads a valid scenes json file and replaces the visible pipeline", async () => {
    render(<App />);

    const file = new File(
      [
        JSON.stringify({
          basePrompt: "Uploaded base prompt",
          scenes: [
            {
              id: 1,
              label: "Uploaded Hook",
              setting: "Studio",
              dialogue: "New dialogue",
              emotion: "Direct",
              vidPrompt: "She speaks to camera.",
              videoLengthSeconds: 10
            }
          ]
        })
      ],
      "scenes.json",
      { type: "application/json" }
    );

    fireEvent.click(screen.getByText(/load scenes json/i));
    fireEvent.change(screen.getByLabelText(/upload scenes json/i), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText("Uploaded Hook")).toBeInTheDocument();
    });

    expect(screen.getByText(/loaded 1 scenes from scenes\.json/i)).toBeInTheDocument();
    expect(screen.getByText(/requested 10s/i)).toBeInTheDocument();
    // Veo supports a single length, so the scene clamps to a fixed 8s.
    expect(screen.getByText(/fixed at 8s for this model/i)).toBeInTheDocument();
  });

  it("shows a scrollable range of length options for Kling 3.0 and keeps a valid imported value", async () => {
    render(<App />);

    fireEvent.change(screen.getByRole("combobox", { name: /video model/i }), {
      target: { value: "kling-3.0/video" }
    });

    const file = new File(
      [
        JSON.stringify({
          basePrompt: "Uploaded base prompt",
          scenes: [
            {
              id: 1,
              label: "Uploaded Hook",
              setting: "Studio",
              dialogue: "New dialogue",
              emotion: "Direct",
              vidPrompt: "She speaks to camera.",
              videoLengthSeconds: 12
            }
          ]
        })
      ],
      "kling-scenes.json",
      { type: "application/json" }
    );

    fireEvent.click(screen.getByText(/load scenes json/i));
    fireEvent.change(screen.getByLabelText(/upload scenes json/i), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText("Uploaded Hook")).toBeInTheDocument();
    });

    // Kling 3.0 supports a wide range, rendered as a slider spanning 3s–15s.
    const lengthSlider = screen.getByLabelText(/video length for scene 1/i);

    expect(lengthSlider).toHaveValue("12");
    expect(screen.queryByText(/requested 12s/i)).not.toBeInTheDocument();
    expect(lengthSlider).toHaveAttribute("min", "3");
    expect(lengthSlider).toHaveAttribute("max", "15");
  });

  it("shows a validation error for an invalid upload and keeps the current scenes", async () => {
    render(<App />);

    const file = new File(
      [JSON.stringify({ basePrompt: "Broken", scenes: [{ id: 1 }] })],
      "broken.json",
      { type: "application/json" }
    );

    fireEvent.click(screen.getByText(/load scenes json/i));
    fireEvent.change(screen.getByLabelText(/upload scenes json/i), {
      target: { files: [file] }
    });

    await waitFor(() => {
      expect(screen.getByText(/scene 1 is missing "label"/i)).toBeInTheDocument();
    });

    // A rejected upload changes nothing — the from-scratch state stays.
    expect(screen.getByText(/start a new video from scratch/i)).toBeInTheDocument();
  });

  it("shows a new run folder after a generated asset is recorded", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { taskId: "task_1" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            state: "success",
            resultJson: JSON.stringify({ resultUrls: ["https://cdn.example.com/scene-1.png"] })
          }
        })
      });

    render(<App />);
    await seedBaseScene();

    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: /generate base avatar/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText(/asset folders/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run 20\d{2}-\d{2}-\d{2}/i })).toBeInTheDocument();
  });

  it("exports a run manifest when export is clicked", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { taskId: "task_1" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            state: "success",
            resultJson: JSON.stringify({ resultUrls: ["https://cdn.example.com/scene-1.png"] })
          }
        })
      });

    const createObjectURL = vi.fn(() => "blob:run-export");
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);

    render(<App />);
    await seedBaseScene();

    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        return {
          click: clickSpy,
          set href(value) {
            this._href = value;
          },
          set download(value) {
            this._download = value;
          }
        };
      }

      return originalCreateElement(tagName);
    });

    fireEvent.click(screen.getByRole("button", { name: /generate base avatar/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    fireEvent.click(screen.getByRole("button", { name: /export run/i }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:run-export");
  });

  it("shows completed KIE video assets in the scene after a non-Veo job finishes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { taskId: "img_task_1" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            state: "success",
            resultJson: JSON.stringify({ resultUrls: ["https://cdn.example.com/scene-1.png"] })
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { taskId: "video_task_1" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            state: "success",
            resultJson: JSON.stringify({
              videos: [{ url: "https://cdn.example.com/scene-1.mp4" }]
            })
          }
        })
      });

    const { container } = render(<App />);
    await seedBaseScene();

    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.change(screen.getByRole("combobox", { name: /video model/i }), {
      target: { value: "wan/2-6-image-to-video" }
    });

    fireEvent.click(screen.getByRole("button", { name: /generate base avatar/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate video/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({
      model: "wan/2-6-image-to-video",
      input: {
        duration: "5"
      }
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(
      container.querySelector('video[src="https://cdn.example.com/scene-1.mp4"]')
    ).not.toBeNull();
  });
});
