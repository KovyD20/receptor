const { GoogleGenAI, Type } = require("@google/genai");
const { classifyAiError } = require("./aiError");

const DEFAULT_MODEL = "gemini-3.6-flash";

const REQUEST_TIMEOUT_MS =
  Number(process.env.AI_TIMEOUT_MS || process.env.GEMINI_TIMEOUT_MS) || 90000;

const RETRY_STATUS_CODES = [408, 500, 502, 503, 504];

const NETWORK_RETRY_ATTEMPTS = 2;
const RETRY_BUDGET_MS = REQUEST_TIMEOUT_MS * 2;
const RETRYABLE_NETWORK_FAILURE =
  /fetch failed|terminated|ECONNRESET|EAI_AGAIN|\bUND_ERR_\w+/i;

let cached = null;

function getModelName() {
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment");
  }
  if (!cached || cached.apiKey !== apiKey) {
    cached = {
      apiKey,
      client: new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: REQUEST_TIMEOUT_MS,
          retryOptions: {
            attempts: 3,
            initialDelay: 0.7,
            expBase: 2,
            httpStatusCodes: RETRY_STATUS_CODES,
          },
        },
      }),
    };
  }
  return cached.client;
}

async function callModel(request) {
  const deadline = Date.now() + RETRY_BUDGET_MS;
  for (let attempt = 1; ; attempt++) {
    try {
      return await getClient().models.generateContent(request);
    } catch (err) {
      const retryable = RETRYABLE_NETWORK_FAILURE.test(err?.message || "");
      if (
        !retryable ||
        attempt >= NETWORK_RETRY_ATTEMPTS ||
        Date.now() >= deadline
      ) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
}

async function generateJson({
  system,
  prompt,
  schema,
  output,
  maxTokens = 4096,
  temperature = 0.2,
}) {
  try {
    const response = await callModel({
      model: getModelName(),
      contents: prompt,
      config: {
        systemInstruction: system,
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      const err = new Error("Model response was not valid JSON");
      err.code = "AI_INVALID_JSON";
      err.raw = text;
      throw err;
    }
    if (!output) return json;
    const checked = output.safeParse(json);
    if (!checked.success) {
      const err = new Error("Model response did not match the expected shape");
      err.code = "AI_INVALID_JSON";
      err.raw = text;
      throw err;
    }
    return checked.data;
  } catch (err) {
    const classified = classifyAiError(err);
    if (classified) throw classified;
    throw err;
  }
}

module.exports = { generateJson, getModelName, Type };
