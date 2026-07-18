"""Tests fuer den PokeAPI-Cache, den KI-Proxy und die Endpoints.

Weder die echte PokeAPI noch ein KI-Anbieter werden hier angefragt. Stattdessen
ersetzen wir mit `patch` die Netzwerk-Funktionen durch Attrappen. So sind die
Tests schnell und funktionieren auch ohne Internet und ohne API-Keys.
"""

from unittest.mock import Mock, patch

from django.core.cache import cache
from django.db import OperationalError
from django.test import TestCase
from rest_framework.test import APIClient

from . import ai, pokeapi, prompts
from .models import CachedResource
from .throttling import AiRateThrottle
from .transform import slim_pokemon

ARTWORK = "https://img.example/bulbasaur.png"


def fake_pokemon(pokemon_id=1, name="bulbasaur"):
    """Eine stark verkuerzte PokeAPI-Antwort, wie sie fuer ein Pokemon kaeme."""
    return {
        "id": pokemon_id,
        "name": name,
        "base_experience": 64,
        "sprites": {"other": {"official-artwork": {"front_default": ARTWORK}}},
        "types": [{"type": {"name": "grass"}}, {"type": {"name": "poison"}}],
        "stats": [{"stat": {"name": "hp"}, "base_stat": 45}],
    }


def fake_index():
    """Die Listen-Antwort der PokeAPI (nur Namen und URLs, keine Details)."""
    return {
        "count": 1351,
        "results": [{"name": "bulbasaur", "url": f"{pokeapi.BASE_URL}/pokemon/1/"}],
    }


class TransformTests(TestCase):
    """Prueft das schlanke Format, das das Frontend erwartet."""

    def test_slim_pokemon_keeps_fields_the_frontend_needs(self):
        result = slim_pokemon(fake_pokemon())

        self.assertEqual(result["id"], 1)
        self.assertEqual(result["name"], "bulbasaur")
        self.assertEqual(result["image"], ARTWORK)
        self.assertEqual(result["types"], ["grass", "poison"])
        self.assertEqual(result["base_experience"], 64)

    def test_stats_stay_a_list(self):
        """Team-Builder und MyPokedex rechnen mit der rohen Stats-Liste."""
        result = slim_pokemon(fake_pokemon())

        self.assertIsInstance(result["stats"], list)
        self.assertEqual(result["stats"][0]["base_stat"], 45)

    def test_missing_artwork_falls_back_to_default_sprite(self):
        raw = fake_pokemon()
        raw["sprites"] = {"front_default": "https://img.example/fallback.png"}

        self.assertEqual(slim_pokemon(raw)["image"], "https://img.example/fallback.png")


class CacheTests(TestCase):
    """Prueft, dass jede Ressource nur EINMAL bei der PokeAPI geholt wird."""

    def test_second_call_comes_from_the_database(self):
        with patch.object(pokeapi, "download", return_value=fake_pokemon()) as mock:
            pokeapi.get_resource("pokemon/1")
            pokeapi.get_resource("pokemon/1")

        self.assertEqual(mock.call_count, 1)
        self.assertEqual(CachedResource.objects.count(), 1)

    def test_full_url_and_short_path_are_the_same_cache_entry(self):
        with patch.object(pokeapi, "download", return_value=fake_pokemon()) as mock:
            pokeapi.get_resource("pokemon/1")
            pokeapi.get_resource(f"{pokeapi.BASE_URL}/pokemon/1/")

        self.assertEqual(mock.call_count, 1)

    def test_locked_database_does_not_break_the_request(self):
        """Der Cache ist nur eine Beschleunigung - er darf die Antwort nie kippen."""
        locked = OperationalError("database is locked")

        with patch.object(pokeapi, "download", return_value=fake_pokemon()):
            with patch.object(CachedResource.objects, "update_or_create", side_effect=locked):
                result = pokeapi.get_resource("pokemon/1")

        self.assertEqual(result["name"], "bulbasaur")

    def test_stale_entry_is_fetched_again(self):
        CachedResource.objects.create(path="pokemon/1", payload={"id": 1})
        entry = CachedResource.objects.get(path="pokemon/1")

        with patch.object(pokeapi, "is_fresh", return_value=False):
            with patch.object(pokeapi, "download", return_value=fake_pokemon()) as mock:
                pokeapi.get_resource("pokemon/1")

        self.assertEqual(mock.call_count, 1)
        entry.refresh_from_db()
        self.assertEqual(entry.payload["name"], "bulbasaur")


