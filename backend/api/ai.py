"""Die Verbindung zu den KI-Anbietern. Der Browser spricht nie mit ihnen.

Ein API-Key darf niemals ins Frontend - er waere sonst fuer jeden im Browser
sichtbar. Das Frontend schickt darum nur Rohdaten an die Endpoints in
ai_views.py; der Prompt entsteht in prompts.py und die Anfrage geht von hier
raus, mit dem Key vom Server.

Unterstuetzt werden vier Anbieter. Drei davon (Groq, OpenRouter, Mistral)
sprechen dasselbe Protokoll wie OpenAI; Gemini braucht ein eigenes Format und
wird darum zurueckuebersetzt (siehe normalize_response). Faellt einer aus
(kein Guthaben, Ausfall), nimmt chat() automatisch den naechsten.
"""

import json
import os
import time

import requests

TIMEOUT_SECONDS = 25  # wie lange ein einzelner Anbieter Zeit bekommt
CHAIN_BUDGET_SECONDS = 45  # wie lange alle Versuche zusammen dauern duerfen
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

LABELS = {
    "groq": "Groq",
    "openrouter": "OpenRouter",
    "mistral": "Mistral",
    "gemini": "Gemini",
}

KEY_NAMES = {
    "groq": "GROQ_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "gemini": "GEMINI_API_KEY",
}

FALLBACK_ORDER = ("gemini", "openrouter", "mistral", "groq")


def label(provider):
    """Der Name des Anbieters, wie ihn die Oberflaeche anzeigt."""
    return LABELS.get(provider, provider)


def default_provider():
    """Wer zuerst gefragt wird. AI_PROVIDER darf das bestimmen, sonst Groq."""
    wanted = (env("AI_PROVIDER") or "").lower()
    return wanted if wanted in PROVIDERS else "groq"


def provider_chain():
    """Alle Anbieter mit Key, der bevorzugte zuerst.

    Ohne Key braucht man einen Anbieter gar nicht erst zu fragen - so bleibt
    fuer den Fallback nur uebrig, was auch wirklich antworten kann.
    """
    first = default_provider()
    order = [first] + [name for name in FALLBACK_ORDER if name != first]
    return [name for name in order if env(KEY_NAMES[name])]


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


def extract_content(data):
    """Holt den Antworttext aus der Anbieter-Antwort."""
    message = ((data.get("choices") or [{}])[0] or {}).get("message") or {}
    content = message.get("content")
    if isinstance(content, list):  # manche Anbieter schicken Text-Bausteine
        content = " ".join(part.get("text", "") for part in content)
    text = str(content or "").strip()
    if not text:
        raise AiError({"error": "Der Anbieter hat nichts geantwortet"}, 502)
    return text


def chat(messages, temperature=DEFAULT_TEMPERATURE, max_tokens=DEFAULT_MAX_TOKENS):
    """Fragt der Reihe nach, bis einer antwortet. Gibt (Anbieter, Text) zurueck."""
    body = {"messages": messages, "temperature": temperature, "max_tokens": max_tokens}
    chain = provider_chain()
    if not chain:
        raise AiError({"error": "Kein API-Key konfiguriert"}, 500)
    return try_chain(chain, body)


def try_chain(chain, body):
    """Ein Anbieter nach dem anderen; der letzte Fehler zaehlt, wenn keiner will.

    Das Zeitbudget bricht die Kette ab, wenn schon zu viel Zeit vergangen ist.
    Sonst koennte ein Aufruf vier lahme Anbieter hintereinander abwarten - und
    der Browser haette laengst aufgegeben.
    """
    deadline = time.monotonic() + CHAIN_BUDGET_SECONDS
    last_error = None
    for provider in chain:
        if last_error and time.monotonic() > deadline:
            break
        try:
            return provider, extract_content(ask(provider, body))
        except AiError as error:
            last_error = error
    raise last_error


def parse_json(text):
    """Der Coach soll JSON liefern - manchmal steht aber Geschwaetz drumherum."""
    direct = load_json(text)
    if direct is not None:
        return direct
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return None
    return load_json(text[start : end + 1])


def load_json(text):
    """json.loads, aber ohne Absturz bei Unsinn."""
    try:
        parsed = json.loads(text)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None
