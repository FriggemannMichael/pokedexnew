"""Die KI-Endpoints: fuer jede KI-Funktion der App genau einer.

Das Frontend schickt hier nur noch Rohdaten hin - das Team, den Spielzug, das
Arena-Matchup. Prompt, Anbieterwahl und Fallback passieren im Backend
(prompts.py und ai.py). Frueher baute das Frontend die Prompts selbst und
schickte fertige Nachrichten an einen allgemeinen Proxy; damit konnte jeder,
der die URL kannte, den API-Key fuer beliebige Anfragen benutzen.

Es gilt ein Rate-Limit von 30 Anfragen pro Minute und IP (throttling.py).
"""

from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import ai, prompts
from .throttling import AiRateThrottle

MAX_DIALOGUE_WORDS = 12


def body(request):
    """Der Anfrage-Inhalt, notfalls leer."""
    return request.data if isinstance(request.data, dict) else {}


def answer(provider, extra):
    """Die Antwort ans Frontend - immer mit dem Anbieter, der geantwortet hat."""
    return Response({"provider": provider, "providerLabel": ai.label(provider), **extra})


def text_reply(messages, temperature, max_tokens):
    """Fuer die Endpoints, die Fliesstext liefern."""
    try:
        provider, content = ai.chat(messages, temperature, max_tokens)
    except ai.AiError as error:
        return Response(error.detail, status=error.status)
    return answer(provider, {"text": content})


def json_reply(messages, temperature, max_tokens):
    """Fuer die Endpoints, deren Antwort JSON sein soll.

    `parsed` ist null, wenn die KI kein brauchbares JSON geliefert hat - das
    Frontend faellt dann auf seine lokale Analyse zurueck.
    """
    try:
        provider, content = ai.chat(messages, temperature, max_tokens)
    except ai.AiError as error:
        return Response(error.detail, status=error.status)
    return answer(provider, {"rawContent": content, "parsed": ai.parse_json(content)})


@extend_schema(
    summary="KI erreichbar?",
    description=(
        "Das Frontend fragt hier zuerst nach. Antwortet der Endpoint, schaltet "
        "es seine KI-Funktionen frei."
    ),
    responses={200: {"type": "object", "properties": {"status": {"type": "string"}}}},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def ai_ping(request):
    """GET /api/ai/ping"""
    return Response({"status": "ok"})


@extend_schema(
    summary="Professor Eich: Rat zum Team",
    description=(
        "Nimmt Team und statische Analyse entgegen und antwortet mit einem kurzen "
        "Rat in hoechstens drei Saetzen (Feld 'text')."
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AiRateThrottle])
def team_advice(request):
    """POST /api/ai/team-advice"""
    data = body(request)
    messages = prompts.team_advice(data.get("team"), data.get("staticAnalysis"))
    return text_reply(messages, temperature=0.8, max_tokens=400)


@extend_schema(
    summary="Kampf-Kommentar",
    description=(
        "Kommentiert einen Spielzug in einem Satz (Feld 'text'). Erwartet "
        "attackerName, moveName, defenderName und effectiveness."
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AiRateThrottle])
def battle_commentary(request):
    """POST /api/ai/battle-commentary"""
    data = body(request)
    messages = prompts.battle_commentary(
        data.get("attackerName"),
        data.get("moveName"),
        data.get("defenderName"),
        data.get("effectiveness"),
    )
    return text_reply(messages, temperature=0.8, max_tokens=90)


def shorten(text, limit=MAX_DIALOGUE_WORDS):
    """Der Arenaleiter soll knapp bleiben, auch wenn die KI ausschweift."""
    return " ".join(text.split()[:limit])


@extend_schema(
    summary="Arenaleiter-Dialog",
    description=(
        "Ein Spruch des Arenaleiters zum aktuellen Zug, hoechstens zwoelf Woerter "
        "(Feld 'text'). Erwartet leaderName, leaderType, leaderStyle und eventText."
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AiRateThrottle])
def gym_dialogue(request):
    """POST /api/ai/gym-dialogue"""
    data = body(request)
    messages = prompts.gym_dialogue(
        data.get("leaderName"),
        data.get("leaderType"),
        data.get("leaderStyle"),
        data.get("eventText"),
    )
    reply = text_reply(messages, temperature=0.7, max_tokens=60)
    if reply.status_code == 200:
        reply.data["text"] = shorten(reply.data["text"])
    return reply


@extend_schema(
    summary="Team-Analyse (JSON)",
    description=(
        "Die grosse Analyse des Team-Analyzers. Erwartet team und staticAnalysis "
        "und antwortet mit 'parsed' (das JSON der KI) und 'rawContent'."
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AiRateThrottle])
def team_analysis(request):
    """POST /api/ai/team-analysis"""
    data = body(request)
    messages = prompts.team_analysis(data.get("team"), data.get("staticAnalysis"))
    return json_reply(messages, temperature=0.3, max_tokens=700)


@extend_schema(
    summary="Gym-Strategie (JSON)",
    description=(
        "Ein Battleplan gegen das Arena-Team. Erwartet playerTeam, gymTeam, "
        "playerAvgStats und gymAvgStats; antwortet wie /api/ai/team-analysis."
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AiRateThrottle])
def gym_strategy(request):
    """POST /api/ai/gym-strategy"""
    data = body(request)
    messages = prompts.gym_strategy(
        data.get("playerTeam"),
        data.get("gymTeam"),
        data.get("playerAvgStats"),
        data.get("gymAvgStats"),
    )
    return json_reply(messages, temperature=0.25, max_tokens=700)
