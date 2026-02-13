# 📦 Service Layer

Moderne, testbare und wartbare Service-Architektur für die Pokédex App.

## 📁 Services Übersicht

| Service | Zweck | Dependencies |
|---------|-------|--------------|
| **StateManager** | Zentrales reaktives State Management | - |
| **StorageService** | localStorage Abstraktion | - |
| **ApiService** | PokeAPI Integration | - |
| **PokemonService** | Pokemon Business Logic | StateManager, ApiService, StorageService |
| **TeamService** | Team Management | StateManager, StorageService, PokemonService |
| **FavoritesService** | Favorites & Ratings | StateManager, StorageService |
| **ServiceContainer** | Dependency Injection | Alle Services |

---

## 🔧 StateManager

### Zweck
Zentrales State Management mit Subscribe Pattern für reaktive Updates.

### Features
- ✅ Reaktive Updates
- ✅ Immutable State
- ✅ Change Detection
- ✅ Debug Logging

### API

```javascript
import { StateManager } from './StateManager.js';

const state = new StateManager({ counter: 0 });

// State ändern
state.setState({ counter: 1 });

// State lesen
const value = state.get('counter');
const allState = state.getState();

// Subscribe zu Changes
const unsubscribe = state.subscribe((newState, changes, oldState) => {
  console.log('State changed:', changes);
});

// Unsubscribe
unsubscribe();
```

### Use Cases
- App State verwalten
- Pokemon Liste State
- UI State
- Filter State

---

## 💾 StorageService

### Zweck
Abstraktion für localStorage mit automatischem JSON Parsing und Error Handling.

### Features
- ✅ Auto JSON Parse/Stringify
- ✅ Default Values
- ✅ Error Handling
- ✅ Quota Management
- ✅ Migration Support

### API

```javascript
import { StorageService, STORAGE_KEYS } from './StorageService.js';

const storage = new StorageService('pokedex_');

// Speichern (auto JSON.stringify)
storage.set('team', [1, 4, 7]);

// Laden (auto JSON.parse)
const team = storage.get('team', []); // [] = default

// Prüfen
if (storage.has('team')) { }

// Entfernen
storage.remove('team');

// Info
const info = storage.getInfo();
console.log(info.usedSpaceFormatted); // "2.5 KB"

// Migration
storage.migrate({
  'pokemonTeam': 'team',  // old -> new
  'pokemonFavorites': 'favorites'
});
```

### Use Cases
- Team persistieren
- Favorites speichern
- Ratings speichern
- Settings speichern

---

## 🌐 ApiService

### Zweck
PokeAPI Integration mit Caching und Error Handling.

### Features
- ✅ HTTP Client für PokeAPI
- ✅ Response Caching (30 Min)
- ✅ Data Transformation
- ✅ Error Handling
- ✅ Parallel Fetching

### API

```javascript
import { ApiService } from './ApiService.js';

const api = new ApiService({
  cacheEnabled: true,
  cacheDuration: 1000 * 60 * 30  // 30 Min
});

// Pokemon Liste laden
const { pokemon, total, next } = await api.fetchPokemonList(0, 20);

// Einzelnes Pokemon
const pikachu = await api.fetchPokemon(25);
// oder
const pikachu = await api.fetchPokemon('pikachu');

// Species Details
const species = await api.fetchPokemonSpecies(25);

// Evolution Chain
const evolution = await api.fetchEvolutionChain(1);

// Suche
const results = await api.searchPokemon('char', 10);

// Cache Management
api.clearCache();
const stats = api.getCacheStats();
api.setCacheEnabled(false);
```

### Use Cases
- Pokemon Daten laden
- Pokemon suchen
- Details abrufen
- Evolution Chains

---

## 🎮 PokemonService

### Zweck
Business Logic für Pokemon Management - koordiniert API, State und Storage.

### Features
- ✅ Pokemon laden
- ✅ Filtern nach Typ
- ✅ Suchen
- ✅ Loading State
- ✅ Reaktive Updates

### API

```javascript
import { PokemonService } from './PokemonService.js';

// Über ServiceContainer initialisiert
const pokemon = services.get('pokemonService');

// Pokemon laden
await pokemon.loadPokemon(0, 20);

// Filtern
const fireTypes = pokemon.filterByType('fire');
pokemon.filterByType('all'); // Reset

// Suchen
const results = await pokemon.searchPokemon('pika');

// Daten abrufen
const list = pokemon.getPokemonList();
const single = pokemon.getPokemonById(25);

// State prüfen
const isLoading = pokemon.isLoading();
const hasMore = pokemon.hasMore();

// Subscribe
const unsubscribe = pokemon.subscribe((state) => {
  console.log('Pokemon list:', state.pokemonList);
  console.log('Loading:', state.isLoading);
});
```

