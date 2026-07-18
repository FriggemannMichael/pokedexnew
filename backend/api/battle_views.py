"""Die Kampfhistorie des angemeldeten Nutzers.

Anders als Team, Favoriten und Notizen ist das kein Zustand, der ersetzt wird,
sondern eine **wachsende Liste**. Darum haengt POST einen Kampf an, statt alles
zu ueberschreiben. PUT gibt es trotzdem: fuer den Moment der Registrierung, wenn
die im Browser gesammelte Historie ins frische Konto wandert.

Wie im Frontend werden nur die letzten 50 Kaempfe behalten.
"""

from django.utils.dateparse import parse_datetime
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import BattleParticipant, BattleRecord

MAX_ENTRIES = 50


def body(request):
    return request.data if isinstance(request.data, dict) else {}


def bad_request(message):
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)


def whole_number(value, default=0):
    """Schadenszahlen und Zuege sind nie negativ - Unsinn wird zu 0."""
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return default


def when(value):
    """Das Datum aus dem Frontend, notfalls jetzt."""
    parsed = parse_datetime(str(value or ""))
    return parsed or now()


def result_of(entry):
    return BattleRecord.WIN if entry.get("result") == BattleRecord.WIN else BattleRecord.LOSS


def leader_of(entry):
    leader = entry.get("gymLeader") or {}
    if not isinstance(leader, dict):
        return "", ""
    return str(leader.get("name") or "")[:60], str(leader.get("type") or "")[:20]


def mvp_of(entry):
    mvp = entry.get("mvpPokemon") or {}
    if not isinstance(mvp, dict) or not mvp.get("name"):
        return "", None, 0
    pokemon_id = mvp.get("id")
    return (
        str(mvp["name"])[:60],
        whole_number(pokemon_id, None) if pokemon_id is not None else None,
        whole_number(mvp.get("damageDealt")),
    )


def build_record(user, entry):
    """Aus dem, was das Frontend schickt, einen Datenbank-Eintrag machen."""
    leader_name, leader_type = leader_of(entry)
    mvp_name, mvp_id, mvp_damage = mvp_of(entry)
    return BattleRecord(
        user=user,
        fought_at=when(entry.get("date")),
        result=result_of(entry),
        total_damage_dealt=whole_number(entry.get("totalDamageDealt")),
        total_turns=whole_number(entry.get("totalTurns")),
        pokemon_used=whole_number(entry.get("pokemonUsed")),
        gym_leader_name=leader_name,
        gym_leader_type=leader_type,
        mvp_name=mvp_name,
        mvp_pokemon_id=mvp_id,
        mvp_damage=mvp_damage,
    )


def build_participants(record, entry):
    team = entry.get("playerTeam")
    if not isinstance(team, list):
        return []
    return [
        BattleParticipant(
            record=record,
            pokemon_id=whole_number(pokemon.get("id")),
            name=str(pokemon.get("name") or "")[:60],
            types=pokemon.get("types") if isinstance(pokemon.get("types"), list) else [],
        )
        for pokemon in team
        if isinstance(pokemon, dict)
    ]


def save_entry(user, entry):
    """Ein Kampf mit seinen Teilnehmern."""
    if not isinstance(entry, dict):
        raise ValueError("Ein Kampf muss ein Objekt sein.")
    record = build_record(user, entry)
    record.save()
    BattleParticipant.objects.bulk_create(build_participants(record, entry))
    return record


def prune(user):
    """Nur die letzten 50 Kaempfe behalten - wie im Frontend."""
    keep = BattleRecord.objects.filter(user=user).values_list("id", flat=True)[:MAX_ENTRIES]
    BattleRecord.objects.filter(user=user).exclude(id__in=list(keep)).delete()


def to_json(record):
    """Genau das Format, das die App im localStorage haelt."""
    return {
        "id": record.id,
        "date": record.fought_at.isoformat(),
        "playerTeam": [
            {"id": p.pokemon_id, "name": p.name, "types": p.types}
            for p in record.participants.all()
        ],
        "gymLeader": (
            {"name": record.gym_leader_name, "type": record.gym_leader_type}
            if record.gym_leader_name
            else None
        ),
        "result": record.result,
        "totalDamageDealt": record.total_damage_dealt,
        "totalTurns": record.total_turns,
        "mvpPokemon": (
            {
                "id": record.mvp_pokemon_id,
                "name": record.mvp_name,
                "damageDealt": record.mvp_damage,
            }
            if record.mvp_name
            else None
        ),
        "pokemonUsed": record.pokemon_used,
    }


def history(user):
    records = BattleRecord.objects.filter(user=user).prefetch_related("participants")
    return [to_json(record) for record in records[:MAX_ENTRIES]]


def add_one(request):
    save_entry(request.user, body(request).get("battle"))
    prune(request.user)


def replace_all(request):
    """Fuers frische Konto: die ganze Historie aus dem Browser uebernehmen."""
    entries = body(request).get("battles")
    if not isinstance(entries, list):
        raise ValueError("Erwartet wird ein Feld 'battles' mit einer Liste.")
    BattleRecord.objects.filter(user=request.user).delete()
    for entry in reversed(entries[:MAX_ENTRIES]):  # aelteste zuerst speichern
        save_entry(request.user, entry)


@extend_schema(
    summary="Kampfhistorie lesen, anhaengen, ersetzen, loeschen",
    description=(
        "GET liefert die letzten 50 Kaempfe (neueste zuerst). POST haengt einen "
        'Kampf an ({"battle": {...}}). PUT ersetzt die ganze Historie '
        '({"battles": [...]}) - dafuer gibt es genau einen Grund: die im '
        "Browser gesammelte Historie beim Registrieren zu uebernehmen. DELETE "
        "loescht alles. Ohne Token: 401."
    ),
)
@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def battles(request):
    """GET/POST/PUT/DELETE /api/battles"""
    try:
        if request.method == "POST":
            add_one(request)
        elif request.method == "PUT":
            replace_all(request)
        elif request.method == "DELETE":
            BattleRecord.objects.filter(user=request.user).delete()
    except ValueError as error:
        return bad_request(str(error))
    return Response({"battles": history(request.user)})
