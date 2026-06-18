const { test } = require("node:test");
const assert = require("node:assert/strict");

const TE = require("../script/utils/type-effectiveness.js");

test("kennt alle 18 Typen", () => {
  assert.equal(TE.getAllTypes().length, 18);
});

test("defensiver Multiplikator: Einzeltyp-Schwaeche", () => {
  assert.equal(TE.defensiveMultiplier("electric", ["water"]), 2);
  assert.equal(TE.defensiveMultiplier("water", ["fire"]), 2);
});

test("defensiver Multiplikator: Dualtyp stapelt (4x)", () => {
  // Charizard (Feuer/Flug): Gestein trifft beide -> 4x
  assert.equal(TE.defensiveMultiplier("rock", ["fire", "flying"]), 4);
});

test("defensiver Multiplikator: Immunitaet schlaegt Schwaeche (0x)", () => {
  // Feuer schwach gegen Boden (2x), Flug immun gegen Boden (0x) -> 0
  assert.equal(TE.defensiveMultiplier("ground", ["fire", "flying"]), 0);
  assert.equal(TE.defensiveMultiplier("normal", ["ghost"]), 0);
});

test("defensiver Multiplikator: Resistenz halbiert", () => {
  assert.equal(TE.defensiveMultiplier("fire", ["fire"]), 0.5);
});

test("offensive Effektivitaet ist aus dem Defensiv-Chart abgeleitet", () => {
  assert.equal(TE.offensiveEffectiveness("fire", "grass"), 2);
  assert.equal(TE.offensiveEffectiveness("water", "fire"), 2);
  assert.equal(TE.offensiveEffectiveness("electric", "ground"), 0);
  assert.equal(TE.offensiveEffectiveness("normal", "rock"), 0.5);
  assert.equal(TE.offensiveEffectiveness("normal", "water"), 1);
});

test("buildChartFromApi mappt damage_relations korrekt", () => {
  const responses = [
    {
      name: "fire",
      damage_relations: {
        double_damage_from: [{ name: "water" }, { name: "rock" }],
        half_damage_from: [{ name: "grass" }],
        no_damage_from: [],
      },
    },
  ];
  const chart = TE.buildChartFromApi(responses);
  assert.deepEqual(chart.fire, {
    weak: ["water", "rock"],
    resist: ["grass"],
    immune: [],
  });
});

test("setChart lehnt unvollstaendige Tabellen ab", () => {
  const before = TE.getChart();
  assert.equal(TE.setChart({ fire: { weak: [] } }), false);
  assert.equal(TE.getChart(), before, "Chart bleibt unveraendert");
});

test("setChart akzeptiert eine vollstaendige Tabelle", () => {
  assert.equal(TE.setChart(TE.getChart()), true);
});
