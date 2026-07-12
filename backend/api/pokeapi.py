"""Zugriff auf die PokeAPI - mit Cache in der eigenen Datenbank.

Ablauf bei jeder Anfrage:

1. Steht die Ressource schon (und noch frisch) in der Tabelle CachedResource?
   -> direkt von dort ausliefern.
2. Sonst bei der PokeAPI holen, in der Tabelle speichern und ausliefern.

Dadurch fragt das Backend die PokeAPI pro Ressource nur einmal pro Woche an,
egal wie viele Nutzer den Pokedex oeffnen.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import requests
from django.conf import settings
from django.db import OperationalError
from django.utils import timezone

from .models import CachedResource

logger = logging.getLogger(__name__)

BASE_URL = "https://pokeapi.co/api/v2"
TIMEOUT_SECONDS = 10
MAX_PARALLEL_DOWNLOADS = 8


class PokeApiError(Exception):
    """Die PokeAPI war nicht erreichbar oder hat einen Fehler geliefert."""


class PokeApiNotFound(PokeApiError):
    """Die angefragte Ressource gibt es bei der PokeAPI nicht."""


def cache_ttl():
    """Wie lange ein Cache-Eintrag als frisch gilt."""
    return timedelta(days=getattr(settings, "POKEAPI_CACHE_TTL_DAYS", 7))


def normalize_path(target):
    """Macht aus "/pokemon/25/" oder einer vollen URL den Pfad "pokemon/25"."""
    path = str(target or "").strip()
    if path.startswith(BASE_URL):
        path = path[len(BASE_URL) :]
    return path.strip("/")


def is_fresh(entry):
    """True, solange der Eintrag noch nicht abgelaufen ist."""
    return timezone.now() - entry.fetched_at < cache_ttl()


def read_cache(paths):
    """Liefert {pfad: payload} fuer alle noch frischen Cache-Eintraege."""
    entries = CachedResource.objects.filter(path__in=paths)
    return {entry.path: entry.payload for entry in entries if is_fresh(entry)}


def write_cache(path, payload):
    """Legt eine Antwort im Cache ab (oder frischt sie auf).

    Klappt das nicht (z.B. weil SQLite gerade gesperrt ist), ist das kein
    Beinbruch: Die Daten sind ja schon geholt. Der Cache ist nur eine
    Beschleunigung, kein Muss - die Anfrage darf daran nicht scheitern.
    """
    try:
        CachedResource.objects.update_or_create(path=path, defaults={"payload": payload})
    except OperationalError as error:
        logger.warning("Cache-Eintrag %s nicht gespeichert: %s", path, error)


def download(path):
    """Holt genau eine Ressource frisch von der PokeAPI."""
    try:
        response = requests.get(f"{BASE_URL}/{path}", timeout=TIMEOUT_SECONDS)
    except requests.RequestException as error:
        raise PokeApiError(f"PokeAPI nicht erreichbar: {path}") from error
    if response.status_code == 404:
        raise PokeApiNotFound(f"Bei der PokeAPI nicht gefunden: {path}")
    if not response.ok:
        raise PokeApiError(f"PokeAPI antwortete mit {response.status_code}: {path}")
    return response.json()


def download_many(paths):
    """Laedt mehrere Ressourcen parallel. Bewusst ohne Datenbankzugriff."""
    if not paths:
        return {}
    workers = min(MAX_PARALLEL_DOWNLOADS, len(paths))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        payloads = list(pool.map(download, paths))
    return dict(zip(paths, payloads))


def get_resources(targets):
    """Mehrere Ressourcen auf einmal: Cache-Treffer plus parallele Nachladung."""
    paths = list(dict.fromkeys(normalize_path(target) for target in targets))
    cached = read_cache(paths)
    downloaded = download_many([path for path in paths if path not in cached])
    for path, payload in downloaded.items():
        write_cache(path, payload)
    return {**cached, **downloaded}


def get_resource(target):
    """Eine einzelne Ressource: erst Cache, sonst PokeAPI."""
    return get_resources([target])[normalize_path(target)]


def get_in_order(urls):
    """Holt viele Ressourcen und behaelt die Reihenfolge der URLs bei."""
    payloads = get_resources(urls)
    return [payloads[normalize_path(url)] for url in urls]
