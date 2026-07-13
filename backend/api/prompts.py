"""Die Prompts der KI-Funktionen - frueher lagen sie im Frontend.

Warum sind sie umgezogen? Im Browser konnte jeder sie lesen und, schlimmer,
veraendert an den Proxy schicken. Jetzt schickt das Frontend nur noch Rohdaten
(z.B. das Team), und der Prompt entsteht hier.

Jede Funktion liefert `messages` im OpenAI-Format, so wie ai.chat() sie will.
"""

import json

TYPE_NAMES = (
    "Normal, Feuer, Wasser, Elektro, Pflanze, Eis, Kampf, Gift, Boden, Flug, "
    "Psycho, Kaefer, Gestein, Geist, Drache, Unlicht, Stahl, Fee"
)

COACH_SYSTEM = "\n".join(
    [
        "Du bist ein praeziser Pokemon-Coach und reines Daten-Backend ohne Smalltalk.",
        "Antworte AUSSCHLIESSLICH mit gueltigem JSON: beginne mit '{', ende mit '}',"
        " kein Markdown, keine Code-Fences.",
        "Nutze NUR die uebergebenen Input-Daten. Erfinde keine Pokemon, Werte oder"
        " Schwaechen aus eigenem Wissen.",
        f"Verwende nur diese deutschen Typen-Bezeichnungen: {TYPE_NAMES}.",
        "Sprache: Deutsch.",
    ]
)

COMMENTATOR_SYSTEM = (
    "Du bist ein leidenschaftlicher Kampf-Kommentator. Beschreibe das Ergebnis eines"
    " Spielzugs in einem einzigen, actionreichen Satz. Nutze dramatische Worte."
    " Verwende nur die genannten Namen und die genannte Wirkung; erfinde keine Pokemon"
    " oder Typen. Antworte auf Deutsch."
)


def dump(value):
    """JSON fuer den Prompt - mit Umlauten statt \\u00e4-Kauderwelsch."""
    return json.dumps(value, ensure_ascii=False)


def message(role, content):
    return {"role": role, "content": content}


def sanitize_team(team):
    """Nur die Felder, die die KI braucht - der Rest blaeht den Prompt nur auf."""
    if not isinstance(team, list):
        return []
    return [slim_pokemon(pokemon) for pokemon in team if isinstance(pokemon, dict)]


def slim_pokemon(pokemon):
    types = pokemon.get("types")
    return {
        "id": pokemon.get("id"),
        "name": pokemon.get("name") or "",
        "types": types if isinstance(types, list) else [],
        "stats": pokemon.get("stats"),
    }


# --- Professor Eich: kurzer Rat im Team-Builder (Fliesstext) ---------------

PROFESSOR_RULES = [
    "Waehle GENAU EINEN Schwerpunkt: Typen-Abdeckung ODER Synergie ODER Defensiv-Werte.",
    "Nutze Fachbegriffe (STAB, Coverage, Schwaechen).",
    "Stuetze dich AUSSCHLIESSLICH auf die uebergebenen Teamdaten; erfinde keine"
    " Pokemon, Typen oder Schwaechen.",
    f"Erlaubte Typen-Namen (keine anderen verwenden): {TYPE_NAMES}.",
    "Antworte als Fliesstext in maximal 3 vollstaendigen Saetzen auf Deutsch."
    " Keine Aufzaehlungen, kein Markdown. Professionell.",
]


def professor_size_rule(team_size):
    """Ein volles Team soll die KI nicht auffordern, noch jemanden aufzunehmen."""
    if team_size >= 6:
        return (
            "Das Team ist VOLLSTAENDIG (6/6). Schlage NIEMALS vor, weitere Mitglieder"
            " hinzuzufuegen."
        )
    return (
        "Beginne mit einer vaeterlichen Ermutigung, das Team auf 6 Mitglieder zu"
        " vervollstaendigen."
    )


def professor_system(team_size):
    intro = [
        "Du bist Professor Eich, der legendaere Pokemon-Experte.",
        f"Das Team hat aktuell {team_size} von 6 Mitgliedern.",
        professor_size_rule(team_size),
    ]
    return "\n".join(intro + PROFESSOR_RULES)


def team_advice(team, static_analysis):
    """Der kurze Rat von Professor Eich zum aktuellen Team."""
    slim = sanitize_team(team)
    user = f"Teamdaten: {dump(slim)}\nStatische Analyse: {dump(static_analysis)}"
    return [message("system", professor_system(len(slim))), message("user", user)]


# --- Kampf-Kommentar und Arenaleiter (Fliesstext) --------------------------


def battle_commentary(attacker, move, defender, effectiveness):
    """Ein Satz zum gerade ausgefuehrten Zug."""
    user = f"{attacker} nutzt {move} gegen {defender}. Es ist {effectiveness}."
    return [message("system", COMMENTATOR_SYSTEM), message("user", user)]