### Use Cases
- Hauptliste anzeigen
- Type Filter
- Suche
- Pagination

---

## 👥 TeamService

### Zweck
Team Management (max 6 Pokemon) mit Validierung und Persistierung.

### Features
- ✅ Max 6 Pokemon Validierung
- ✅ Duplicate Check
- ✅ localStorage Persistierung
- ✅ Team Operations
- ✅ Export/Import

### API

```javascript
import { TeamService } from './TeamService.js';

const team = services.get('teamService');

// Hinzufügen (mit Validierung)
const success = team.addPokemon(25); // true/false

// Entfernen
team.removePokemon(25);

// Toggle
const isInTeam = team.togglePokemon(25);

// Prüfen
if (team.isInTeam(25)) { }
if (team.isTeamFull()) { }

// Daten abrufen
const teamIds = team.getTeam();           // [1, 4, 7]
const teamData = team.getTeamWithDetails(); // [{id, name, ...}, ...]
const count = team.getTeamCount();        // 3

// Leeren
team.clearTeam();

// Sortieren
team.sortTeam((a, b) => a.id - b.id);

// Export/Import
const json = team.exportTeam();
team.importTeam(json);

// Subscribe
team.subscribe((state) => {
  console.log('Team:', state.team);
  console.log('Count:', state.teamCount);
  console.log('Full:', state.isTeamFull);
});
```

### Use Cases
- Team Builder
- Team Offcanvas
- Team Modal
- Battle Team

---

## ❤️ FavoritesService

### Zweck
Favorites, Ratings (1-5 Sterne) und Personal Notes Management.

### Features
- ✅ Favorites Management
- ✅ 1-5 Sterne Rating
- ✅ Personal Notes
- ✅ Persistierung
- ✅ Export/Import

### API

```javascript
import { FavoritesService } from './FavoritesService.js';

const fav = services.get('favoritesService');

// === FAVORITES ===
fav.addFavorite(25);
fav.removeFavorite(25);
const isFav = fav.toggleFavorite(25);

if (fav.isFavorite(25)) { }

const favorites = fav.getFavoritesArray();  // [25, 1, 4]
const count = fav.getFavoritesCount();      // 3

// === RATINGS ===
fav.setRating(25, 5);  // 1-5 Sterne
fav.removeRating(25);

const rating = fav.getRating(25);  // 5 oder null
const allRatings = fav.getRatings(); // {25: 5, 1: 4}

// === NOTES ===
fav.setNote(25, 'Mein Lieblings-Pokemon!');
fav.removeNote(25);

const note = fav.getNote(25);     // String oder null
const allNotes = fav.getNotes();   // {25: "...", 1: "..."}

// === CLEAR ===
fav.clearFavorites();
fav.clearRatings();
fav.clearNotes();
fav.clearAll();  // Alles löschen

// === EXPORT/IMPORT ===
const json = fav.exportData();
fav.importData(json);

// === SUBSCRIBE ===
fav.subscribe((state) => {
  console.log('Favorites:', state.favorites);
  console.log('Ratings:', state.ratings);
  console.log('Notes:', state.notes);
});
```

### Use Cases
- Favorite Button
- Star Rating Display
- Personal Notes
- Pokemon GO Features

---

## 🏗️ ServiceContainer

### Zweck
Dependency Injection Container - verwaltet alle Services und ihre Dependencies.

### Features
- ✅ Automatische DI
- ✅ Singleton Pattern
- ✅ Service Registry
- ✅ Debug Info

### API

```javascript
import { initializeServices, getServiceContainer } from './ServiceContainer.js';

// Initialisieren (einmalig beim App Start)
const container = initializeServices();

// Service abrufen
const pokemonService = container.get('pokemonService');
const teamService = container.get('teamService');

// Prüfen ob Service existiert
if (container.has('pokemonService')) { }

// Alle Service Namen
const names = container.getServiceNames();
// ['stateManager', 'storageService', 'apiService', ...]

// Custom Service registrieren
container.register('myService', new MyService());

// Debug Info
const debug = container.getDebugInfo();
console.log(debug);

// Legacy Support (temporär)
container.exposeGlobally();
// Macht Services unter window.__services verfügbar
```

### Use Cases
- App Initialization
- Service Access
- Testing
- Debugging

---

## 🔄 Service Lifecycle

