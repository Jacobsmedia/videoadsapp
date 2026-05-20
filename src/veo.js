export function getVeoTaskStatusPath(taskId) {
  return `/api/v1/veo/record-info?taskId=${encodeURIComponent(taskId)}`;
}

export function getVeo1080pPath(taskId) {
  return `/api/v1/veo/get-1080p-video?taskId=${encodeURIComponent(taskId)}`;
}

export function getVeoTaskOutcome(result) {
  const successFlag =
    typeof result?.successFlag === "number"
      ? result.successFlag
      : Number.parseInt(result?.successFlag ?? "", 10);

  if (successFlag === 1) {
    return "success";
  }

  if (successFlag === 2 || successFlag === 3) {
    return "failed";
  }

  const fallbackState = (result?.state || result?.status || "").toLowerCase();

  if (fallbackState === "success") {
    return "success";
  }

  if (fallbackState === "fail" || fallbackState === "failed") {
    return "failed";
  }

  return "pending";
}

export function getVeoResultUrl(result) {
  if (!result) {
    return "";
  }

  if (typeof result.videoUrl === "string" && result.videoUrl) {
    return result.videoUrl;
  }

  if (typeof result.resultUrl === "string" && result.resultUrl) {
    return result.resultUrl;
  }

  if (typeof result.imageUrl === "string" && result.imageUrl) {
    return result.imageUrl;
  }

  if (typeof result.url === "string" && result.url) {
    return result.url;
  }

  let parsedResultUrls = result.resultUrls;

  if (typeof parsedResultUrls === "string") {
    try {
      parsedResultUrls = JSON.parse(parsedResultUrls);
    } catch {
      parsedResultUrls = [];
    }
  }

  if (Array.isArray(parsedResultUrls) && parsedResultUrls[0]) {
    return parsedResultUrls[0];
  }

  return "";
}
