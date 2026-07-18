"""Tests fuer die Kampfhistorie (M3, dritter Schritt)."""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import BattleParticipant, BattleRecord

PASSWORD = "Pikachu-Blitz-42"


def battle(result="win", damage=120, date="2026-07-13T10:00:00Z"):
    """Ein Kampf, so wie ihn das Frontend schickt."""
    return {
        "id": 1752400000000,
        "date": date,
        "playerTeam": [
            {"id": 6, "name": "Charizard", "types": ["fire", "flying"]},
            {"id": 25, "name": "Pikachu", "types": ["electric"]},
        ],
        "gymLeader": {"name": "Rocko", "type": "rock"},
        "result": result,
        "totalDamageDealt": damage,
        "totalTurns": 8,
        "mvpPokemon": {"id": 6, "name": "Charizard", "damageDealt": 90},
        "pokemonUsed": 2,
    }


class BattleHistoryTests(TestCase):
    """Die Historie waechst - darum wird angehaengt, nicht ersetzt."""

    def setUp(self):
        self.client = APIClient()
        self.ash = User.objects.create_user(username="ash", password=PASSWORD)
        self.client.force_authenticate(self.ash)

    def post(self, entry):
        return self.client.post("/api/battles", {"battle": entry}, format="json")

    def test_history_needs_a_login(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/battles").status_code, 401)

    def test_a_battle_is_appended_not_replacing(self):
        self.post(battle(result="win"))

        response = self.post(battle(result="loss", date="2026-07-13T11:00:00Z"))

        self.assertEqual(len(response.json()["battles"]), 2)

    def test_the_newest_battle_comes_first(self):
        self.post(battle(result="loss", date="2026-07-13T10:00:00Z"))
        self.post(battle(result="win", date="2026-07-13T12:00:00Z"))

        results = [entry["result"] for entry in self.client.get("/api/battles").json()["battles"]]

        self.assertEqual(results, ["win", "loss"])

    def test_the_answer_looks_like_the_entry_in_the_browser(self):
        """Die App liest ihre Historie unveraendert weiter - Format muss passen."""
        entry = self.post(battle()).json()["battles"][0]

        self.assertEqual(entry["result"], "win")
        self.assertEqual(entry["gymLeader"], {"name": "Rocko", "type": "rock"})
        self.assertEqual(entry["mvpPokemon"]["name"], "Charizard")
        self.assertEqual(entry["totalDamageDealt"], 120)
        self.assertEqual(entry["playerTeam"][0]["types"], ["fire", "flying"])

    def test_the_team_of_that_day_is_frozen(self):
        """Ein Kampf ist Geschichte: Er aendert sich nicht mit dem heutigen Team."""
        self.post(battle())

        names = list(
            BattleParticipant.objects.filter(record__user=self.ash).values_list(
                "name", flat=True
            )
        )

        self.assertEqual(names, ["Charizard", "Pikachu"])

    def test_only_the_last_fifty_battles_are_kept(self):
        for minute in range(52):
            self.post(battle(date=f"2026-07-13T10:{minute:02d}:00Z"))

        self.assertEqual(BattleRecord.objects.filter(user=self.ash).count(), 50)

    def test_a_battle_without_a_gym_leader_is_allowed(self):
        entry = battle()
        entry["gymLeader"] = None

        response = self.post(entry)

        self.assertIsNone(response.json()["battles"][0]["gymLeader"])

    def test_nonsense_numbers_do_not_crash_the_backend(self):
        entry = battle()
        entry["totalDamageDealt"] = "ganz viel"
        entry["totalTurns"] = -5

        response = self.post(entry)

        self.assertEqual(response.json()["battles"][0]["totalDamageDealt"], 0)
        self.assertEqual(response.json()["battles"][0]["totalTurns"], 0)

    def test_put_takes_over_the_history_from_the_browser(self):
        """Genau ein Grund dafuer: das frisch angelegte Konto."""
        entries = [
            battle(result="win", date="2026-07-13T12:00:00Z"),
            battle(result="loss", date="2026-07-13T10:00:00Z"),
        ]

        response = self.client.put("/api/battles", {"battles": entries}, format="json")

        results = [entry["result"] for entry in response.json()["battles"]]
        self.assertEqual(results, ["win", "loss"])

    def test_delete_clears_the_history(self):
        self.post(battle())

        response = self.client.delete("/api/battles")

        self.assertEqual(response.json()["battles"], [])
        self.assertEqual(BattleParticipant.objects.count(), 0)

    def test_nobody_sees_the_battles_of_someone_else(self):
        self.post(battle())
        misty = User.objects.create_user(username="misty", password=PASSWORD)
        self.client.force_authenticate(misty)

        self.assertEqual(self.client.get("/api/battles").json()["battles"], [])
