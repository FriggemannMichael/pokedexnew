"""Gespeicherte Teams ("Presets") des angemeldeten Nutzers.

Wie /api/team: In der Datenbank stehen nur Pokemon-Nummern, die Details holt das
Backend beim Abrufen aus seinem PokeAPI-Cache. Das Frontend bekommt also fertige
Karten und kann ein Preset direkt ins Team laden.

Wie bei Favoriten und Notizen schickt das Frontend seine ganze Liste, und das
Backend ersetzt damit den alten Stand.
"""

from django.utils.dateparse import parse_datetime
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import pokeapi, transform
from .models import TeamPreset, TeamPresetMember

MAX_PRESETS = 20
MAX_TEAM_SIZE = 6


def body(request):
    return request.data if isinstance(request.data, dict) else {}


def to_pokemon_id(value):
    try:
        number = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Keine gueltige Pokemon-Nummer: {value!r}") from error
    if number < 1:
        raise ValueError(f"Keine gueltige Pokemon-Nummer: {value!r}")
    return number


def read_name(entry):
    name = str(entry.get("name") or "").strip()
    if not name:
        raise ValueError("Ein Preset braucht einen Namen.")
    return name[:60]


def read_ids(entry):
    raw = entry.get("pokemonIds")
    if not isinstance(raw, list):
        raise ValueError("Ein Preset braucht ein Feld 'pokemonIds' mit einer Liste.")
    return [to_pokemon_id(value) for value in raw[:MAX_TEAM_SIZE]]


def read_presets(request):
    raw = body(request).get("presets")
    if not isinstance(raw, list):
        raise ValueError("Erwartet wird ein Feld 'presets' mit einer Liste.")
    if not all(isinstance(entry, dict) for entry in raw):
        raise ValueError("Jedes Preset muss ein Objekt sein.")
    return raw[:MAX_PRESETS]


def checked(entry):
    """Ein Preset in gepruefter Form: (Name, Datum, Nummern)."""
    return (
        read_name(entry),
        parse_datetime(str(entry.get("created") or "")) or now(),
        read_ids(entry),
    )


def save_preset(user, name, created, pokemon_ids):
    preset = TeamPreset.objects.create(user=user, name=name, created_at=created)
    TeamPresetMember.objects.bulk_create(
        [
            TeamPresetMember(preset=preset, slot=slot, pokemon_id=pokemon_id)
            for slot, pokemon_id in enumerate(pokemon_ids)
        ]
    )


def replace_all(user, entries):
    """Erst alles pruefen, dann ersetzen.

    Sonst waeren die alten Presets bereits geloescht, wenn das dritte in der
    Liste Unsinn enthaelt - und weg waeren sie.
    """
    prepared = [checked(entry) for entry in entries]
    TeamPreset.objects.filter(user=user).delete()
    for name, created, pokemon_ids in prepared:
        save_preset(user, name, created, pokemon_ids)


def preset_json(preset):
    """Das Preset mit fertigen Team-Karten aus dem Cache."""
    urls = [f"pokemon/{member.pokemon_id}" for member in preset.members.all()]
    return {
        "id": preset.id,
        "name": preset.name,
        "created": preset.created_at.isoformat(),
        "team": transform.slim_pokemon_list(pokeapi.get_in_order(urls)),
    }


def all_presets(user):
    presets = TeamPreset.objects.filter(user=user).prefetch_related("members")
    return [preset_json(preset) for preset in presets]


@extend_schema(
    summary="Team-Presets lesen und speichern",
    description=(
        "GET liefert die gespeicherten Teams, jedes mit fertigen Karten wie "
        "/api/pokemon/. PUT ersetzt die Liste; erwartet wird "
        '{"presets": [{"name": "Wasser-Team", "pokemonIds": [7, 9]}]} '
        "(hoechstens 20 Presets). Ohne Token: 401."
    ),
)
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def presets(request):
    """GET/PUT /api/presets"""
    try:
        if request.method == "PUT":
            replace_all(request.user, read_presets(request))
        return Response({"presets": all_presets(request.user)})
    except ValueError as error:
        return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
    except pokeapi.PokeApiError as error:
        return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)
