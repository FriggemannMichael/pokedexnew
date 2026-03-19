async function fetchWithRetry(url, options, maxRetries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[AI] Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (error.name === "AbortError") throw error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[AI] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          error.message,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  throw lastError || new Error("Request failed after retries");
}

function createThrottler(minIntervalMs = 2000) {
  let lastRequestTime = 0;

  return async function throttle() {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < minIntervalMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, minIntervalMs - elapsed),
      );
    }
    lastRequestTime = Date.now();
  };
}

window.fetchWithRetry = fetchWithRetry;
window.createThrottler = createThrottler;
