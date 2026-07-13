"""Das gespeicherte Team eines angemeldeten Nutzers.

In der Datenbank stehen nur Pokemon-Nummern und Plaetze (Model TeamMember).
Beim Abrufen holt das Backend die Details aus seinem PokeAPI-Cache und schickt
sie im selben Format wie /api/pokemon/ - das Frontend kann das Team also direkt
anzeigen, ohne selbst nachzuladen.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import pokeapi, transform
from .models import TeamMember

MAX_TEAM_SIZE = 6


def read_ids(request):
    """Die gewuenschten Pokemon-Nummern aus der Anfrage, als saubere Liste."""
    data = request.data if isinstance(request.data, dict) else {}
    raw = data.get("pokemonIds")
    if not isinstance(raw, list):
        raise ValueError("Erwartet wird ein Feld 'pokemonIds' mit einer Liste.")
    if len(raw) > MAX_TEAM_SIZE:
        raise ValueError(f"Ein Team hat hoechstens {MAX_TEAM_SIZE} Pokemon.")
    return [to_pokemon_id(value) for value in raw]


def to_pokemon_id(value):
    """Eine Pokemon-Nummer muss eine positive ganze Zahl sein."""
    try:
        number = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Keine gueltige Pokemon-Nummer: {value!r}") from error
    if number < 1:
        raise ValueError(f"Keine gueltige Pokemon-Nummer: {value!r}")
    return number


def stored_ids(user):
    """Die Nummern des gespeicherten Teams, in der richtigen Reihenfolge."""
    members = TeamMember.objects.filter(user=user).order_by("slot")
    return [member.pokemon_id for member in members]


def replace_team(user, pokemon_ids):
    """Ersetzt das Team komplett - einfacher als einzelne Plaetze zu pflegen."""
    TeamMember.objects.filter(user=user).delete()
    TeamMember.objects.bulk_create(
        [
            TeamMember(user=user, slot=slot, pokemon_id=pokemon_id)
            for slot, pokemon_id in enumerate(pokemon_ids)
        ]
    )


def team_details(pokemon_ids):
    """Aus den Nummern die fertigen Team-Karten (aus dem Cache)."""
    urls = [f"pokemon/{pokemon_id}" for pokemon_id in pokemon_ids]
    return transform.slim_pokemon_list(pokeapi.get_in_order(urls))


def team_answer(user):
    """Antwort auf GET wie auf PUT: das gespeicherte Team, fertig zum Anzeigen."""
    try:
        return Response({"team": team_details(stored_ids(user))})
    except pokeapi.PokeApiError as error:
        return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)


@extend_schema(
    summary="Team lesen und speichern",
    description=(
        "GET liefert das gespeicherte Team des angemeldeten Nutzers, fertig "
        "aufbereitet wie /api/pokemon/. PUT ersetzt es; erwartet wird "
        '{"pokemonIds": [1, 4, 7]} (hoechstens 6). Ohne Token: 401.'
    ),
)
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def team(request):
    """GET/PUT /api/team"""
    if request.method == "GET":
        return team_answer(request.user)
    try:
        pokemon_ids = read_ids(request)
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    replace_team(request.user, pokemon_ids)
    return team_answer(request.user)
