"""Favoriten und Notizen des angemeldeten Nutzers.

Beide Endpoints arbeiten wie /api/team: Das Frontend haelt seine Liste ohnehin
komplett im Speicher und schickt sie ganz - das Backend ersetzt damit den alten
Stand. Das ist einfacher als einzelne Eintraege zu pflegen; der Preis ist, dass
bei zwei gleichzeitig offenen Browsern der letzte Stand gewinnt.

Notizen werden nur zu Pokemon gespeichert, zu denen wirklich etwas dasteht -
ein leerer Text loescht die Notiz.
"""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Favorite, Note

MAX_NOTE_LENGTH = 2000


def body(request):
    return request.data if isinstance(request.data, dict) else {}


def to_pokemon_id(value):
    """Eine Pokemon-Nummer muss eine positive ganze Zahl sein."""
    try:
        number = int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Keine gueltige Pokemon-Nummer: {value!r}") from error
    if number < 1:
        raise ValueError(f"Keine gueltige Pokemon-Nummer: {value!r}")
    return number


def bad_request(message):
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)


# --- Favoriten -------------------------------------------------------------


def read_favorite_ids(request):
    raw = body(request).get("pokemonIds")
    if not isinstance(raw, list):
        raise ValueError("Erwartet wird ein Feld 'pokemonIds' mit einer Liste.")
    return sorted({to_pokemon_id(value) for value in raw})


def favorite_ids(user):
    return list(
        Favorite.objects.filter(user=user)
        .order_by("pokemon_id")
        .values_list("pokemon_id", flat=True)
    )


def replace_favorites(user, pokemon_ids):
    Favorite.objects.filter(user=user).delete()
    Favorite.objects.bulk_create(
        [Favorite(user=user, pokemon_id=pokemon_id) for pokemon_id in pokemon_ids]
    )


@extend_schema(
    summary="Favoriten lesen und speichern",
    description=(
        "GET liefert die Nummern der favorisierten Pokemon. PUT ersetzt sie; "
        'erwartet wird {"pokemonIds": [25, 6]}. Ohne Token: 401.'
    ),
)
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def favorites(request):
    """GET/PUT /api/favorites"""
    if request.method == "PUT":
        try:
            replace_favorites(request.user, read_favorite_ids(request))
        except ValueError as error:
            return bad_request(str(error))
    return Response({"pokemonIds": favorite_ids(request.user)})


# --- Notizen ---------------------------------------------------------------


def clean_note(value):
    """Notizen sind Text - und nicht endlos lang."""
    text = str(value or "").strip()
    if len(text) > MAX_NOTE_LENGTH:
        raise ValueError(f"Eine Notiz darf hoechstens {MAX_NOTE_LENGTH} Zeichen haben.")
    return text


def read_notes(request):
    """Aus {"25": "stark!"} wird {25: "stark!"} - leere Notizen fallen raus."""
    raw = body(request).get("notes")
    if not isinstance(raw, dict):
        raise ValueError("Erwartet wird ein Feld 'notes' mit einem Objekt.")
    cleaned = {to_pokemon_id(key): clean_note(value) for key, value in raw.items()}
    return {key: text for key, text in cleaned.items() if text}


def stored_notes(user):
    """Die Notizen als Objekt, so wie das Frontend sie haelt."""
    notes = Note.objects.filter(user=user).order_by("pokemon_id")
    return {str(note.pokemon_id): note.text for note in notes}


def replace_notes(user, notes):
    Note.objects.filter(user=user).delete()
    Note.objects.bulk_create(
        [
            Note(user=user, pokemon_id=pokemon_id, text=text)
            for pokemon_id, text in notes.items()
        ]
    )


@extend_schema(
    summary="Notizen lesen und speichern",
    description=(
        "GET liefert alle Notizen als Objekt (Pokemon-Nummer -> Text). PUT "
        'ersetzt sie; erwartet wird {"notes": {"25": "schnell!"}}. Ein leerer '
        "Text loescht die Notiz. Ohne Token: 401."
    ),
)
@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def notes(request):
    """GET/PUT /api/notes"""
    if request.method == "PUT":
        try:
            replace_notes(request.user, read_notes(request))
        except ValueError as error:
            return bad_request(str(error))
    return Response({"notes": stored_notes(request.user)})