class EndpointTests(TestCase):
    """Prueft die Endpoints so, wie das Frontend sie aufruft."""

    def setUp(self):
        self.client = APIClient()

    def test_health(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_pokemon_list_returns_slim_results(self):
        payloads = {
            "pokemon?offset=0&limit=1": fake_index(),
            "pokemon/1": fake_pokemon(),
        }

        with patch.object(pokeapi, "download", side_effect=lambda path: payloads[path]):
            response = self.client.get("/api/pokemon/?offset=0&limit=1")

        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(body["count"], 1351)
        self.assertEqual(body["results"][0]["name"], "bulbasaur")

    def test_limit_is_capped(self):
        """Ein riesiges limit darf das Backend nicht in tausende Downloads treiben."""
        empty = {"count": 0, "results": []}

        with patch.object(pokeapi, "download", return_value=empty) as mock:
            self.client.get("/api/pokemon/?limit=99999")

        mock.assert_called_once_with("pokemon?offset=0&limit=100")

    def test_unknown_pokemon_gives_404(self):
        error = pokeapi.PokeApiNotFound("gibt es nicht")

        with patch.object(pokeapi, "download", side_effect=error):
            response = self.client.get("/api/pokeapi/pokemon/999999")

        self.assertEqual(response.status_code, 404)

    def test_unreachable_pokeapi_gives_502(self):
        error = pokeapi.PokeApiError("offline")

        with patch.object(pokeapi, "download", side_effect=error):
            response = self.client.get("/api/pokeapi/type/fire")

        self.assertEqual(response.status_code, 502)

    def test_proxy_keeps_the_query_string(self):
        """Die Suche ruft /pokemon?limit=10000 auf - das limit darf nicht verloren gehen."""
        with patch.object(pokeapi, "download", return_value={"results": []}) as mock:
            self.client.get("/api/pokeapi/pokemon?limit=10000")

        mock.assert_called_once_with("pokemon?limit=10000")


def fake_provider_response(status=200, payload=None):
    """Eine Antwort, wie sie ein KI-Anbieter schicken wuerde."""
    response = Mock()
    response.ok = status < 400
    response.status_code = status
    response.json.return_value = payload or {
        "choices": [{"message": {"content": "Ein starkes Team!"}}]
    }
    return response


CHAT = {
    "messages": [
        {"role": "system", "content": "Du bist Professor Eich."},
        {"role": "user", "content": "Wie ist mein Team?"},
    ],
}

TEAM = [
    {"id": 1, "name": "bulbasaur", "types": ["Pflanze"], "stats": {"hp": 45}},
    {"id": 4, "name": "charmander", "types": ["Feuer"], "stats": {"hp": 39}},
]

ALL_KEY_NAMES = (
    "GROQ_API_KEY",
    "OPENROUTER_API_KEY",
    "MISTRAL_API_KEY",
    "GEMINI_API_KEY",
)


def only_keys(*names, **extra):
    """Eine Umgebung, in der genau die genannten Anbieter einen Key haben."""
    environment = {name: ("k" if name in names else "") for name in ALL_KEY_NAMES}
    environment["AI_PROVIDER"] = ""
    environment.update(extra)
    return environment


class AiConfigTests(TestCase):
    """Prueft den Aufbau der Anfragen an die einzelnen Anbieter."""

    def test_key_from_environment_lands_in_the_header(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "geheim-123"}):
            config = ai.groq_config(CHAT)

        self.assertEqual(config["headers"]["Authorization"], "Bearer geheim-123")

    def test_gemini_separates_the_system_prompt(self):
        with patch.dict("os.environ", {"GEMINI_API_KEY": "g-key"}):
            payload = ai.gemini_config(CHAT)["payload"]

        self.assertEqual(
            payload["system_instruction"]["parts"][0]["text"], "Du bist Professor Eich."
        )
        self.assertEqual(payload["contents"][0]["parts"][0]["text"], "Wie ist mein Team?")

    def test_ai_provider_decides_who_is_asked_first(self):
        with patch.dict("os.environ", only_keys("GROQ_API_KEY", AI_PROVIDER="mistral")):
            self.assertEqual(ai.default_provider(), "mistral")

    def test_without_ai_provider_groq_is_asked_first(self):
        with patch.dict("os.environ", only_keys("GROQ_API_KEY")):
            self.assertEqual(ai.default_provider(), "groq")

    def test_chain_skips_providers_without_key(self):
        """Wen man nicht fragen kann, den fragt man auch nicht."""
        with patch.dict("os.environ", only_keys("GROQ_API_KEY", "MISTRAL_API_KEY")):
            self.assertEqual(ai.provider_chain(), ["groq", "mistral"])

    def test_chain_starts_with_the_default_provider(self):
        keys = only_keys("GROQ_API_KEY", "GEMINI_API_KEY", AI_PROVIDER="gemini")

        with patch.dict("os.environ", keys):
            self.assertEqual(ai.provider_chain(), ["gemini", "groq"])

    def test_json_is_read_even_with_chatter_around_it(self):
        """Manche Anbieter schreiben trotz Ansage noch etwas dazu."""
        raw = 'Klar doch!\n```json\n{"overall_rating": 7}\n```'

        self.assertEqual(ai.parse_json(raw), {"overall_rating": 7})

    def test_answer_without_json_gives_none(self):
        self.assertIsNone(ai.parse_json("Dein Team ist super."))


