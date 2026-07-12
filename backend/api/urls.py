from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    # Fertig aufbereitete Listen (Backend erledigt das Nachladen der Details)
    path("pokemon/", views.pokemon_list, name="pokemon-list"),
    path(
        "pokemon/by-type/<str:type_name>/",
        views.pokemon_by_type,
        name="pokemon-by-type",
    ),
    # Gecachter Durchreicher fuer alles andere (Details, Typen, Attacken, ...)
    path("pokeapi/<path:resource_path>", views.pokeapi_proxy, name="pokeapi-proxy"),
    # KI-Proxy (bewusst ohne Schluss-Slash: genau so ruft das Frontend auf)
    path("ai", views.ai_chat, name="ai-chat"),
    path("ai/ping", views.ai_ping, name="ai-ping"),
]
