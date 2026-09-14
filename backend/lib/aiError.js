function parseErrorBody(message) {
  if (!message) return null;
  const start = message.indexOf("{");
  const end = message.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(message.slice(start, end + 1));
  } catch {
    return null;
  }
}

function findRetryDelaySeconds(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.retryDelay === "string") {
    const match = value.retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
    if (match) return Math.ceil(Number(match[1]));
  }
  for (const child of Object.values(value)) {
    const found = findRetryDelaySeconds(child);
    if (found !== null) return found;
  }
  return null;
}

function findQuotaId(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.quotaId === "string") return value.quotaId;
  for (const child of Object.values(value)) {
    const found = findQuotaId(child);
    if (found !== null) return found;
  }
  return null;
}

const NETWORK_FAILURE =
  /fetch failed|Request aborted when|The operation was aborted|aborted|terminated|\bUND_ERR_\w+/i;
const NETWORK_CODE =
  /\b(ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|UND_ERR_HEADERS_TIMEOUT)\b/;

function aiError(message, status, code, extra = {}) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  Object.assign(err, extra);
  return err;
}

function classifyAiError(err) {
  const message = err?.message || "";

  if (err?.code === "AI_INVALID_JSON") {
    return aiError("AI response was not valid JSON", 502, "AI_INVALID_JSON", {
      raw: err.raw,
    });
  }

  const status = Number(err?.status);
  if (Number.isFinite(status) && status >= 400) {
    if (status === 429) {
      const body = parseErrorBody(message);
      const quotaId = findQuotaId(body);
      return aiError("AI quota exceeded", 429, "AI_QUOTA", {
        retryAfterSeconds: findRetryDelaySeconds(body),
        quotaScope: /PerDay/i.test(quotaId || "") ? "daily" : null,
      });
    }

    if (status === 404) {
      return aiError(
        "AI model not found or retired",
        404,
        "AI_MODEL_NOT_FOUND",
      );
    }

    if (status === 401 || status === 403) {
      return aiError("AI credentials rejected", 500, "AI_AUTH");
    }

    if (status === 408 || status === 504) {
      return aiError("AI request timed out", 504, "AI_TIMEOUT");
    }

    if (status >= 500) {
      return aiError("AI temporarily overloaded", 503, "AI_OVERLOADED");
    }

    return aiError("AI request rejected", 502, "AI_BAD_REQUEST");
  }

  if (
    NETWORK_FAILURE.test(message) ||
    NETWORK_CODE.test(`${message} ${err?.cause?.code || ""} ${err?.code || ""}`)
  ) {
    return aiError("AI request timed out", 504, "AI_TIMEOUT");
  }

  return null;
}

module.exports = { classifyAiError };
