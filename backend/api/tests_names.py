"""Tests fuer die deutschen Pokemon-Namen."""

from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from . import names
from .models import PokemonName

INDEX = {
    "results": [
        {"name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon-species/1/"},
        {"name": "eevee", "url": "https://pokeapi.co/api/v2/pokemon-species/133/"},
    ]
}

SPECIES = {
    "pokemon-species/1": {
        "name": "bulbasaur",
        "names": [
            {"language": {"name": "en"}, "name": "Bulbasaur"},
            {"language": {"name": "de"}, "name": "Bisasam"},
        ],
    },
    "pokemon-species/133": {
        "name": "eevee",
        "names": [
            {"language": {"name": "ja"}, "name": "イーブイ"},
            {"language": {"name": "de"}, "name": "Evoli"},
        ],
    },
}


def fake_resource(path):
    return INDEX


def fake_resources(paths):
    return {path: SPECIES[path] for path in paths}


class ImportTests(TestCase):
    """Der Befehl `namen_laden` sammelt die Namen einmalig ein."""

    def import_them(self):
        with patch("api.names.pokeapi.get_resource", side_effect=fake_resource):
            with patch("api.names.pokeapi.get_resources", side_effect=fake_resources):
                return names.import_names()

    def test_import_stores_the_german_names(self):
        anzahl = self.import_them()

        self.assertEqual(anzahl, 2)
        self.assertEqual(PokemonName.objects.get(pokemon_id=133).german, "Evoli")
        self.assertEqual(PokemonName.objects.get(pokemon_id=1).german, "Bisasam")

    def test_import_keeps_the_english_name_too(self):
        """Die Suche soll beide Sprachen finden."""
        self.import_them()

        self.assertEqual(PokemonName.objects.get(pokemon_id=133).english, "eevee")

    def test_a_second_import_does_not_duplicate(self):
        self.import_them()

        self.import_them()

        self.assertEqual(PokemonName.objects.count(), 2)

    def test_without_a_german_name_the_english_one_is_used(self):
        """Manche Formen haben keinen deutschen Namen hinterlegt."""
        ohne_deutsch = {"name": "wo-chien", "names": [{"language": {"name": "en"}, "name": "Wo-Chien"}]}

        self.assertEqual(names.german_name(ohne_deutsch), "wo-chien")


class NameEndpointTests(TestCase):
    """GET /api/pokemon/names/ - die Grundlage der Suche im Frontend."""

    def setUp(self):
        self.client = APIClient()
        PokemonName.objects.create(pokemon_id=1, german="Bisasam", english="bulbasaur")
        PokemonName.objects.create(pokemon_id=133, german="Evoli", english="eevee")

    def test_the_endpoint_lists_all_names(self):
        response = self.client.get("/api/pokemon/names/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 2)
        self.assertIn({"id": 133, "de": "Evoli", "en": "eevee"}, response.json()["names"])

    def test_an_empty_table_gives_an_empty_list(self):
        """Solange `namen_laden` nicht lief, zeigt das Frontend eben Englisch."""
        PokemonName.objects.all().delete()

        response = self.client.get("/api/pokemon/names/")

        self.assertEqual(response.json(), {"count": 0, "names": []})

    def test_names_route_is_not_swallowed_by_the_type_route(self):
        """/api/pokemon/names/ darf nicht als Typ "names" gelesen werden."""
        response = self.client.get("/api/pokemon/names/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("names", response.json())
