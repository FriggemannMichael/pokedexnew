"""Andere Trainer: ihre Teams als Gegner und die Zahlen fuer die Rangliste.

Ein Trainer taucht auf, sobald er ein Team gespeichert hat. Die Antwort
enthaelt nur Pokemon-Nummern - die Details holt das Frontend wie ueberall
sonst aus dem PokeAPI-Cache. Die Bilanz (Kaempfe/Siege) kommt aus der
Kampfhistorie des jeweiligen Nutzers.
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BattleRecord, TeamMember

MAX_TRAINERS = 50


def team_ids_je_user(user_ids):
    """{user_id: [pokemon_ids in Slot-Reihenfolge]}"""
    members = TeamMember.objects.filter(user_id__in=user_ids).order_by(
        "user_id", "slot"
    )
    teams = {}
    for member in members:
        teams.setdefault(member.user_id, []).append(member.pokemon_id)
    return teams


def bilanz_je_user(user_ids):
    """{user_id: (kaempfe, siege)} aus der Kampfhistorie."""
    zeilen = (
        BattleRecord.objects.filter(user_id__in=user_ids)
        .values("user_id")
        .annotate(
            battles=Count("id"),
            wins=Count("id", filter=Q(result=BattleRecord.WIN)),
        )
    )
    return {z["user_id"]: (z["battles"], z["wins"]) for z in zeilen}


def trainer_json(user, teams, bilanz):
    battles, wins = bilanz.get(user.id, (0, 0))
    return {
        "username": user.username,
        "pokemonIds": teams.get(user.id, []),
        "battles": battles,
        "wins": wins,
    }


@extend_schema(
    summary="Trainer mit gespeichertem Team",
    description=(
        "Alle Nutzer, die ein Team gespeichert haben - einschliesslich des "
        "eigenen. Mit Pokemon-Nummern und Kampfbilanz fuer die Rangliste. "
        "Ohne Token: 401."
    ),
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def trainers(request):
    """GET /api/trainers"""
    user_ids = list(
        TeamMember.objects.values_list("user_id", flat=True).distinct()[:MAX_TRAINERS]
    )
    users = get_user_model().objects.filter(id__in=user_ids).order_by("username")
    teams = team_ids_je_user(user_ids)
    bilanz = bilanz_je_user(user_ids)
    return Response(
        {"trainers": [trainer_json(user, teams, bilanz) for user in users]}
    )
