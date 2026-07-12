from django.db import models


class CachedResource(models.Model):
    """Eine gespeicherte Antwort der PokeAPI.

    Key ist der PokeAPI-Pfad (z.B. "pokemon/25"), Wert die komplette
    JSON-Antwort. Beim naechsten Aufruf liefert das Backend die Daten aus
    dieser Tabelle, statt die PokeAPI erneut zu fragen.
    """

    path = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text='PokeAPI-Pfad ohne Basis-URL, z.B. "pokemon/25".',
    )
    payload = models.JSONField(help_text="Die unveraenderte JSON-Antwort der PokeAPI.")
    fetched_at = models.DateTimeField(
        auto_now=True,
        help_text="Wann der Eintrag zuletzt von der PokeAPI geholt wurde.",
    )

    class Meta:
        ordering = ["path"]
        verbose_name = "Gecachte PokeAPI-Ressource"
        verbose_name_plural = "Gecachte PokeAPI-Ressourcen"

    def __str__(self):
        return self.path