def gym_dialogue(leader_name, leader_type, leader_style, event_text):
    """Ein Spruch des Arenaleiters zum aktuellen Zug."""
    system = (
        f"Du bist {leader_name}, der {leader_type}-Arenaleiter. Dein Stil ist"
        f" {leader_style}. Antworte dem Spieler basierend auf seinem aktuellen Zug."
        " Bleibe in der Rolle und erfinde keine Fakten. Max. 12 Woerter."
    )
    return [message("system", system), message("user", str(event_text or "").strip())]


# --- Team-Analyse (JSON) ---------------------------------------------------

ANALYSIS_SHAPE = {
    "overall_rating": 0,
    "team_synergy": "Technische Zusammenfassung der defensiven/offensiven Kohaerenz.",
    "cumulative_weaknesses": {"critical": [], "moderate": []},
    "type_redundancies": [{"type": "", "count": 0, "impact": "Vorteil/Nachteil-Bewertung"}],
    "offensive_gaps": [],
    "individual_pro_con": [{"name": "", "strength": "", "weakness": ""}],
    "next_moves": [],
}

ANALYSIS_RULES = [
    "ZIEL: Erstelle eine rein logische Staerken-/Schwaechenanalyse.",
    "",
    "STRIKTE EINSCHRAENKUNGEN (BEFOLGEN ODER ABBRUCH):",
    "1) Das Team hat exakt 6 Pokemon. Schlage NIEMALS neue Pokemon vor.",
    "2) Pokemon, Typen, Faehigkeiten sind FIX. Keine Aenderungen.",
    "3) Keine Items erwaehnen oder vorschlagen.",
    f"4) Nutze AUSSCHLIESSLICH diese deutschen Typen-Bezeichnungen: {TYPE_NAMES}.",
    "5) Datenquelle: Nutze NUR staticAnalysis. Leite KEINE Werte aus deinem eigenen"
    " Training ab (keine externe Typentabelle).",
]

ANALYSIS_ALGORITHM = [
    "ANALYSE-ALGORITHMUS:",
    "- Shared Weaknesses: kritisch (3+ Anfaelligkeiten), moderat (genau 2).",
    "- Type Redundancies: Liste jeden Typ auf, der 2+ mal im Team vorkommt (als"
    " Primaer- oder Sekundaertyp).",
    "- Offensive Gaps: NUR Typen auflisten, gegen die laut"
    " 'staticAnalysis.offensiveCoverage' kein Pokemon sehr effektiven Schaden"
    " verursacht.",
    "- Individual Pro/Con: Erstelle fuer JEDES der 6 Pokemon genau einen Eintrag.",
    "- Next Moves: Schlage max. 3 Moves insgesamt vor. Bedingung: Der Move MUSS fuer"
    " das Pokemon in 'staticAnalysis.legalMoves' gelistet sein.",
]


def analysis_input(team, static_analysis):
    return [
        "INPUT DATEN:",
        f"team={dump(sanitize_team(team))}",
        f"staticAnalysis={dump(static_analysis)}",
        "",
    ]


def analysis_output_format():
    return [
        "AUSGABE-FORMAT:",
        "Antworte AUSSCHLIESSLICH mit validem JSON, das mit '{' beginnt und mit '}'"
        " endet. Kein Markdown, kein Smalltalk, keine Einleitung.",
        "",
        json.dumps(ANALYSIS_SHAPE, indent=2, ensure_ascii=False),
    ]


def team_analysis(team, static_analysis):
    """Die grosse Team-Analyse des Analyzers."""
    user = "\n".join(
        ["Du bist ein hochpraeziser Pokemon-Team-Analysator."]
        + ANALYSIS_RULES
        + [""]
        + analysis_input(team, static_analysis)
        + ANALYSIS_ALGORITHM
        + [""]
        + analysis_output_format()
    )
    return [message("system", COACH_SYSTEM), message("user", user)]


# --- Gym-Strategie (JSON) --------------------------------------------------

STRATEGY_RULES = [
    "Du bist ein Gym-Battle Strategist.",
    "Erstelle einen Battleplan fuer ein Team-vs-Team Matchup.",
    "Antworte im JSON-Format mit folgenden Feldern:",
    '{"strategySummary":"string","recommendedLead":"string","swapPriorities":["string"],'
    '"targetFocus":["string"],"riskAlerts":["string"]}',
    "Regeln:",
    "- Maximal 5 Eintraege je Liste.",
    "- Beruecksichtige Typen und Basiswerte.",
    "- Sprache: Deutsch.",
    "- Nutze AUSSCHLIESSLICH diese deutschen Typen-Bezeichnungen (keine anderen"
    f" erfinden): {TYPE_NAMES}.",
]


def strategy_input(player_team, gym_team, player_stats, gym_stats):
    return {
        "playerTeam": sanitize_team(player_team),
        "gymTeam": sanitize_team(gym_team),
        "playerAvgStats": player_stats or {},
        "gymAvgStats": gym_stats or {},
    }


def gym_strategy(player_team, gym_team, player_stats, gym_stats):
    """Der Battleplan gegen ein Arena-Team."""
    payload = strategy_input(player_team, gym_team, player_stats, gym_stats)
    user = "\n".join(STRATEGY_RULES) + f"\n\nInput:\n{dump(payload)}"
    return [message("system", COACH_SYSTEM), message("user", user)]
