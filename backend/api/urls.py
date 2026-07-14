from django.urls import path

from . import (
    ai_views,
    auth_views,
    battle_views,
    collection_views,
    preset_views,
    team_views,
    trainer_views,
    views,
)

urlpatterns = [
    path("health/", views.health, name="health"),
    # Konto und gespeicherte Daten (M3)
    path("auth/register", auth_views.register, name="auth-register"),
    path("auth/login", auth_views.login, name="auth-login"),
    path("auth/logout", auth_views.logout, name="auth-logout"),
    path("auth/me", auth_views.me, name="auth-me"),
    path("team", team_views.team, name="team"),
    path("favorites", collection_views.favorites, name="favorites"),
    path("notes", collection_views.notes, name="notes"),
    path("battles", battle_views.battles, name="battles"),
    path("presets", preset_views.presets, name="presets"),
    # Andere Trainer: Teams als Gegner + Zahlen fuer die Rangliste
    path("trainers", trainer_views.trainers, name="trainers"),
    # Fertig aufbereitete Listen (Backend erledigt das Nachladen der Details)
    path("pokemon/", views.pokemon_list, name="pokemon-list"),
    # Deutsche Namen (vor der by-type-Route, sonst faengt die "names" ab)
    path("pokemon/names/", views.pokemon_names, name="pokemon-names"),
    path(
        "pokemon/by-type/<str:type_name>/",
        views.pokemon_by_type,
        name="pokemon-by-type",
    ),
    # Gecachter Durchreicher fuer alles andere (Details, Typen, Attacken, ...)
    path("pokeapi/<path:resource_path>", views.pokeapi_proxy, name="pokeapi-proxy"),
    # KI (bewusst ohne Schluss-Slash: genau so ruft das Frontend auf)
    path("ai/ping", ai_views.ai_ping, name="ai-ping"),
    path("ai/team-advice", ai_views.team_advice, name="ai-team-advice"),
    path(
        "ai/battle-commentary",
        ai_views.battle_commentary,
        name="ai-battle-commentary",
    ),
    path("ai/gym-dialogue", ai_views.gym_dialogue, name="ai-gym-dialogue"),
    path("ai/team-analysis", ai_views.team_analysis, name="ai-team-analysis"),
    path("ai/gym-strategy", ai_views.gym_strategy, name="ai-gym-strategy"),
]
