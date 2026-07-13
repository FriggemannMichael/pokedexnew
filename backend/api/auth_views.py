"""Registrierung, Login, Logout - die Endpoints rund um den Nutzer.

Wir nutzen die **Token-Authentifizierung** von DRF: Beim Login legt das Backend
einen zufaelligen Schluessel an (Tabelle `authtoken_token`) und schickt ihn ans
Frontend. Das schickt ihn bei jeder weiteren Anfrage im Header mit:

    Authorization: Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b

Daran erkennt DRF den Nutzer und setzt `request.user`. Beim Logout wird der
Token geloescht und ist damit wertlos.

Das Passwort selbst landet nie in der Datenbank - Django speichert nur einen
Hash davon (`create_user` erledigt das).
"""

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

MIN_USERNAME_LENGTH = 3


def credentials(request):
    """Holt Name und Passwort aus der Anfrage."""
    data = request.data if isinstance(request.data, dict) else {}
    return str(data.get("username") or "").strip(), str(data.get("password") or "")


def bad_request(message):
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)


def username_error(username):
    """Prueft den Namen. Gibt None zurueck, wenn alles in Ordnung ist."""
    if len(username) < MIN_USERNAME_LENGTH:
        return f"Der Name braucht mindestens {MIN_USERNAME_LENGTH} Zeichen."
    if User.objects.filter(username__iexact=username).exists():
        return "Diesen Namen gibt es schon."
    return None


def password_error(password, username):
    """Djangos eigene Passwort-Regeln (AUTH_PASSWORD_VALIDATORS in settings.py)."""
    try:
        validate_password(password, user=User(username=username))
    except ValidationError as error:
        return " ".join(error.messages)
    return None


def token_answer(user, code=status.HTTP_200_OK):
    """Ein Token je Nutzer - beim Logout geloescht, beim Login neu erzeugt."""
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username}, status=code)


@extend_schema(
    summary="Registrieren",
    description=(
        "Legt einen Nutzer an und gibt gleich den Token zurueck - man ist nach "
        "der Registrierung also direkt angemeldet."
    ),
)
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register"""
    username, password = credentials(request)
    problem = username_error(username) or password_error(password, username)
    if problem:
        return bad_request(problem)
    user = User.objects.create_user(username=username, password=password)
    return token_answer(user, status.HTTP_201_CREATED)


@extend_schema(
    summary="Anmelden",
    description="Prueft Name und Passwort und gibt bei Erfolg den Token zurueck.",
)
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """POST /api/auth/login"""
    username, password = credentials(request)
    user = authenticate(username=username, password=password)
    if user is None:
        return bad_request("Name oder Passwort stimmt nicht.")
    return token_answer(user)


@extend_schema(
    summary="Abmelden",
    description="Loescht den Token. Er funktioniert danach nicht mehr.",
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """POST /api/auth/logout"""
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    summary="Wer bin ich?",
    description=(
        "Sagt dem Frontend, ob der gespeicherte Token noch gilt und zu wem er "
        "gehoert. Ohne gueltigen Token: 401."
    ),
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me"""
    return Response({"username": request.user.username})
