const DEFAULT_PROXY_URL = "https://kie-proxy.jacobsmedia12.workers.dev";

function normalizeBaseUrl(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\/+$/, "");
}

export function getProxyUrl() {
  const configured = import.meta.env.VITE_KIE_PROXY_URL || DEFAULT_PROXY_URL;
  return normalizeBaseUrl(configured);
}

export function getAssetPublicBaseUrl() {
  return normalizeBaseUrl(import.meta.env.VITE_ASSET_PUBLIC_BASE_URL);
}

export function getAssetSignerPath() {
  const configured = import.meta.env.VITE_ASSET_SIGNER_PATH;
  if (!configured || typeof configured !== "string") {
    return "";
  }

  const trimmed = configured.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
