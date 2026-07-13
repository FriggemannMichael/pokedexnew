"""Der KI-Proxy: Das Backend spricht mit den KI-Anbietern, nie der Browser.

Warum ueberhaupt ein Proxy? Ein API-Key darf niemals ins Frontend - er waere
sonst fuer jeden im Browser sichtbar. Das Frontend schickt seine Anfrage also
hierher, und erst das Backend haengt den Key dran.

Unterstuetzt werden vier Anbieter. Drei davon (Groq, OpenRouter, Mistral)
sprechen dasselbe Protokoll wie OpenAI; Gemini braucht ein eigenes Format und
wird darum zurueckuebersetzt (siehe normalize_response).
"""

import os

import requests

TIMEOUT_SECONDS = 30
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 320


class AiError(Exception):
    """Fehler, den der Proxy unveraendert ans Frontend weiterreicht."""

    def __init__(self, detail, status=502):
        super().__init__(str(detail))
        self.detail = detail
        self.status = status


def env(name):
    """Liest eine Umgebungsvariable, leer wenn nicht gesetzt."""
    return os.environ.get(name, "") or ""


def openai_style(endpoint, api_key, model, body):
    """Der gemeinsame Aufbau von Groq, OpenRouter und Mistral."""
    return {
        "endpoint": endpoint,
        "api_key": api_key,
        "headers": {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        "payload": {
            "model": model,
            "temperature": body.get("temperature", DEFAULT_TEMPERATURE),
            "max_tokens": body.get("max_tokens", DEFAULT_MAX_TOKENS),
            "messages": body.get("messages") or [],
        },
    }


def groq_config(body):
    model = body.get("model") or env("GROQ_MODEL") or "llama-3.1-8b-instant"
    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    return openai_style(endpoint, env("GROQ_API_KEY"), model, body)


def openrouter_config(body):
    model = (
        env("OPENROUTER_MODEL")
        or body.get("model")
        or "meta-llama/llama-3.1-8b-instruct"
    )
    endpoint = "https://openrouter.ai/api/v1/chat/completions"
    return openai_style(endpoint, env("OPENROUTER_API_KEY"), model, body)


def mistral_config(body):
    model = body.get("model") or "mistral-small-latest"
    endpoint = "https://api.mistral.ai/v1/chat/completions"
    return openai_style(endpoint, env("MISTRAL_API_KEY"), model, body)


def split_gemini_messages(messages):
    """Gemini trennt die System-Anweisung vom eigentlichen Gespraech."""
    system = "\n".join(
        m.get("content", "") for m in messages if m.get("role") == "system"
    )
    parts = [{"text": m.get("content", "")} for m in messages if m.get("role") != "system"]
    return system, parts


def gemini_payload(body):
    """Baut Geminis eigenes Anfrage-Format."""
    system, parts = split_gemini_messages(body.get("messages") or [])
    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": body.get("temperature", DEFAULT_TEMPERATURE),
            "maxOutputTokens": body.get("max_tokens", DEFAULT_MAX_TOKENS),
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    if system:
        payload["system_instruction"] = {"parts": [{"text": system}]}
    return payload


def gemini_config(body):
    api_key = env("GEMINI_API_KEY")
    model = env("GEMINI_MODEL") or body.get("model") or "gemini-2.5-flash"
    base = "https://generativelanguage.googleapis.com/v1beta/models"
    return {
        "endpoint": f"{base}/{model}:generateContent?key={api_key}",
        "api_key": api_key,
        "headers": {"Content-Type": "application/json"},
        "payload": gemini_payload(body),
    }


PROVIDERS = {
    "groq": groq_config,
    "openrouter": openrouter_config,
    "mistral": mistral_config,
    "gemini": gemini_config,
}


def resolve_provider(requested):
    """Das Frontend waehlt den Anbieter; AI_PROVIDER ist nur der Standard.

    Nur so kann das Frontend eine Fallback-Kette durchprobieren (Gemini ->
    OpenRouter -> ...): Wuerde AI_PROVIDER den Wunsch ueberstimmen, landeten
    alle Versuche wieder beim selben Anbieter.
    """
    wanted = (requested or "").lower()
    if wanted in PROVIDERS:
        return wanted
    return (env("AI_PROVIDER") or "groq").lower()


def build_config(provider, body):
    """Waehlt den Anbieter; unbekannte Namen landen bei Groq."""
    return PROVIDERS.get(provider, groq_config)(body)


def normalize_response(provider, data):
    """Uebersetzt Geminis Antwort ins OpenAI-Format, das das Frontend erwartet."""
    if provider != "gemini":
        return data
    candidates = data.get("candidates") or [{}]
    parts = (candidates[0].get("content") or {}).get("parts") or []
    content = "".join(part.get("text", "") for part in parts).strip()
    return {"choices": [{"message": {"content": content}}]}


def post_to_provider(config):
    """Schickt die Anfrage raus und gibt die rohe Antwort zurueck."""
    try:
        return requests.post(
            config["endpoint"],
            headers=config["headers"],
            json=config["payload"],
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as error:
        raise AiError({"error": "KI-Anfrage fehlgeschlagen"}, 502) from error


def read_body(response):
    """Antworten sind normalerweise JSON - aber eben nicht immer."""
    try:
        return response.json()
    except ValueError:
        return {"error": (response.text or "")[:240]}


def ask(provider, body):
    """Eine Anfrage an den gewaehlten Anbieter, mit Key vom Server."""
    config = build_config(provider, body)
    if not config["api_key"]:
        raise AiError({"error": f"Kein API-Key konfiguriert fuer: {provider}"}, 500)

    response = post_to_provider(config)
    data = read_body(response)
    if not response.ok:
        raise AiError(data, response.status_code)
    return normalize_response(provider, data)
