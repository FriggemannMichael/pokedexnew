require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const timestamps = rateLimitMap
    .get(ip)
    .filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: "Rate limit exceeded. Max 30 requests per minute.",
    });
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  next();
}

setInterval(
  () => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitMap) {
      const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) {
        rateLimitMap.delete(ip);
      } else {
        rateLimitMap.set(ip, valid);
      }
    }
  },
  5 * 60 * 1000,
);

app.use(express.static(path.join(__dirname)));

app.get("/api/ai/ping", (req, res) => {
  res.json({ status: "ok" });
});

function openAiStyleConfig({ endpoint, apiKey, model, temperature, max_tokens, messages }) {
  return {
    endpoint,
    apiKey,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 320,
      messages: messages || [],
    }),
  };
}

function groqConfig(b) {
  return openAiStyleConfig({
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: process.env.GROQ_API_KEY,
    model: b.model || process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    ...b,
  });
}

function openRouterConfig(b) {
  return openAiStyleConfig({
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    ...b,
    model: process.env.OPENROUTER_MODEL || b.model || "meta-llama/llama-3.1-8b-instruct",
  });
}

function mistralConfig(b) {
  return openAiStyleConfig({
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    apiKey: process.env.MISTRAL_API_KEY,
    model: b.model || "mistral-small-latest",
    ...b,
  });
}

function splitGeminiMessages(messages) {
  const list = messages || [];
  const system = list.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const parts = list.filter((m) => m.role !== "system").map((m) => ({ text: m.content }));
  return { system, parts };
}

function geminiConfig(b) {
  const apiKey = process.env.GEMINI_API_KEY;
  const id = process.env.GEMINI_MODEL || b.model || "gemini-2.5-flash";
  const { system, parts } = splitGeminiMessages(b.messages);
  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: b.temperature ?? 0.7,
      maxOutputTokens: b.max_tokens ?? 320,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (system) payload.system_instruction = { parts: [{ text: system }] };
  return {
    endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent?key=${apiKey}`,
    apiKey,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function getProviderConfig(provider, body) {
  if (provider === "openrouter") return openRouterConfig(body);
  if (provider === "mistral") return mistralConfig(body);
  if (provider === "gemini") return geminiConfig(body);
  return groqConfig(body);
}

function resolveProvider(requested) {
  return (process.env.AI_PROVIDER || requested || "groq").toLowerCase();
}

function normalizeResponse(provider, data) {
  if (provider !== "gemini") return data;
  const content = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p?.text || "")
    .join("")
    .trim();
  return { choices: [{ message: { content } }] };
}

app.post("/api/ai", rateLimiter, async (req, res) => {
  const provider = resolveProvider(req.body.provider);
  const cfg = getProviderConfig(provider, req.body);
  if (!cfg.apiKey) {
    return res.status(500).json({ error: `No API key configured for provider: ${provider || "groq"}` });
  }
  try {
    const response = await fetch(cfg.endpoint, { method: "POST", headers: cfg.headers, body: cfg.body });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(normalizeResponse(provider, data));
  } catch (error) {
    console.error("[Proxy] AI request failed:", error.message);
    res.status(502).json({ error: "AI proxy request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Pokedex server running on http://localhost:${PORT}`);
});
