export class StateManager {
  #state = {};
  #listeners = new Set();
  #debugMode = false;

  constructor(initialState = {}) {
    this.#state = { ...initialState };
    this.#debugMode = window.POKE_DEBUG || false;
  }

  getState() {
    return { ...this.#state };
  }

  get(key) {
    return this.#state[key];
  }

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

  set(key, value) {
    this.setState({ [key]: value });
  }

  subscribe(listener) {
    this.#listeners.add(listener);

    return () => {
      this.#listeners.delete(listener);
    };
  }

  #notify(changes, oldState) {
    this.#listeners.forEach(listener => {
      try {
        listener(this.#state, changes, oldState);
      } catch (error) {
        console.error('❌ Error in state listener:', error);
      }
    });
  }

  reset(newState = {}) {
    const oldState = { ...this.#state };
    this.#state = { ...newState };
    this.#notify(this.#state, oldState);
  }

  setDebugMode(enabled) {
    this.#debugMode = enabled;
  }

  computed(computeFn) {
    return computeFn(this.#state);
  }
}