class AiFallbackTests(TestCase):
    """Faellt ein Anbieter aus, muss der naechste einspringen."""

    def test_next_provider_takes_over_after_an_error(self):
        """Genau der Fall, der die App lahmlegte: Geminis Freikontingent war leer."""
        failure = fake_provider_response(status=429, payload={"error": "kein Guthaben"})
        answers = [failure, fake_provider_response()]
        keys = only_keys("GEMINI_API_KEY", "GROQ_API_KEY", AI_PROVIDER="gemini")

        with patch.dict("os.environ", keys):
            with patch.object(ai.requests, "post", side_effect=answers) as post:
                provider, content = ai.chat(CHAT["messages"])

        self.assertIn("googleapis", post.call_args_list[0].args[0])  # zuerst Gemini
        self.assertEqual(provider, "groq")  # dann der naechste mit Key
        self.assertEqual(content, "Ein starkes Team!")

    def test_the_last_error_survives_if_nobody_answers(self):
        failure = fake_provider_response(status=429, payload={"error": "kein Guthaben"})

        with patch.dict("os.environ", only_keys("GROQ_API_KEY")):
            with patch.object(ai.requests, "post", return_value=failure):
                with self.assertRaises(ai.AiError) as caught:
                    ai.chat(CHAT["messages"])

        self.assertEqual(caught.exception.status, 429)

    def test_without_any_key_nobody_is_asked(self):
        with patch.dict("os.environ", only_keys()):
            with self.assertRaises(ai.AiError) as caught:
                ai.chat(CHAT["messages"])

        self.assertEqual(caught.exception.status, 500)

    def test_gemini_answer_is_translated_to_openai_format(self):
        """Das Frontend liest ueberall data.choices[0].message.content."""
        gemini_answer = {"candidates": [{"content": {"parts": [{"text": "Stark!"}]}}]}

        result = ai.normalize_response("gemini", gemini_answer)

        self.assertEqual(result["choices"][0]["message"]["content"], "Stark!")


class PromptTests(TestCase):
    """Die Prompts entstehen im Backend - das Frontend schickt nur Rohdaten."""

    def test_the_prompt_carries_the_team_data(self):
        messages = prompts.team_advice(TEAM, {"weaknesses": ["Feuer"]})

        self.assertEqual(messages[0]["role"], "system")
        self.assertIn("Professor Eich", messages[0]["content"])
        self.assertIn("bulbasaur", messages[1]["content"])
        self.assertIn("Feuer", messages[1]["content"])

    def test_a_full_team_is_not_told_to_grow(self):
        """Sonst rief die KI ein 6er-Team dazu auf, noch jemanden aufzunehmen."""
        full_team = TEAM * 3

        system = prompts.team_advice(full_team, {})[0]["content"]

        self.assertIn("VOLLSTAENDIG", system)

    def test_useless_fields_are_left_out_of_the_prompt(self):
        """Ein ganzes Pokemon-Objekt wuerde den Prompt nur aufblaehen."""
        fat_team = [{"id": 1, "name": "bulbasaur", "sprites": {"front": "bild.png"}}]

        user = prompts.team_advice(fat_team, {})[1]["content"]

        self.assertIn("bulbasaur", user)
        self.assertNotIn("bild.png", user)


