function createAppErrorTemplate() {
  return `
    <div class="error-container text-center py-5">
      <h2>App Loading Failed</h2>
      <p>Check the console for errors.</p>
      <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
    </div>
  `;
}

window.createAppErrorTemplate = createAppErrorTemplate;
