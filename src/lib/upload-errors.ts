/**
 * Truthful upload error mapping.
 *
 * Only a genuine network timeout is labelled "Upload timed out". Any time the
 * backend returned a response (even an error), the backend/status message is
 * shown instead — never the timeout label. A user/component cancellation is
 * reported as "cancelled", and a network failure without a response as an
 * unreachable-server message.
 */

export const UPLOAD_ERROR_BY_STATUS: Record<number, string> = {
  400: "Unsupported or invalid file type",
  401: "Session expired. Please sign in again.",
  403: "You do not have access to this dataset.",
  404: "Upload endpoint not found.",
  413: "File exceeds the maximum allowed size.",
  415: "Unsupported media type.",
  422: "Invalid document format.",
  500: "Document upload failed on the server.",
  503: "Processing worker is unavailable.",
};

export const UPLOAD_TIMEOUT_MESSAGE =
  "Upload timed out. Check if the backend is running and try again.";
export const UPLOAD_CANCELLED_MESSAGE = "Upload was cancelled.";
export const UPLOAD_NETWORK_MESSAGE =
  "Cannot reach the server. Make sure the backend is running.";

interface UploadErrorLike {
  code?: string;
  message?: unknown;
  response?: { status?: number; data?: { message?: unknown } };
}

/** True for a genuine axios network timeout (no HTTP response). */
function isNetworkTimeout(err: UploadErrorLike, message: string): boolean {
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return true;
  }
  // axios timeout message form: "timeout of 120000ms exceeded"
  return /^timeout of \d+ms exceeded$/.test(message);
}

/** True for a user/component-initiated abort (AbortController). */
function isCancellation(err: UploadErrorLike, message: string): boolean {
  if (err.code === "ERR_CANCELED" || err.code === "ERR_ABORTED") {
    return true;
  }
  return /^(canceled|cancelled)$/i.test(message);
}

export function getUploadErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (typeof error !== "object" || error === null) return fallback;

  const err = error as UploadErrorLike;
  const message =
    typeof err.message === "string" ? (err.message as string) : "";

  // 1. Any HTTP response wins — show the real backend/status message.
  if (err.response) {
    const status = err.response.status ?? 0;
    const backendMessage =
      typeof err.response.data?.message === "string"
        ? err.response.data.message
        : "";
    return (
      backendMessage ||
      UPLOAD_ERROR_BY_STATUS[status] ||
      `Upload failed (HTTP ${status}).`
    );
  }

  // 2. Genuine network timeout only.
  if (isNetworkTimeout(err, message)) {
    return UPLOAD_TIMEOUT_MESSAGE;
  }

  // 3. Genuine cancellation.
  if (isCancellation(err, message)) {
    return UPLOAD_CANCELLED_MESSAGE;
  }

  // 4. Everything else without a response is treated as unreachable.
  return UPLOAD_NETWORK_MESSAGE;
}