"""Tests fuer die Team-Presets (M3, Nachzuegler)."""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import TeamPreset, TeamPresetMember

PASSWORD = "Pikachu-Blitz-42"


def raw_pokemon(pokemon_id):
    return {
        "id": pokemon_id,
        "name": f"pokemon-{pokemon_id}",
        "sprites": {"other": {"official-artwork": {"front_default": "bild.png"}}},
        "types": [{"type": {"name": "water"}}],
        "stats": [],
        "base_experience": 64,
    }


def fake_pokeapi(paths):
    return [raw_pokemon(int(path.split("/")[-1])) for path in paths]


def preset(name="Wasser-Team", pokemon_ids=(7, 9), created="2026-07-13T09:00:00Z"):
    return {"name": name, "created": created, "pokemonIds": list(pokemon_ids)}


class PresetTests(TestCase):
    """Gespeicherte Teams - lesen, ersetzen, und vor allem: wieder ladbar."""

    def setUp(self):
        self.client = APIClient()
        self.ash = User.objects.create_user(username="ash", password=PASSWORD)
        self.client.force_authenticate(self.ash)

    def put(self, presets):
        with patch("api.preset_views.pokeapi.get_in_order", side_effect=fake_pokeapi):
            return self.client.put("/api/presets", {"presets": presets}, format="json")

    def test_presets_need_a_login(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/presets").status_code, 401)

    def test_saving_stores_only_numbers_and_slots(self):
        self.put([preset()])

        members = TeamPresetMember.objects.filter(preset__user=self.ash)
        self.assertEqual([m.pokemon_id for m in members], [7, 9])
        self.assertEqual([m.slot for m in members], [0, 1])

    def test_the_answer_carries_the_details_from_the_cache(self):
        """Nur so kann das Frontend ein Preset direkt ins Team laden."""
        response = self.put([preset()])

        stored = response.json()["presets"][0]
        self.assertEqual(stored["name"], "Wasser-Team")
        self.assertEqual([p["id"] for p in stored["team"]], [7, 9])
        self.assertEqual(stored["team"][0]["image"], "bild.png")

    def test_saving_again_replaces_the_old_presets(self):
        self.put([preset(name="Alt")])

        self.put([preset(name="Neu")])

        names = list(TeamPreset.objects.filter(user=self.ash).values_list("name", flat=True))
        self.assertEqual(names, ["Neu"])

    def test_a_preset_without_a_name_is_refused(self):
        response = self.put([preset(name="   ")])

        self.assertEqual(response.status_code, 400)

    def test_a_broken_preset_does_not_destroy_the_old_ones(self):
        """Erst pruefen, dann ersetzen - sonst waeren die alten schon weg."""
        self.put([preset(name="Bewaehrt")])

        response = self.put([preset(name="Gut"), preset(name="Kaputt", pokemon_ids=["x"])])

        self.assertEqual(response.status_code, 400)
        names = list(TeamPreset.objects.filter(user=self.ash).values_list("name", flat=True))
        self.assertEqual(names, ["Bewaehrt"])

    def test_nobody_sees_the_presets_of_someone_else(self):
        self.put([preset()])
        misty = User.objects.create_user(username="misty", password=PASSWORD)
        self.client.force_authenticate(misty)

        self.assertEqual(self.client.get("/api/presets").json()["presets"], [])
