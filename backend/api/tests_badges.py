"""Tests fuer die Arena-Orden."""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

PASSWORD = "Pikachu-Blitz-42"


class BadgeTests(TestCase):
    """Orden lesen, ersetzen - und Unsinn abwehren."""

    def setUp(self):
        self.client = APIClient()
        self.ash = User.objects.create_user(username="ash", password=PASSWORD)
        self.client.force_authenticate(self.ash)

    def test_badges_need_a_login(self):
        self.client.force_authenticate(None)

        self.assertEqual(self.client.get("/api/badges").status_code, 401)

    def test_put_and_get_roundtrip(self):
        antwort = self.client.put(
            "/api/badges", {"leaderKeys": ["misty", "rocko", "rocko"]}, format="json"
        )

        self.assertEqual(antwort.status_code, 200)
        self.assertEqual(antwort.json()["leaderKeys"], ["misty", "rocko"])
        self.assertEqual(
            self.client.get("/api/badges").json()["leaderKeys"], ["misty", "rocko"]
        )

    def test_rejects_broken_payload(self):
        self.assertEqual(
            self.client.put(
                "/api/badges", {"leaderKeys": "rocko"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.put(
                "/api/badges", {"leaderKeys": [""]}, format="json"
            ).status_code,
            400,
        )
