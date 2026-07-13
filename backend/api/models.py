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


class Favorite(models.Model):
    """Ein Pokemon, das ein Nutzer mit dem Herz markiert hat."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    pokemon_id = models.PositiveIntegerField(help_text="Nummer des Pokemon, z.B. 25.")

    class Meta:
        ordering = ["user", "pokemon_id"]
        # Zweimal dasselbe Pokemon zu favorisieren ergibt keinen Sinn.
        constraints = [
            models.UniqueConstraint(
                fields=["user", "pokemon_id"], name="einmaliger_favorit"
            ),
        ]
        verbose_name = "Favorit"
        verbose_name_plural = "Favoriten"

    def __str__(self):
        return f"{self.user}: #{self.pokemon_id}"


class Note(models.Model):
    """Die persoenliche Notiz eines Nutzers zu einem Pokemon."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes",
    )
    pokemon_id = models.PositiveIntegerField(help_text="Nummer des Pokemon, z.B. 25.")
    text = models.TextField(max_length=2000)

    class Meta:
        ordering = ["user", "pokemon_id"]
        # Eine Notiz je Pokemon und Nutzer.
        constraints = [
            models.UniqueConstraint(
                fields=["user", "pokemon_id"], name="einmalige_notiz"
            ),
        ]
        verbose_name = "Notiz"
        verbose_name_plural = "Notizen"

    def __str__(self):
        return f"{self.user}: #{self.pokemon_id}"


class BattleRecord(models.Model):
    """Ein ausgefochtener Kampf gegen einen Arenaleiter.

    Anders als beim Team wird hier bewusst der **Stand von damals** gespeichert
    (Name und Typen der Kaempfer). Ein Kampf ist Geschichte: Er darf sich nicht
    aendern, nur weil das Team heute anders aussieht.
    """

    WIN = "win"
    LOSS = "loss"
    RESULTS = [(WIN, "Sieg"), (LOSS, "Niederlage")]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="battles",
    )
    fought_at = models.DateTimeField(help_text="Wann der Kampf stattfand.")
    result = models.CharField(max_length=8, choices=RESULTS)
    total_damage_dealt = models.PositiveIntegerField(default=0)
    total_turns = models.PositiveIntegerField(default=0)
    pokemon_used = models.PositiveSmallIntegerField(default=0)
    gym_leader_name = models.CharField(max_length=60, blank=True)
    gym_leader_type = models.CharField(max_length=20, blank=True)
    mvp_name = models.CharField(max_length=60, blank=True)
    mvp_pokemon_id = models.PositiveIntegerField(null=True, blank=True)
    mvp_damage = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-fought_at", "-id"]  # neueste zuerst, so zeigt die App sie an
        verbose_name = "Kampf"
        verbose_name_plural = "Kaempfe"

    def __str__(self):
        return f"{self.user}: {self.result} gegen {self.gym_leader_name or '?'}"


class BattleParticipant(models.Model):
    """Ein Pokemon, das in einem Kampf dabei war - mit Namen und Typen von damals."""

    record = models.ForeignKey(
        BattleRecord,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    pokemon_id = models.PositiveIntegerField()
    name = models.CharField(max_length=60)
    types = models.JSONField(default=list, help_text='Die Typen, z.B. ["fire"].')

    class Meta:
        ordering = ["id"]
        verbose_name = "Kampf-Teilnehmer"
        verbose_name_plural = "Kampf-Teilnehmer"

    def __str__(self):
        return f"{self.name} (#{self.pokemon_id})"


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