### Initialization Order

```javascript
// ServiceContainer initialisiert Services in der richtigen Reihenfolge:

1. StateManager      // Keine Dependencies
2. StorageService    // Keine Dependencies
3. ApiService        // Keine Dependencies
   ↓
4. PokemonService    // Benötigt: State, API, Storage
   ↓
5. TeamService       // Benötigt: State, Storage, Pokemon
6. FavoritesService  // Benötigt: State, Storage
```

### Singleton Pattern

Alle Services sind Singletons - es gibt nur eine Instanz pro Service:

```javascript
const container1 = getServiceContainer();
const container2 = getServiceContainer();

console.log(container1 === container2); // true
```

---

## 🧪 Testing

Services sind durch Dependency Injection einfach testbar:

```javascript
// pokemon-service.test.js
import { PokemonService } from './PokemonService.js';

describe('PokemonService', () => {
  let service;
  let mockState;
  let mockApi;
  let mockStorage;

  beforeEach(() => {
    // Mock Dependencies
    mockState = {
      setState: jest.fn(),
      get: jest.fn(),
      subscribe: jest.fn()
    };

    mockApi = {
      fetchPokemonList: jest.fn()
    };

    mockStorage = {
      get: jest.fn(),
      set: jest.fn()
    };

    // Service mit Mocks erstellen
    service = new PokemonService(mockState, mockApi, mockStorage);
  });

  it('should load pokemon', async () => {
    // Arrange
    mockApi.fetchPokemonList.mockResolvedValue({
      pokemon: [{ id: 1, name: 'bulbasaur' }],
      total: 1
    });

    // Act
    await service.loadPokemon(0, 20);

    // Assert
    expect(mockApi.fetchPokemonList).toHaveBeenCalledWith(0, 20);
    expect(mockState.setState).toHaveBeenCalled();
  });

  it('should filter by type', () => {
    // Arrange
    mockState.get.mockReturnValue([
      { id: 1, types: ['grass'] },
      { id: 4, types: ['fire'] }
    ]);

    // Act
    const filtered = service.filterByType('fire');

    // Assert
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe(4);
  });
});
```

---

## 💡 Best Practices

### DO ✅

```javascript
// 1. Services über Container abrufen
const pokemon = services.get('pokemonService');

// 2. Subscribe für reaktive Updates
pokemon.subscribe((state) => {
  updateUI(state.pokemonList);
});

// 3. Try-Catch für async Operations
try {
  await pokemon.loadPokemon(0, 20);
} catch (error) {
  showError(error.message);
}

// 4. State immutable updaten
state.setState({ ...state.getState(), newProp: value });

// 5. Services in Konstruktor injizieren
class MyComponent {
  constructor(pokemonService, teamService) {
    this.pokemon = pokemonService;
    this.team = teamService;
  }
}
```

### DON'T ❌

```javascript
// 1. Keine direkten Service Instanzen erstellen
const service = new PokemonService(); // ❌

// 2. Keinen globalen State direkt modifizieren
appState.pokemonList = [...]; // ❌
state.setState({ pokemonList: [...] }); // ✅

// 3. Kein direkter localStorage Zugriff
localStorage.setItem('team', JSON.stringify(team)); // ❌
storageService.set('team', team); // ✅

// 4. Keine unsubscribed Subscriptions
service.subscribe(() => {}); // ❌ Memory Leak
const unsub = service.subscribe(() => {});
unsub(); // ✅ Cleanup
```

---

## 🔍 Debugging

### Debug Mode aktivieren

```javascript
// Option 1: StateManager
const state = services.get('stateManager');
state.setDebugMode(true);

// Option 2: Global Flag
window.POKE_DEBUG = true;
```

### Debug Output

```javascript
// State Changes verfolgen
state.subscribe((newState, changes, oldState) => {
  console.log('=== STATE UPDATE ===');
  console.table(changes);
});

// API Cache Stats
const api = services.get('apiService');
console.log(api.getCacheStats());

// Storage Info
const storage = services.get('storageService');
console.log(storage.getInfo());

// Container Debug Info
const container = getServiceContainer();
console.log(container.getDebugInfo());
```

---

## 📚 Weitere Dokumentation

- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** - Gesamte Architektur
- **[../REFACTORING_GUIDE.md](../REFACTORING_GUIDE.md)** - Migration Guide
- **[../QUICKSTART.md](../QUICKSTART.md)** - Quick Start Guide
- **[../test-services.html](../test-services.html)** - Live Demo

---

**Version:** 1.0.0
**Status:** Production Ready ✅
