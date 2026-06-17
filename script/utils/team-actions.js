(function (factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.TeamActions = api;
})(function () {
  function getTeamActionBarState(count, maxSize = 6) {
    const size = Number(count);
    const max = Number(maxSize) || 6;
    if (!Number.isFinite(size) || size < 1) {
      return emptyState();
    }
    return {
      visible: true,
      analyzeEnabled: true,
      battleEnabled: true,
      historyEnabled: true,
      battleReady: size >= max,
    };
  }

  function emptyState() {
    return {
      visible: false,
      analyzeEnabled: false,
      battleEnabled: false,
      historyEnabled: false,
      battleReady: false,
    };
  }

  return { getTeamActionBarState };
});
