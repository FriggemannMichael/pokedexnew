"""Bremse fuer den KI-Proxy."""

from rest_framework.throttling import SimpleRateThrottle


class AiRateThrottle(SimpleRateThrottle):
    """Hoechstens 30 KI-Anfragen pro Minute und IP-Adresse.

    Zaehlt immer nach IP - auch fuer eingeloggte Nutzer (spaeter). Ohne diese
    Bremse koennte eine einzige Seite das Budget des API-Keys leerlaufen lassen.
    Die Grenze steht in settings.py unter DEFAULT_THROTTLE_RATES["ai"].
    """

    scope = "ai"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
