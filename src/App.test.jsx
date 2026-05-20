import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  it("renders the pipeline title and base avatar action", () => {
    render(<App />);

    expect(screen.getByText("NAD+ Ad Pipeline")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate Base Avatar/i })
    ).toBeInTheDocument();
  });
});
