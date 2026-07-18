// Liefert das Frontend aus - mehr nicht.
//
// Der KI-Proxy lag frueher hier. Er ist ins Django-Backend umgezogen
// (backend/api/ai.py), zusammen mit dem Rate-Limit und den API-Keys.
// Das Frontend spricht jetzt direkt mit http://127.0.0.1:8000/api/ai.
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`Pokedex-Frontend laeuft auf http://localhost:${PORT}`);
  console.log(
    "Das Backend startest du getrennt: cd backend && python manage.py runserver",
  );
});
