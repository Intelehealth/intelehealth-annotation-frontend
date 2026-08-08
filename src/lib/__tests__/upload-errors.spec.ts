import { describe, it, expect } from "vitest";
import {
  UPLOAD_CANCELLED_MESSAGE,
  UPLOAD_NETWORK_MESSAGE,
  UPLOAD_TIMEOUT_MESSAGE,
  getUploadErrorMessage,
} from "@/lib/upload-errors";

describe("getUploadErrorMessage", () => {
  const FALLBACK = "Upload failed";

  it("returns the fallback for non-object errors", () => {
    expect(getUploadErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(getUploadErrorMessage("boom", FALLBACK)).toBe(FALLBACK);
    expect(getUploadErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("prefers the backend message when a response exists", () => {
    const err = {
      response: { status: 400, data: { message: "Unsupported document type" } },
    };
    expect(getUploadErrorMessage(err, FALLBACK)).toBe("Unsupported document type");
  });

  it("uses the status map when no backend message is provided", () => {
    expect(getUploadErrorMessage({ response: { status: 413, data: {} } }, FALLBACK)).toBe(
      "File exceeds the maximum allowed size.",
    );
    expect(getUploadErrorMessage({ response: { status: 500, data: {} } }, FALLBACK)).toBe(
      "Document upload failed on the server.",
    );
  });

  it("falls back to a generic HTTP message for unknown statuses", () => {
    expect(getUploadErrorMessage({ response: { status: 418, data: {} } }, FALLBACK)).toBe(
      "Upload failed (HTTP 418).",
    );
  });

  it("never labels a backend error as a network timeout, even if it contains the word timeout", () => {
    const err = {
      response: { status: 408, data: { message: "Operation timed out server side" } },
    };
    const result = getUploadErrorMessage(err, FALLBACK);
    expect(result).toBe("Operation timed out server side");
    expect(result).not.toBe(UPLOAD_TIMEOUT_MESSAGE);
  });

  it("labels a genuine axios timeout as a timeout", () => {
    expect(
      getUploadErrorMessage({ code: "ECONNABORTED", message: "timeout of 120000ms exceeded" }, FALLBACK),
    ).toBe(UPLOAD_TIMEOUT_MESSAGE);
    expect(getUploadErrorMessage({ code: "ETIMEDOUT" }, FALLBACK)).toBe(UPLOAD_TIMEOUT_MESSAGE);
  });

  it("labels an AbortController cancellation as cancelled, not a timeout", () => {
    expect(getUploadErrorMessage({ code: "ERR_CANCELED" }, FALLBACK)).toBe(UPLOAD_CANCELLED_MESSAGE);
    expect(getUploadErrorMessage({ code: "ERR_ABORTED" }, FALLBACK)).toBe(UPLOAD_CANCELLED_MESSAGE);
  });

  it("labels an unreachable server (no response, not a timeout) as network", () => {
    expect(getUploadErrorMessage({ code: "ERR_NETWORK" }, FALLBACK)).toBe(UPLOAD_NETWORK_MESSAGE);
    expect(getUploadErrorMessage({}, FALLBACK)).toBe(UPLOAD_NETWORK_MESSAGE);
  });
});
