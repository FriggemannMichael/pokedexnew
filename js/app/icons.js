/* Inline-Ikonen im Strichstil der Tab-Icons – keine Emojis.
   Die Typ-Icons (Feuer, Wasser, …) liegen als Dateien in assets/icon/
   und werden dort verwendet, wo eine Arena ihren Typ zeigt. */

const ICON = {
  herz: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  herzVoll: `<svg class="icon icon--voll" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  schloss: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  krone: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.5 4.5 8l4.3 3.8L12 5l3.2 6.8L19.5 8 21 17.5z"/><path d="M4 21h16"/></svg>`,
  orden: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5.5"/><path d="M8.8 13.5 7.5 21l4.5-2.7L16.5 21l-1.3-7.5"/></svg>`,
  trainer: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>`,
};

/** Das Typ-Icon einer Arena – weiß gefiltert, wie im Typ-Filter. */
function typIconHTML(type) {
  return `<img class="opp__icon" src="./assets/icon/${type}.svg" alt="" />`;
}
