"""Die deutschen Pokemon-Namen.

Die PokeAPI kennt nur englische Namen ("bulbasaur"). Der deutsche steht in den
Spezies-Daten - aber pro Pokemon einzeln. Fuer eine Suche nach "Evoli" braeuchte
man also alle 1302 Spezies, und die bei jeder Anfrage zu holen waere Unsinn.

Darum: Der Befehl `python manage.py namen_laden` sammelt sie **einmal** ein
(dauert ein paar Minuten, danach liegen sie auch im PokeAPI-Cache) und legt sie
in der Tabelle PokemonName ab. Von dort sind sie sofort da.
"""

from .models import PokemonName
from . import pokeapi

SPECIES_INDEX = "pokemon-species?limit=2000"


def species_paths():
    """Die Pfade aller Spezies, z.B. ["pokemon-species/1", ...]."""
    index = pokeapi.get_resource(SPECIES_INDEX)
    return [pokeapi.normalize_path(entry["url"]) for entry in index.get("results", [])]


def german_name(species):
    """Der deutsche Name aus den Spezies-Daten; sonst der englische."""
    for entry in species.get("names") or []:
        if entry.get("language", {}).get("name") == "de":
            return entry.get("name") or ""
    return species.get("name") or ""


def id_of(path):
    """Aus "pokemon-species/25" wird 25."""
    return int(path.rstrip("/").split("/")[-1])


def to_row(path, species):
    return PokemonName(
        pokemon_id=id_of(path),
        german=german_name(species)[:60],
        english=(species.get("name") or "")[:60],
    )


def collect(paths):
    """Holt die Spezies (parallel, mit Cache) und macht Zeilen daraus."""
    payloads = pokeapi.get_resources(paths)
    return [to_row(path, species) for path, species in payloads.items()]


def store(rows):
    """Schreibt die Namen in die Tabelle - vorhandene werden ersetzt."""
    PokemonName.objects.all().delete()
    PokemonName.objects.bulk_create(rows, batch_size=200)
    return len(rows)


def import_names(batch_size=100, on_progress=None):
    """Sammelt alle deutschen Namen ein. Gibt die Anzahl zurueck.

    In Haeppchen, damit man beim Laufen sieht, dass es vorangeht - und damit
    nicht 1302 Antworten gleichzeitig im Speicher liegen.
    """
    paths = species_paths()
    rows = []
    for start in range(0, len(paths), batch_size):
        haeppchen = paths[start : start + batch_size]
        rows.extend(collect(haeppchen))
        if on_progress:
            on_progress(len(rows), len(paths))
    return store(rows)


def all_names():
    """Alle Namen als Liste - genau das, was die Suche im Frontend braucht."""
    return [
        {"id": row.pokemon_id, "de": row.german, "en": row.english}
        for row in PokemonName.objects.all()
    ]


def german_by_id():
    """{25: "Pikachu", ...} - zum Anreichern der Listen-Endpoints."""
    return dict(PokemonName.objects.values_list("pokemon_id", "german"))
