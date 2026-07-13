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

from . import ai, pokeapi
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
    "provider": "groq",
    "messages": [
        {"role": "system", "content": "Du bist Professor Eich."},
        {"role": "user", "content": "Wie ist mein Team?"},
    ],
}


class AiConfigTests(TestCase):
    """Prueft den Aufbau der Anfragen an die einzelnen Anbieter."""

    def test_key_from_environment_lands_in_the_header(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "geheim-123"}):
            config = ai.groq_config(CHAT)

        self.assertEqual(config["headers"]["Authorization"], "Bearer geheim-123")

    def test_the_frontend_wish_beats_ai_provider_env(self):
        with patch.dict("os.environ", {"AI_PROVIDER": "gemini"}):
            self.assertEqual(ai.resolve_provider("groq"), "groq")

    def test_ai_provider_env_is_the_default(self):
        with patch.dict("os.environ", {"AI_PROVIDER": "mistral"}):
            self.assertEqual(ai.resolve_provider(None), "mistral")

    def test_unknown_provider_falls_back_to_the_default(self):
        with patch.dict("os.environ", {"AI_PROVIDER": "mistral"}):
            self.assertEqual(ai.resolve_provider("bibor"), "mistral")

    def test_without_anything_groq_is_used(self):
        with patch.dict("os.environ", {"AI_PROVIDER": ""}):
            self.assertEqual(ai.resolve_provider(None), "groq")

    def test_gemini_separates_the_system_prompt(self):
        with patch.dict("os.environ", {"GEMINI_API_KEY": "g-key"}):
            payload = ai.gemini_config(CHAT)["payload"]

        self.assertEqual(
            payload["system_instruction"]["parts"][0]["text"], "Du bist Professor Eich."
        )
        self.assertEqual(payload["contents"][0]["parts"][0]["text"], "Wie ist mein Team?")

    def test_gemini_answer_is_translated_to_openai_format(self):
        """Das Frontend liest ueberall data.choices[0].message.content."""
        gemini_answer = {"candidates": [{"content": {"parts": [{"text": "Stark!"}]}}]}

        result = ai.normalize_response("gemini", gemini_answer)

        self.assertEqual(result["choices"][0]["message"]["content"], "Stark!")


class AiEndpointTests(TestCase):
    """Prueft den KI-Endpoint so, wie das Frontend ihn aufruft."""

    def setUp(self):
        self.client = APIClient()
        cache.clear()  # sonst zaehlt das Rate-Limit ueber Tests hinweg weiter

    def test_ping(self):
        response = self.client.get("/api/ai/ping")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_chat_returns_the_answer(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "k", "AI_PROVIDER": ""}):
            with patch.object(ai.requests, "post", return_value=fake_provider_response()):
                response = self.client.post("/api/ai", CHAT, format="json")

        content = response.json()["choices"][0]["message"]["content"]
        self.assertEqual(response.status_code, 200)
        self.assertEqual(content, "Ein starkes Team!")

    def test_chat_asks_the_provider_the_frontend_wants(self):
        """Die Fallback-Kette des Frontends braucht das: Wunsch schlaegt .env."""
        keys = {"GROQ_API_KEY": "k", "GEMINI_API_KEY": "g", "AI_PROVIDER": "gemini"}

        with patch.dict("os.environ", keys):
            with patch.object(
                ai.requests, "post", return_value=fake_provider_response()
            ) as post:
                self.client.post("/api/ai", CHAT, format="json")

        self.assertIn("groq.com", post.call_args.args[0])

    def test_the_api_key_never_reaches_the_browser(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "streng-geheim", "AI_PROVIDER": ""}):
            with patch.object(ai.requests, "post", return_value=fake_provider_response()):
                response = self.client.post("/api/ai", CHAT, format="json")

        self.assertNotIn("streng-geheim", response.content.decode())

    def test_missing_key_gives_500(self):
        with patch.dict("os.environ", {"GROQ_API_KEY": "", "AI_PROVIDER": ""}):
            response = self.client.post("/api/ai", CHAT, format="json")

        self.assertEqual(response.status_code, 500)
        self.assertIn("Kein API-Key", response.json()["error"])

    def test_provider_error_is_passed_through(self):
        failure = fake_provider_response(status=429, payload={"error": "zu schnell"})

        with patch.dict("os.environ", {"GROQ_API_KEY": "k", "AI_PROVIDER": ""}):
            with patch.object(ai.requests, "post", return_value=failure):
                response = self.client.post("/api/ai", CHAT, format="json")

        self.assertEqual(response.status_code, 429)

    def test_rate_limit_blocks_the_third_request(self):
        """Schutz fuers Guthaben des API-Keys. Echt sind 30/min - hier 2/min."""
        with patch.object(AiRateThrottle, "get_rate", return_value="2/min"):
            with patch.dict("os.environ", {"GROQ_API_KEY": "k", "AI_PROVIDER": ""}):
                with patch.object(
                    ai.requests, "post", return_value=fake_provider_response()
                ):
                    first = self.client.post("/api/ai", CHAT, format="json")
                    second = self.client.post("/api/ai", CHAT, format="json")
                    third = self.client.post("/api/ai", CHAT, format="json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(third.status_code, 429)
