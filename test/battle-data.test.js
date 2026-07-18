const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  GYM_LEADERS,
  GYM_ORDER,
  TYPE_CHART,
  effektivitaet,
  kampfStats,
  kampfbereit,
  kampfwert,
  schadenBerechnen,
} = require("../js/app/battle-data.js");

test("Typen-Tabelle kennt alle 18 Typen", () => {
  assert.equal(Object.keys(TYPE_CHART).length, 18);
});

test("Effektivitaet: Einzeltyp-Schwaeche verdoppelt", () => {
  assert.equal(effektivitaet("fire", ["grass"]), 2);
  assert.equal(effektivitaet("water", ["fire"]), 2);
});

test("Effektivitaet: Dualtyp stapelt (4x)", () => {
  assert.equal(effektivitaet("grass", ["water", "ground"]), 4);
});

test("Effektivitaet: Immunitaet schlaegt Schwaeche (0x)", () => {
  assert.equal(effektivitaet("electric", ["ground"]), 0);
  assert.equal(effektivitaet("electric", ["water", "ground"]), 0);
  assert.equal(effektivitaet("electric", ["ground", "water"]), 0);
});

test("Effektivitaet: Resistenz halbiert", () => {
  assert.equal(effektivitaet("fire", ["water"]), 0.5);
});

test("Effektivitaet: unbekannter Move-Typ ist neutral", () => {
  assert.equal(effektivitaet("shadow", ["grass"]), 1);
});

test("kampfStats: fehlende Werte bekommen ein Sicherheitsnetz", () => {
  const stats = kampfStats(undefined);
  assert.equal(stats.hp, 100);
  assert.equal(stats.attack, 50);
});

test("kampfStats: API-Namen werden auf Kampf-Namen gemappt", () => {
  const stats = kampfStats({
    stats: [
      { stat: { name: "special-attack" }, base_stat: 123 },
      { stat: { name: "hp" }, base_stat: 45 },
    ],
  });
  assert.equal(stats.specialAttack, 123);
  assert.equal(stats.hp, 45);
});

test("kampfbereit: frischer Zustand ohne Statusstufen", () => {
  const f = kampfbereit({ name: "Pikachu" });
  assert.equal(f.level, 50);
  assert.equal(f.flinched, false);
  assert.deepEqual(f.statStages, {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  });
});

test("kampfwert: Statusstufen wirken und sind auf -6..+6 begrenzt", () => {
  const basis = { stats: { attack: 100 }, statStages: { attack: 0 } };
  assert.equal(kampfwert(basis, "attack"), 100);
  assert.equal(
    kampfwert({ ...basis, statStages: { attack: 6 } }, "attack"),
    400,
  );
  assert.equal(
    kampfwert({ ...basis, statStages: { attack: -6 } }, "attack"),
    25,
  );
  assert.equal(
    kampfwert({ ...basis, statStages: { attack: 99 } }, "attack"),
    400,
  );
});

test("schadenBerechnen: Status-Moves machen keinen Schaden", () => {
  const a = kampfbereit({ name: "A", types: ["normal"], stats: {} });
  const b = kampfbereit({ name: "B", types: ["normal"], stats: {} });
  const res = schadenBerechnen(a, b, { damageClass: "status" });
  assert.deepEqual(res, { damage: 0, effectiveness: 1, isCritical: false });
});

test("schadenBerechnen: Immunitaet bedeutet 0 Schaden", () => {
  const a = kampfbereit({ name: "A", types: ["electric"], stats: {} });
  const b = kampfbereit({ name: "B", types: ["ground"], stats: {} });
  const res = schadenBerechnen(a, b, {
    damageClass: "special",
    type: "electric",
    power: 90,
  });
  assert.equal(res.damage, 0);
  assert.equal(res.effectiveness, 0);
});

test("schadenBerechnen: normaler Treffer macht mindestens 1 Schaden", () => {
  const a = kampfbereit({
    name: "A",
    types: ["fire"],
    stats: { attack: 100 },
  });
  const b = kampfbereit({
    name: "B",
    types: ["grass"],
    stats: { defense: 80 },
  });
  const res = schadenBerechnen(a, b, {
    damageClass: "physical",
    type: "fire",
    power: 80,
  });
  assert.ok(res.damage >= 1);
  assert.equal(res.effectiveness, 2);
  assert.equal(typeof res.isCritical, "boolean");
});

test("Liga: neun Stationen, jede mit sechs Pokemon, der Champ zuletzt", () => {
  assert.equal(GYM_ORDER.length, 9);
  assert.equal(GYM_ORDER[GYM_ORDER.length - 1], "champ");
  assert.ok(GYM_LEADERS.champ.finale);
  GYM_ORDER.forEach((key) => {
    assert.equal(GYM_LEADERS[key].pokemon.length, 6);
  });
});
