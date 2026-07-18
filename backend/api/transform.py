"""Verkleinert die PokeAPI-Antwort auf das, was der Pokedex wirklich braucht.

Eine PokeAPI-Antwort zu einem Pokemon ist sehr gross (viele Sprites, alle
Attacken, alle Spiel-Versionen). Die Kartenansicht braucht davon nur wenige
Felder. Das Backend schneidet den Rest weg - das spart im Browser Datenmenge.
"""


def artwork_url(raw):
    """Das offizielle Artwork, sonst das Standard-Sprite."""
    sprites = raw.get("sprites") or {}
    other = sprites.get("other") or {}
    official = other.get("official-artwork") or {}
    return official.get("front_default") or sprites.get("front_default") or ""


def type_names(raw):
    """Aus der verschachtelten Typ-Struktur nur die Namen, z.B. ["fire"]."""
    return [entry["type"]["name"] for entry in raw.get("types") or []]


def slim_pokemon(raw):
    """Das Format, das die Karten-, Team- und Pokedex-Ansicht erwartet.

    "stats" bleibt bewusst die rohe PokeAPI-Liste ([{stat, base_stat}, ...]),
    weil Team-Builder und MyPokedex genau damit rechnen.
    """
    return {
        "id": raw.get("id"),
        "name": raw.get("name"),
        "image": artwork_url(raw),
        "types": type_names(raw),
        "stats": raw.get("stats") or [],
        "base_experience": raw.get("base_experience") or 0,
    }


def slim_pokemon_list(raw_list):
    """Wendet slim_pokemon auf eine ganze Liste an."""
    return [slim_pokemon(raw) for raw in raw_list]
