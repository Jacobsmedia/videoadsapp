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
              vidPrompt: "She speaks to camera."
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

    expect(screen.getByText("Hook - Energetic Opening")).toBeInTheDocument();
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
});