class AiEndpointTests(TestCase):
    """Prueft die KI-Endpoints so, wie das Frontend sie aufruft."""

    def setUp(self):
        self.client = APIClient()
        cache.clear()  # sonst zaehlt das Rate-Limit ueber Tests hinweg weiter

    def post(self, path, payload, answer=None):
        """Ein Aufruf, bei dem der KI-Anbieter durch eine Attrappe ersetzt ist."""
        response = answer or fake_provider_response()
        with patch.dict("os.environ", only_keys("GROQ_API_KEY")):
            with patch.object(ai.requests, "post", return_value=response):
                return self.client.post(path, payload, format="json")

    def test_ping(self):
        response = self.client.get("/api/ai/ping")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_team_advice_returns_text(self):
        response = self.post("/api/ai/team-advice", {"team": TEAM, "staticAnalysis": {}})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["text"], "Ein starkes Team!")
        self.assertEqual(response.json()["providerLabel"], "Groq")

    def test_battle_commentary_returns_text(self):
        move = {
            "attackerName": "Glumanda",
            "moveName": "Glut",
            "defenderName": "Bisasam",
            "effectiveness": "sehr effektiv",
        }

        response = self.post("/api/ai/battle-commentary", move)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["text"], "Ein starkes Team!")

    def test_gym_dialogue_is_cut_to_twelve_words(self):
        """Der Arenaleiter soll knapp bleiben, auch wenn die KI ausschweift."""
        babble = fake_provider_response(
            payload={"choices": [{"message": {"content": "wort " * 30}}]}
        )

        response = self.post("/api/ai/gym-dialogue", {"leaderName": "Rocko"}, babble)

        self.assertEqual(len(response.json()["text"].split()), 12)

    def test_team_analysis_returns_parsed_json(self):
        json_answer = fake_provider_response(
            payload={"choices": [{"message": {"content": '{"overall_rating": 8}'}}]}
        )

        response = self.post("/api/ai/team-analysis", {"team": TEAM}, json_answer)

        self.assertEqual(response.json()["parsed"], {"overall_rating": 8})
        self.assertEqual(response.json()["provider"], "groq")

    def test_answer_without_json_leaves_parsed_empty(self):
        """Das Frontend faellt dann auf seine lokale Analyse zurueck."""
        response = self.post("/api/ai/gym-strategy", {"playerTeam": TEAM})

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["parsed"])

    def test_the_api_key_never_reaches_the_browser(self):
        with patch.dict("os.environ", only_keys("GROQ_API_KEY", GROQ_API_KEY="geheim")):
            with patch.object(ai.requests, "post", return_value=fake_provider_response()):
                response = self.client.post(
                    "/api/ai/team-advice", {"team": TEAM}, format="json"
                )

        self.assertNotIn("geheim", response.content.decode())

    def test_missing_key_gives_500(self):
        with patch.dict("os.environ", only_keys()):
            response = self.client.post(
                "/api/ai/team-advice", {"team": TEAM}, format="json"
            )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Kein API-Key", response.json()["error"])

    def test_provider_error_is_passed_through(self):
        failure = fake_provider_response(status=429, payload={"error": "zu schnell"})

        response = self.post("/api/ai/team-advice", {"team": TEAM}, failure)

        self.assertEqual(response.status_code, 429)

    def test_rate_limit_blocks_the_third_request(self):
        """Schutz fuers Guthaben des API-Keys. Echt sind 30/min - hier 2/min."""
        with patch.object(AiRateThrottle, "get_rate", return_value="2/min"):
            first = self.post("/api/ai/team-advice", {"team": TEAM})
            second = self.post("/api/ai/team-advice", {"team": TEAM})
            third = self.post("/api/ai/team-advice", {"team": TEAM})

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(third.status_code, 429)

    def test_the_old_open_proxy_is_gone(self):
        """Frueher konnte hier jeder beliebige Prompts auf Kosten des Keys stellen."""
        response = self.client.post("/api/ai", CHAT, format="json")

        self.assertEqual(response.status_code, 404)
