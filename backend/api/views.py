"""Die Pokemon-Endpoints des Backends. Die KI-Endpoints stehen in ai_views.py."""

from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import pokeapi, transform

DEFAULT_LIMIT = 20
MAX_LIMIT = 100

PAGING_PARAMETERS = [
    OpenApiParameter("offset", int, description="Ab welchem Pokemon (Standard: 0)."),
    OpenApiParameter("limit", int, description="Wie viele Pokemon (Standard: 20, max. 100)."),
]


@extend_schema(
    summary="Health-Check",
    description="Einfacher Endpoint, der zeigt, dass das Backend laeuft.",
    responses={200: {"type": "object", "properties": {"status": {"type": "string"}}}},
)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Gibt {"status": "ok"} zurueck."""
    return Response({"status": "ok"})


def read_int(request, name, default):
    """Liest einen Zahlen-Parameter aus der URL, ohne bei Unsinn abzustuerzen."""
    try:
        return max(0, int(request.query_params.get(name, default)))
    except (TypeError, ValueError):
        return default


def read_paging(request):
    """Liest offset und limit aus der URL."""
    limit = min(read_int(request, "limit", DEFAULT_LIMIT), MAX_LIMIT)
    return read_int(request, "offset", 0), limit


def upstream_error(error):
    """Antwort, wenn die PokeAPI nichts liefert: 404 bei Tippfehlern, sonst 502."""
    if isinstance(error, pokeapi.PokeApiNotFound):
        return Response({"detail": str(error)}, status=status.HTTP_404_NOT_FOUND)
    return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)


@extend_schema(
    summary="Pokemon-Liste (gecacht)",
    description=(
        "Liefert eine Seite fertig aufbereiteter Pokemon. Das Backend holt die "
        "Liste und alle Detailseiten selbst und cached sie - der Browser braucht "
        "dafuer nur noch eine einzige Anfrage statt 21."
    ),
    parameters=PAGING_PARAMETERS,
)
@api_view(["GET"])
@permission_classes([AllowAny])
def pokemon_list(request):
    """GET /api/pokemon/?offset=0&limit=20"""
    offset, limit = read_paging(request)
    try:
        index = pokeapi.get_resource(f"pokemon?offset={offset}&limit={limit}")
        details = pokeapi.get_in_order([item["url"] for item in index["results"]])
    except pokeapi.PokeApiError as error:
        return upstream_error(error)
    return Response(
        {"count": index.get("count", 0), "results": transform.slim_pokemon_list(details)}
    )


def type_member_urls(type_data, offset, limit):
    """Die Pokemon-URLs eines Typs, auf eine Seite zugeschnitten."""
    members = type_data.get("pokemon") or []
    page = members[offset : offset + limit]
    return [entry["pokemon"]["url"] for entry in page], len(members)


@extend_schema(
    summary="Pokemon eines Typs (gecacht)",
    description="Wie /api/pokemon/, aber gefiltert auf einen Typ (z.B. fire).",
    parameters=PAGING_PARAMETERS,
)
@api_view(["GET"])
@permission_classes([AllowAny])
def pokemon_by_type(request, type_name):
    """GET /api/pokemon/by-type/fire/?offset=0&limit=20"""
    offset, limit = read_paging(request)
    try:
        type_data = pokeapi.get_resource(f"type/{type_name}")
        urls, count = type_member_urls(type_data, offset, limit)
        details = pokeapi.get_in_order(urls)
    except pokeapi.PokeApiError as error:
        return upstream_error(error)
    return Response({"count": count, "results": transform.slim_pokemon_list(details)})


def with_query_string(request, resource_path):
    """Haengt den Query-String wieder an, den Django aus dem Pfad heraushaelt.

    Ohne das ginge z.B. bei /api/pokeapi/pokemon?limit=10000 (Suche) das
    "?limit=10000" verloren.
    """
    query = request.META.get("QUERY_STRING", "")
    return f"{resource_path}?{query}" if query else resource_path


@extend_schema(
    summary="PokeAPI-Durchreicher (gecacht)",
    description=(
        "Reicht eine beliebige PokeAPI-Ressource durch und cached sie, z.B. "
        "/api/pokeapi/type/fire oder /api/pokeapi/move/tackle. Damit laufen auch "
        "Detailansicht, Battle-Simulator und Typen-Tabelle ueber den Cache."
    ),
)
@api_view(["GET"])
@permission_classes([AllowAny])
def pokeapi_proxy(request, resource_path):
    """GET /api/pokeapi/<beliebiger-pokeapi-pfad>"""
    try:
        return Response(pokeapi.get_resource(with_query_string(request, resource_path)))
    except pokeapi.PokeApiError as error:
        return upstream_error(error)


