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

  it("renders the pipeline title and base avatar action", () => {
    render(<App />);

    expect(screen.getByText("NAD+ Ad Pipeline")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate Base Avatar/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /video model/i })).toBeInTheDocument();
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
    expect(screen.getByLabelText(/video length for scene 1/i)).toHaveValue("8");
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

    const lengthSelect = screen.getByLabelText(/video length for scene 1/i);

    expect(lengthSelect).toHaveValue("12");
    expect(screen.queryByText(/requested 12s/i)).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "3s" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "15s" })).toBeInTheDocument();
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

    // The app starts blank with a single "Scene 1" card, which must survive.
    expect(screen.getByRole("heading", { name: "Scene 1" })).toBeInTheDocument();
  });

  it("starts blank with a single editable Scene 1", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Scene 1" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Scene 2" })).not.toBeInTheDocument();
  });

  it("lets the user insert and remove scenes from the editor", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /edit scenes & script/i }));
    // The scene editor's own "+ Add Scene" is the first of two on the page.
    fireEvent.click(screen.getAllByRole("button", { name: /\+ add scene/i })[0]);

    expect(screen.getByRole("heading", { name: "Scene 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /remove scene 2/i }));

    expect(screen.queryByRole("heading", { name: "Scene 2" })).not.toBeInTheDocument();
  });

  it("switches to independent scene mode and swaps the generate action", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: /generate base avatar/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /independent scenes/i }));

    expect(
      screen.getByRole("button", { name: /generate all images/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /generate base avatar/i })
    ).not.toBeInTheDocument();
  });

  it("shows a new run folder after a generated asset is recorded", async () => {
    vi.useFakeTimers();

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

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /generate base avatar/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText(/asset folders/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run 20\d{2}-\d{2}-\d{2}/i })).toBeInTheDocument();
  });

  it("exports a run manifest when export is clicked", async () => {
    vi.useFakeTimers();

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

    render(<App />);
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
    vi.useFakeTimers();

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

    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<App />);

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
