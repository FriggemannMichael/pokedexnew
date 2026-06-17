function getBattleStrategyPrompt() {
  return [
    "Du bist ein Gym-Battle Strategist.",
    "Erstelle einen Battleplan fuer ein Team-vs-Team Matchup.",
    "Antworte im JSON-Format mit folgenden Feldern:",
    '{"strategySummary":"string","recommendedLead":"string","swapPriorities":["string"],"targetFocus":["string"],"riskAlerts":["string"]}',
    "Regeln:",
    "- Maximal 5 Eintraege je Liste.",
    "- Beruecksichtige Typen und Basiswerte.",
    "- Sprache: Deutsch.",
  ].join("\n");
}

window.getBattleStrategyPrompt = getBattleStrategyPrompt;
