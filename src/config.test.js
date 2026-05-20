import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getProxyUrl", () => {
  it("trims a trailing slash from the configured worker URL", async () => {
    vi.stubEnv("VITE_KIE_PROXY_URL", "https://kie-proxy.jacobsmedia12.workers.dev/");
    const { getProxyUrl } = await import("./config.js");

    expect(getProxyUrl()).toBe("https://kie-proxy.jacobsmedia12.workers.dev");
  });
});
