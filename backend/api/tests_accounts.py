"""Tests fuer Konto, Team, Favoriten und Notizen (M3).

Die PokeAPI wird auch hier nicht wirklich gefragt - `get_in_order` ist durch
eine Attrappe ersetzt.
"""

from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Favorite, Note, TeamMember

GOOD_PASSWORD = "Pikachu-Blitz-42"


def raw_pokemon(pokemon_id):
    """So knapp wie moeglich - nur die Felder, die transform.slim_pokemon liest."""
    return {
        "id": pokemon_id,
        "name": f"pokemon-{pokemon_id}",
        "sprites": {"other": {"official-artwork": {"front_default": "bild.png"}}},
        "types": [{"type": {"name": "fire"}}],
        "stats": [],
        "base_experience": 64,
    }


def fake_pokeapi(paths):
    """Ersatz fuer pokeapi.get_in_order: liefert zu jedem Pfad ein Pokemon."""
    return [raw_pokemon(int(path.split("/")[-1])) for path in paths]


class RegisterTests(TestCase):
    """Anmelden kann sich nur, wer sich vorher registriert hat."""

    def setUp(self):
        self.client = APIClient()

    def test_register_returns_a_token(self):
        response = self.client.post(
            "/api/auth/register",
            {"username": "ash", "password": GOOD_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()["token"])
        self.assertEqual(response.json()["username"], "ash")

    def test_the_password_is_not_stored_in_plain_text(self):
        """Django speichert nur einen Hash - nachpruefen schadet nicht."""
        self.client.post(
            "/api/auth/register",
            {"username": "ash", "password": GOOD_PASSWORD},
            format="json",
        )

        user = User.objects.get(username="ash")
        self.assertNotEqual(user.password, GOOD_PASSWORD)
        self.assertTrue(user.check_password(GOOD_PASSWORD))

    def test_a_weak_password_is_refused(self):
        response = self.client.post(
            "/api/auth/register", {"username": "ash", "password": "1234"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username="ash").exists())

    def test_the_same_name_twice_is_refused(self):
        User.objects.create_user(username="ash", password=GOOD_PASSWORD)

        response = self.client.post(
            "/api/auth/register",
            {"username": "ASH", "password": GOOD_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.filter(username__iexact="ash").count(), 1)


class LoginTests(TestCase):
    """Login, Logout und die Frage 'wer bin ich?'."""

    def setUp(self):
        self.client = APIClient()
        User.objects.create_user(username="ash", password=GOOD_PASSWORD)

    def login(self):
        response = self.client.post(
            "/api/auth/login",
            {"username": "ash", "password": GOOD_PASSWORD},
            format="json",
        )
        return response.json()["token"]

    def test_login_returns_a_token(self):
        self.assertTrue(self.login())

    def test_wrong_password_is_refused(self):
        response = self.client.post(
            "/api/auth/login", {"username": "ash", "password": "falsch"}, format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_me_needs_a_token(self):
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_me_knows_the_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.login()}")

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.json()["username"], "ash")

    def test_the_token_is_worthless_after_logout(self):
        token = self.login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        self.assertEqual(self.client.post("/api/auth/logout").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)


class TeamTests(TestCase):
    """Das gespeicherte Team - der erste Bereich, der in die Datenbank wandert."""

    def setUp(self):
        self.client = APIClient()
        self.ash = User.objects.create_user(username="ash", password=GOOD_PASSWORD)
        self.client.force_authenticate(self.ash)

    def put_team(self, pokemon_ids):
        with patch("api.team_views.pokeapi.get_in_order", side_effect=fake_pokeapi):
            return self.client.put(
                "/api/team", {"pokemonIds": pokemon_ids}, format="json"
            )

    def test_team_needs_a_login(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/team").status_code, 401)

    def test_saving_a_team_stores_only_numbers_and_slots(self):
        response = self.put_team([1, 4, 7])

        self.assertEqual(response.status_code, 200)
        stored = TeamMember.objects.filter(user=self.ash).order_by("slot")
        self.assertEqual([m.pokemon_id for m in stored], [1, 4, 7])
        self.assertEqual([m.slot for m in stored], [0, 1, 2])

    def test_the_answer_carries_the_details_from_the_cache(self):
        """Das Frontend soll das Team direkt anzeigen koennen."""
        response = self.put_team([25])

        pokemon = response.json()["team"][0]
        self.assertEqual(pokemon["id"], 25)
        self.assertEqual(pokemon["types"], ["fire"])
        self.assertEqual(pokemon["image"], "bild.png")

    def test_saving_again_replaces_the_old_team(self):
        self.put_team([1, 4, 7])

        self.put_team([25])

        self.assertEqual(TeamMember.objects.filter(user=self.ash).count(), 1)

    def test_an_empty_team_is_allowed(self):
        self.put_team([1])

        response = self.put_team([])

        self.assertEqual(response.json()["team"], [])
        self.assertEqual(TeamMember.objects.filter(user=self.ash).count(), 0)

    def test_more_than_six_is_refused(self):
        response = self.put_team([1, 2, 3, 4, 5, 6, 7])

        self.assertEqual(response.status_code, 400)
        self.assertEqual(TeamMember.objects.count(), 0)

    def test_nonsense_instead_of_a_number_is_refused(self):
        response = self.put_team(["Glumanda"])

        self.assertEqual(response.status_code, 400)

    def test_nobody_sees_the_team_of_someone_else(self):
        self.put_team([1, 4, 7])
        misty = User.objects.create_user(username="misty", password=GOOD_PASSWORD)
        self.client.force_authenticate(misty)

        with patch("api.team_views.pokeapi.get_in_order", side_effect=fake_pokeapi):
            response = self.client.get("/api/team")

        self.assertEqual(response.json()["team"], [])


class FavoriteTests(TestCase):
    """Die Herzchen aus MyPokedex."""

    def setUp(self):
        self.client = APIClient()
        self.ash = User.objects.create_user(username="ash", password=GOOD_PASSWORD)
        self.client.force_authenticate(self.ash)

    def test_favorites_need_a_login(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/favorites").status_code, 401)

    def test_saving_and_reading_favorites(self):
        self.client.put("/api/favorites", {"pokemonIds": [25, 6]}, format="json")

        response = self.client.get("/api/favorites")

        self.assertEqual(response.json()["pokemonIds"], [6, 25])

    def test_saving_again_replaces_the_old_favorites(self):
        self.client.put("/api/favorites", {"pokemonIds": [25, 6]}, format="json")

        self.client.put("/api/favorites", {"pokemonIds": [1]}, format="json")

        self.assertEqual(favorite_ids(self.ash), [1])

    def test_the_same_pokemon_twice_lands_once_in_the_database(self):
        response = self.client.put(
            "/api/favorites", {"pokemonIds": [25, 25]}, format="json"
        )

        self.assertEqual(response.json()["pokemonIds"], [25])
        self.assertEqual(Favorite.objects.filter(user=self.ash).count(), 1)

    def test_nonsense_instead_of_a_number_is_refused(self):
        response = self.client.put(
            "/api/favorites", {"pokemonIds": ["Pikachu"]}, format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_nobody_sees_the_favorites_of_someone_else(self):
        self.client.put("/api/favorites", {"pokemonIds": [25]}, format="json")
        misty = User.objects.create_user(username="misty", password=GOOD_PASSWORD)
        self.client.force_authenticate(misty)

        self.assertEqual(self.client.get("/api/favorites").json()["pokemonIds"], [])


def favorite_ids(user):
    return list(
        Favorite.objects.filter(user=user)
        .order_by("pokemon_id")
        .values_list("pokemon_id", flat=True)
    )


class NoteTests(TestCase):
    """Die persoenlichen Notizen zu einzelnen Pokemon."""

    def setUp(self):
        self.client = APIClient()
        self.ash = User.objects.create_user(username="ash", password=GOOD_PASSWORD)
        self.client.force_authenticate(self.ash)

    def put_notes(self, notes):
        return self.client.put("/api/notes", {"notes": notes}, format="json")

    def test_notes_need_a_login(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/notes").status_code, 401)

    def test_saving_and_reading_a_note(self):
        self.put_notes({"25": "Sehr schnell!"})

        response = self.client.get("/api/notes")

        self.assertEqual(response.json()["notes"], {"25": "Sehr schnell!"})

    def test_an_empty_note_deletes_it(self):
        self.put_notes({"25": "Sehr schnell!"})

        response = self.put_notes({"25": "   "})

        self.assertEqual(response.json()["notes"], {})
        self.assertEqual(Note.objects.filter(user=self.ash).count(), 0)

    def test_a_much_too_long_note_is_refused(self):
        response = self.put_notes({"25": "x" * 2001})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Note.objects.count(), 0)

    def test_nobody_sees_the_notes_of_someone_else(self):
        self.put_notes({"25": "Sehr schnell!"})
        misty = User.objects.create_user(username="misty", password=GOOD_PASSWORD)
        self.client.force_authenticate(misty)

        self.assertEqual(self.client.get("/api/notes").json()["notes"], {})
