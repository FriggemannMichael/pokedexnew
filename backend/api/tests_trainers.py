"""Tests fuer die Trainer-Liste (Gegner + Rangliste)."""

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils.timezone import now
from rest_framework.test import APIClient

from .models import BattleRecord, TeamMember

PASSWORD = "Pikachu-Blitz-42"


def team_anlegen(user, pokemon_ids):
    for slot, pokemon_id in enumerate(pokemon_ids):
        TeamMember.objects.create(user=user, slot=slot, pokemon_id=pokemon_id)


def kampf_anlegen(user, result):
    BattleRecord.objects.create(
        user=user,
        result=result,
        fought_at=now(),
        gym_leader_name="Rocko",
        gym_leader_type="rock",
    )


class TrainerTests(TestCase):
    """Wer ein Team gespeichert hat, ist Gegner und steht in der Rangliste."""

    def setUp(self):
        self.client = APIClient()
        self.ash = User.objects.create_user(username="ash", password=PASSWORD)
        self.misty = User.objects.create_user(username="misty", password=PASSWORD)
        self.client.force_authenticate(self.ash)

    def test_trainers_need_a_login(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/trainers").status_code, 401)

    def test_lists_only_users_with_a_team(self):
        team_anlegen(self.misty, [120, 121])
        User.objects.create_user(username="ohne_team", password=PASSWORD)

        data = self.client.get("/api/trainers").json()

        namen = [t["username"] for t in data["trainers"]]
        self.assertEqual(namen, ["misty"])
        self.assertEqual(data["trainers"][0]["pokemonIds"], [120, 121])

    def test_own_team_is_included_for_the_ranking(self):
        team_anlegen(self.ash, [25])
        team_anlegen(self.misty, [120])

        namen = [t["username"] for t in self.client.get("/api/trainers").json()["trainers"]]

        self.assertEqual(namen, ["ash", "misty"])

    def test_counts_battles_and_wins(self):
        team_anlegen(self.misty, [120])
        kampf_anlegen(self.misty, BattleRecord.WIN)
        kampf_anlegen(self.misty, BattleRecord.WIN)
        kampf_anlegen(self.misty, BattleRecord.LOSS)

        eintrag = self.client.get("/api/trainers").json()["trainers"][0]

        self.assertEqual(eintrag["battles"], 3)
        self.assertEqual(eintrag["wins"], 2)
