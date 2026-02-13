/**
 * StateManager - Zentrales State Management für die Pokédex App
 *
 * Features:
 * - Reaktives State Management mit Subscribe Pattern
 * - Immutable State Updates
 * - Change Detection
 * - Debug Logging
 */

export class StateManager {
  #state = {};
  #listeners = new Set();
  #debugMode = false;

  constructor(initialState = {}) {
    this.#state = { ...initialState };
    this.#debugMode = window.POKE_DEBUG || false;
  }

  /**
   * Gibt eine Kopie des aktuellen States zurück
   * @returns {Object} State Kopie
   */
  getState() {
    return { ...this.#state };
  }

  /**
   * Gibt einen spezifischen State-Wert zurück
   * @param {string} key - State Key
   * @returns {*} State Value
   */
  get(key) {
    return this.#state[key];
  }

  /**
   * Updated den State mit neuen Werten
   * @param {Object} updates - Objekt mit State Updates
   */
  setState(updates) {
    const oldState = { ...this.#state };
    this.#state = { ...this.#state, ...updates };

    if (this.#debugMode) {
      console.log('🔄 State Update:', {
        old: oldState,
        new: this.#state,
        changes: updates
      });
    }

    this.#notify(updates, oldState);
  }

  /**
   * Setzt einen einzelnen State-Wert
   * @param {string} key - State Key
   * @param {*} value - Neuer Wert
   */
  set(key, value) {
    this.setState({ [key]: value });
  }

  /**
   * Abonniert State Changes
   * @param {Function} listener - Callback Funktion (state, changes, oldState) => void
   * @returns {Function} Unsubscribe Funktion
   */
  subscribe(listener) {
    this.#listeners.add(listener);

    // Gib Unsubscribe-Funktion zurück
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /**
   * Benachrichtigt alle Listener über State Changes
   * @private
   */
  #notify(changes, oldState) {
    this.#listeners.forEach(listener => {
      try {
        listener(this.#state, changes, oldState);
      } catch (error) {
        console.error('❌ Error in state listener:', error);
      }
    });
  }

  /**
   * Setzt den State komplett zurück
   * @param {Object} newState - Neuer State
   */
  reset(newState = {}) {
    const oldState = { ...this.#state };
    this.#state = { ...newState };
    this.#notify(this.#state, oldState);
  }

  /**
   * Aktiviert/Deaktiviert Debug Mode
   * @param {boolean} enabled - Debug Mode aktivieren
   */
  setDebugMode(enabled) {
    this.#debugMode = enabled;
  }

  /**
   * Computed State - berechnet abgeleitete Werte
   * @param {Function} computeFn - Funktion die State zu Wert transformiert
   * @returns {*} Berechneter Wert
   */
  computed(computeFn) {
    return computeFn(this.#state);
  }
}
