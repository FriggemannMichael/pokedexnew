"""Die Arena-Orden des angemeldeten Nutzers.

Arbeitet wie /api/favorites: GET liefert die Liste, PUT ersetzt sie komplett -
erwartet wird {"leaderKeys": ["rocko", "misty"]}. Das Frontend vergibt die
Orden beim Arena-Sieg und kennt die Reihenfolge der Liga (GYM_LEADERS).
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import GymBadge

MAX_BADGES = 20
MAX_KEY_LENGTH = 30


def body(request):
    return request.data if isinstance(request.data, dict) else {}


def to_leader_key(value):
    """Ein Orden-Schluessel ist ein kurzer, nicht leerer Text."""
    key = str(value or "").strip().lower()
    if not key or len(key) > MAX_KEY_LENGTH:
        raise ValueError(f"Kein gueltiger Arena-Schluessel: {value!r}")
    return key


def read_leader_keys(request):
    raw = body(request).get("leaderKeys")
    if not isinstance(raw, list):
        raise ValueError("Erwartet wird ein Feld 'leaderKeys' mit einer Liste.")
    return sorted({to_leader_key(value) for value in raw[:MAX_BADGES]})


def badge_keys(user):
    return list(
        GymBadge.objects.filter(user=user)
        .order_by("earned_at")
        .values_list("leader_key", flat=True)
    )


def replace_badges(user, leader_keys):
    GymBadge.objects.filter(user=user).delete()
    GymBadge.objects.bulk_create(
        [GymBadge(user=user, leader_key=key) for key in leader_keys]
    )


@extend_schema(
    summary="Arena-Orden lesen und speichern",
    description=(
        "GET liefert die Schluessel der verdienten Orden. PUT ersetzt sie; "
        'erwartet wird {"leaderKeys": ["rocko"]}. Ohne Token: 401.'
    ),
)
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def badges(request):
    """GET/PUT /api/badges"""
    if request.method == "PUT":
        try:
            replace_badges(request.user, read_leader_keys(request))
        except ValueError as error:
            return Response(
                {"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )
    return Response({"leaderKeys": badge_keys(request.user)})
