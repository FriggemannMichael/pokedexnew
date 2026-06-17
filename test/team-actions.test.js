const { test } = require("node:test");
const assert = require("node:assert/strict");

const { getTeamActionBarState } = require("../script/utils/team-actions.js");

test("empty team hides the action bar and disables everything", () => {
  const state = getTeamActionBarState(0);
  assert.equal(state.visible, false);
  assert.equal(state.analyzeEnabled, false);
  assert.equal(state.battleEnabled, false);
  assert.equal(state.historyEnabled, false);
  assert.equal(state.battleReady, false);
});

test("partial team shows the bar and enables all actions but is not battle-ready", () => {
  const state = getTeamActionBarState(3);
  assert.equal(state.visible, true);
  assert.equal(state.analyzeEnabled, true);
  assert.equal(state.battleEnabled, true);
  assert.equal(state.historyEnabled, true);
  assert.equal(state.battleReady, false);
});

test("a single Pokemon is already enough to act", () => {
  const state = getTeamActionBarState(1);
  assert.equal(state.visible, true);
  assert.equal(state.analyzeEnabled, true);
  assert.equal(state.battleEnabled, true);
});

test("a full team is battle-ready", () => {
  const state = getTeamActionBarState(6);
  assert.equal(state.visible, true);
  assert.equal(state.battleReady, true);
});

test("custom max size controls battle-ready threshold", () => {
  assert.equal(getTeamActionBarState(3, 3).battleReady, true);
  assert.equal(getTeamActionBarState(2, 3).battleReady, false);
});

test("invalid counts are treated as an empty team", () => {
  for (const bad of [undefined, null, NaN, -2, "x"]) {
    const state = getTeamActionBarState(bad);
    assert.equal(state.visible, false, `count=${String(bad)}`);
  }
});
