(function () {
  /**
   * Die Bedienung des Kontos: Leiste im Header und der Login-Dialog.
   *
   * Die eigentliche Arbeit macht window.authService (script/auth-service.js);
   * hier wird nur geklickt, angezeigt und Fehler ausgegeben.
   */
  const el = (id) => document.getElementById(id);

  function showError(message) {
    const box = el("loginError");
    if (!box) return;
    box.textContent = message;
    box.hidden = !message;
  }

  function setBusy(busy) {
    const submit = el("loginSubmit");
    const register = el("registerSubmit");
    if (submit) submit.disabled = busy;
    if (register) register.disabled = busy;
  }

  function closeDialog() {
    const modal = bootstrap.Modal.getInstance(el("loginModal"));
    if (modal) modal.hide();
    const form = el("loginForm");
    if (form) form.reset();
  }

  function renderState({ loggedIn, username }) {
    const user = el("accountUser");
    const loginBtn = el("accountLoginBtn");
    const logoutBtn = el("accountLogoutBtn");
    if (user) {
      user.textContent = loggedIn ? username : "";
      user.hidden = !loggedIn;
    }
    if (loginBtn) loginBtn.hidden = loggedIn;
    if (logoutBtn) logoutBtn.hidden = !loggedIn;
  }

  function credentials() {
    return {
      username: el("loginUsername")?.value.trim() || "",
      password: el("loginPassword")?.value || "",
    };
  }

  async function submit(action) {
    const { username, password } = credentials();
    if (!username || !password) {
      showError("Bitte Name und Passwort eingeben.");
      return;
    }
    showError("");
    setBusy(true);
    try {
      await action(username, password);
      closeDialog();
    } catch (error) {
      showError(error.message || "Das hat nicht geklappt.");
    } finally {
      setBusy(false);
    }
  }

  function attach() {
    const service = window.authService;
    if (!service) return;
    el("loginForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      submit((name, pass) => service.login(name, pass));
    });
    el("registerSubmit")?.addEventListener("click", () =>
      submit((name, pass) => service.register(name, pass)),
    );
    el("accountLogoutBtn")?.addEventListener("click", () => service.logout());
    document.addEventListener("pokedex-auth-changed", (event) =>
      renderState(event.detail || {}),
    );
    renderState({ loggedIn: service.isLoggedIn(), username: service.username });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();
