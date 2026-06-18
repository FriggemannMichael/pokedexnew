from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


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
