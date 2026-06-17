const ERROR_CATEGORY = Object.freeze({
  API:     "API",
  STORAGE: "STORAGE",
  AI:      "AI",
  UI:      "UI",
  APP:     "APP",
  BATTLE:  "BATTLE",
});

function _prefix(category) {
  return `[${category}]`;
}

function logError(category, message, cause) {
  console.error(`${_prefix(category)} ${message}`, cause ?? "");
}

function logWarn(category, message, detail) {
  console.warn(`${_prefix(category)} ${message}`, detail ?? "");
}

function createError(category, message, cause) {
  const err = new Error(`${_prefix(category)} ${message}`);
  if (cause) err.cause = cause;
  return err;
}

async function safeAsync(fn, category, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    logError(category, error.message, error);
    return fallback;
  }
}

function showUiError(container, message) {
  const el = typeof container === "string"
    ? document.getElementById(container)
    : container;
  if (!el) return;
  el.innerHTML = `<p class="text-danger p-3">${message}</p>`;
}

window.AppError = {
  CATEGORY: ERROR_CATEGORY,
  log:      logError,
  warn:     logWarn,
  create:   createError,
  safe:     safeAsync,
  showUi:   showUiError,
};
