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

app.post("/api/ai", rateLimiter, async (req, res) => {
  const { provider, model, messages, temperature, max_tokens } = req.body;

  let endpoint, apiKey, headers, body;

  if (provider === "mistral") {
    endpoint = "https://api.mistral.ai/v1/chat/completions";
    apiKey = process.env.MISTRAL_API_KEY;
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    body = JSON.stringify({
      model: model || "mistral-small",
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 320,
      messages: messages || [],
    });
  } else if (provider === "gemini") {
    endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      (model || "gemini-pro") +
      ":generateContent";
    apiKey = process.env.GEMINI_API_KEY;
    headers = {
      "Content-Type": "application/json",
    };
    body = JSON.stringify({
      contents: [
        {
          parts: (messages || []).map((m) => ({ text: m.content })),
        },
      ],
    });
    endpoint += `?key=${apiKey}`;
  } else {
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
    apiKey = process.env.GROQ_API_KEY;
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    body = JSON.stringify({
      model: model || process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 320,
      messages: messages || [],
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: `No API key configured for provider: ${provider || "groq"}`,
    });
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("[Proxy] AI request failed:", error.message);
    res.status(502).json({ error: "AI proxy request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Pokedex server running on http://localhost:${PORT}`);
});
