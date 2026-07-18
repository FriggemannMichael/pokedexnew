"""Holt die deutschen Pokemon-Namen und legt sie in der Datenbank ab.

    python manage.py namen_laden

Laeuft ein paar Minuten: Es sind 1302 Spezies, die einzeln geholt werden
muessen. Danach liegen sie in der Tabelle PokemonName - und nebenbei auch im
PokeAPI-Cache, wovon die Detailkarten profitieren.

Ein Management-Command ist hier genau richtig: Das gehoert nicht in einen
Web-Request, den ein Nutzer minutenlang absitzen muesste.
"""

from django.core.management.base import BaseCommand

from api import names, pokeapi


class Command(BaseCommand):
    help = "Laedt die deutschen Pokemon-Namen von der PokeAPI in die Datenbank."

    def add_arguments(self, parser):
        parser.add_argument(
            "--haeppchen",
            type=int,
            default=100,
            help="Wie viele Spezies auf einmal geholt werden (Standard: 100).",
        )

    def handle(self, *args, **options):
        self.stdout.write("Hole die Spezies von der PokeAPI. Das dauert.")
        try:
            anzahl = names.import_names(
                batch_size=options["haeppchen"],
                on_progress=self.zeige_fortschritt,
            )
        except pokeapi.PokeApiError as fehler:
            raise SystemExit(f"PokeAPI nicht erreichbar: {fehler}")

        self.stdout.write(self.style.SUCCESS(f"\n{anzahl} Namen gespeichert."))
        self.zeige_beispiele()

    def zeige_fortschritt(self, fertig, gesamt):
        self.stdout.write(f"  {fertig} von {gesamt} …", ending="\r")
        self.stdout.flush()

    def zeige_beispiele(self):
        for eintrag in names.all_names()[:3]:
            self.stdout.write(f"  #{eintrag['id']} {eintrag['en']} -> {eintrag['de']}")
