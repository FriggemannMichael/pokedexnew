from django.conf import settings
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


class TeamMember(models.Model):
    """Ein Pokemon im Team eines Nutzers.

    Gespeichert wird bewusst nur die Pokemon-Nummer und der Platz im Team -
    Name, Bild und Werte holt das Backend aus seinem PokeAPI-Cache. Sonst
    laegen dieselben Daten doppelt in der Datenbank und wuerden veralten.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_members",
    )
    slot = models.PositiveSmallIntegerField(help_text="Platz im Team (0 bis 5).")
    pokemon_id = models.PositiveIntegerField(help_text="Nummer des Pokemon, z.B. 25.")

    class Meta:
        ordering = ["user", "slot"]
        # Ein Platz kann nur einmal belegt sein.
        constraints = [
            models.UniqueConstraint(fields=["user", "slot"], name="einmaliger_platz"),
        ]
        verbose_name = "Team-Mitglied"
        verbose_name_plural = "Team-Mitglieder"

    def __str__(self):
        return f"{self.user}: Platz {self.slot} = #{self.pokemon_id}"
