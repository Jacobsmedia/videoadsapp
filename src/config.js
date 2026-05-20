const DEFAULT_PROXY_URL = "https://kie-proxy.jacobsmedia12.workers.dev";

export function getProxyUrl() {
  const configured = import.meta.env.VITE_KIE_PROXY_URL || DEFAULT_PROXY_URL;
  return configured.replace(/\/+$/, "");
}
