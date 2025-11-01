# 🧪 Guide des Tests - E-Voting v2.0

Date : 16 octobre 2025

---

## 🎯 Objectif

Ce guide documente l'infrastructure de tests mise en place pour l'application E-Voting v2.0, couvrant les tests unitaires et d'intégration des composants React.

---

## ⚙️ Infrastructure de Tests

### Technologies Utilisées

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Vitest** | ^3.2.4 | Framework de test (alternative rapide à Jest) |
| **@testing-library/react** | Latest | Tests de composants React |
| **@testing-library/jest-dom** | Latest | Matchers personnalisés pour le DOM |
| **@testing-library/user-event** | Latest | Simulation d'interactions utilisateur |
| **jsdom** | Latest | Environnement DOM pour les tests |

### Pourquoi Vitest ?

✅ **Avantages:**
- Intégration native avec Vite (notre bundler)
- 10x plus rapide que Jest
- Compatible avec l'API Jest (migration facile)
- Hot Module Replacement (HMR) pour les tests
- Support TypeScript natif
- Moins de configuration

---

## 📁 Structure des Fichiers de Tests

```
e:\GitHub\Test\Evoting\
├── src/
│   ├── test/
│   │   └── setup.js                    # Configuration globale des tests
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Login.test.jsx              # Tests pour Login
│   │   ├── Register.jsx
│   │   └── Register.test.jsx           # Tests pour Register
│   └── components/
│       ├── QRCodeModal.jsx
│       ├── QRCodeModal.test.jsx        # Tests pour QRCodeModal
│       ├── AddVotersModal.jsx
│       └── AddVotersModal.test.jsx     # Tests pour AddVotersModal
├── vite.config.js                      # Config Vite avec support tests
└── package.json                        # Scripts de test
```

**Convention:** Chaque fichier composant `ComponentName.jsx` a un fichier de test `ComponentName.test.jsx` dans le même répertoire.

---

## 🔧 Configuration

### 1. `vite.config.js`

```javascript
export default defineConfig({
  plugins: [react()],
  // ... autres configs ...
  test: {
    globals: true,              // Variables globales (describe, it, expect)
    environment: 'jsdom',       // Environnement DOM simulé
    setupFiles: './src/test/setup.js',  // Fichier de setup
    css: true,                  // Support CSS dans les tests
  },
});
```

### 2. `src/test/setup.js`

```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup après chaque test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (pour tests responsive)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage
const localStorageMock = {
  getItem: (key) => null,
  setItem: (key, value) => {},
  removeItem: (key) => {},
  clear: () => {},
};

global.localStorage = localStorageMock;
```

### 3. `package.json` - Scripts

```json
{
  "scripts": {
    "test": "vitest",                    // Mode watch (interactif)
    "test:ui": "vitest --ui",            // Interface graphique
    "test:coverage": "vitest --coverage" // Rapport de couverture
  }
}
```

---

## 🧪 Composants Testés

### 1. Login Component ([Login.test.jsx](src/pages/Login.test.jsx))

**Fichier:** `src/pages/Login.test.jsx`
**Composant:** `src/pages/Login.jsx`

#### Catégories de Tests

##### 📋 Rendering (4 tests)
- Affichage du titre "E-Voting"
- Affichage du formulaire (email, password)
- Présence du lien "S'inscrire"
- Placeholders corrects

##### ✅ Form Validation (3 tests)
- Champs requis (email, password)
- Type "email" pour email
- Type "password" pour password

##### 👆 User Interaction (4 tests)
- Saisie dans email et password
- État "Connexion..." pendant soumission
- Bouton désactivé pendant soumission

##### ✅ Successful Login (6 tests)
- Envoi des bonnes données à `/auth/login`
- Stockage du token dans localStorage
- Stockage des données utilisateur
- Appel de `setIsAuthenticated(true)`
- Redirection vers `/dashboard`

##### ❌ Failed Login (5 tests)
- Affichage message d'erreur
- Message générique si pas de détails
- Pas de stockage en cas d'échec
- Pas d'appel setIsAuthenticated
- Bouton redevient actif

##### 🔄 Error Clearing (1 test)
- Effacement erreur lors nouvelle soumission

**Total: 23 tests**

---

### 2. Register Component ([Register.test.jsx](src/pages/Register.test.jsx))

**Fichier:** `src/pages/Register.test.jsx`
**Composant:** `src/pages/Register.jsx`

#### Catégories de Tests

##### 📋 Rendering (5 tests)
- Titre "E-Voting"
- Texte "Créer un compte administrateur"
- Tous les champs (nom, email, password, confirmPassword)
- Bouton "Créer mon compte"
- Lien vers connexion

##### ✅ Form Validation (3 tests)
- Tous les champs requis
- Type "email" pour email
- Type "password" pour mots de passe

##### 👆 User Interaction (3 tests)
- Saisie dans tous les champs
- État "Création..." pendant soumission
- Bouton désactivé pendant soumission

##### ⚠️ Client-Side Validation (3 tests)
- Erreur si mots de passe différents
- Erreur si mot de passe < 6 caractères
- Pas d'erreur avec mot de passe = 6 caractères

##### ✅ Successful Registration (6 tests)
- Envoi données correctes à `/auth/register`
- Non-envoi de confirmPassword
- Stockage token
- Stockage données utilisateur
- Appel setIsAuthenticated(true)
- Redirection vers /dashboard

##### ❌ Failed Registration (5 tests)
- Affichage message d'erreur
- Message générique si pas de détails
- Pas de stockage en cas d'échec
- Pas d'appel setIsAuthenticated
- Bouton redevient actif

##### 🔄 Error Clearing (1 test)
- Effacement erreur lors nouvelle soumission

**Total: 26 tests**

---

### 3. QRCodeModal Component ([QRCodeModal.test.jsx](src/components/QRCodeModal.test.jsx))

**Fichier:** `src/components/QRCodeModal.test.jsx`
**Composant:** `src/components/QRCodeModal.jsx`

#### Catégories de Tests

##### 📋 Rendering (7 tests)
- Titre "QR Code de Vote"
- Bouton de fermeture
- QR code affiché
- Informations électeur (nom, email, poids)
- Lien de vote
- Affichage "-" si pas de nom
- Boutons d'action (Télécharger, Copier)

##### 🔲 QR Code Generation (3 tests)
- URL correcte dans QR code
- ID "qr-code-svg"
- Utilisation du token électeur

##### 👆 Modal Interaction (3 tests)
- Fermeture sur bouton X
- Fermeture sur clic overlay
- Pas de fermeture sur clic contenu

##### 📋 Copy to Clipboard (2 tests)
- Copie du lien dans presse-papier
- Affichage alerte après copie

##### 💾 Download QR Code (2 tests)
- Téléchargement avec nom correct (nom électeur)
- Utilisation email si pas de nom

##### 📊 Voter Data Display (3 tests)
- Affichage toutes propriétés
- Gestion poids = 1
- Affichage poids décimal

##### 🌐 URL Construction (2 tests)
- Utilisation window.location.origin
- Format URL correct

**Total: 22 tests**

---

### 4. AddVotersModal Component ([AddVotersModal.test.jsx](src/components/AddVotersModal.test.jsx))

**Fichier:** `src/components/AddVotersModal.test.jsx`
**Composant:** `src/components/AddVotersModal.jsx`

#### Catégories de Tests

##### 📋 Rendering (4 tests)
- Titre "Ajouter des électeurs"
- Deux onglets (Manuel, CSV)
- Mode manuel par défaut
- Bouton de fermeture

##### 🔀 Tab Navigation (2 tests)
- Basculement vers mode CSV
- Retour au mode manuel

##### 👥 Manual Mode - Voter Management (5 tests)
- Une ligne par défaut
- Ajout nouvelle ligne
- Ajout multiples lignes
- Suppression ligne
- Pas de bouton supprimer si 1 ligne

##### ✅ Manual Mode - Form Submission (6 tests)
- Erreur si aucun électeur valide
- Envoi électeurs à l'API
- Filtrage lignes vides
- Message succès + fermeture modal
- Affichage erreur en cas d'échec
- Texte "Ajout en cours..." pendant soumission

##### 📄 CSV Mode (6 tests)
- Affichage formulaire CSV
- Instructions de format
- Téléchargement modèle CSV
- Affichage nom fichier sélectionné
- Erreur si pas de fichier
- Envoi fichier à l'API
- Fermeture après import réussi

##### 👆 Modal Interaction (3 tests)
- Fermeture sur bouton Annuler
- Fermeture sur clic overlay
- Pas de fermeture sur clic contenu

**Total: 26 tests**

---

## 📊 Statistiques Globales

### Tests Créés

| Composant | Fichier | Tests | Catégories |
|-----------|---------|-------|------------|
| Login | Login.test.jsx | 23 | 6 |
| Register | Register.test.jsx | 26 | 7 |
| QRCodeModal | QRCodeModal.test.jsx | 22 | 7 |
| AddVotersModal | AddVotersModal.test.jsx | 26 | 6 |
| **TOTAL** | **4 fichiers** | **97 tests** | **26 catégories** |

### Couverture Fonctionnelle

✅ **Testés:**
- Authentification (Login, Register)
- Gestion des électeurs (Ajout manuel et CSV)
- Génération QR codes
- Modales et interactions
- Validation formulaires
- Gestion erreurs
- États de chargement

⏳ **À tester (optionnel):**
- Dashboard
- CreateElection
- ElectionDetails
- VotingPage
- ResultsChart
- NotificationCenter

---

## 🚀 Utilisation

### Lancer les Tests

#### Mode Watch (recommandé pour développement)

```bash
npm test
```

- Relance automatiquement les tests modifiés
- Filtrage par nom de fichier ou test
- Interface interactive

#### Mode UI (interface graphique)

```bash
npm run test:ui
```

- Interface web sur http://localhost:51204
- Visualisation arborescence des tests
- Graphiques de performance
- Rapport détaillé

#### Run Once (CI/CD)

```bash
npm test -- --run
```

- Exécute tous les tests une seule fois
- Sortie en mode CI
- Utilisé pour GitHub Actions, etc.

#### Avec Couverture de Code

```bash
npm run test:coverage
```

- Génère rapport de couverture
- Affiche % de lignes/branches/fonctions testées
- Crée dossier `coverage/` avec rapport HTML

---

## 📝 Anatomie d'un Test

### Structure Basique

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup avant chaque test
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('devrait afficher le titre', () => {
      render(<MyComponent />);
      expect(screen.getByText(/Titre/i)).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('devrait permettre de cliquer sur un bouton', async () => {
      const user = userEvent.setup();
      render(<MyComponent />);

      const button = screen.getByRole('button', { name: /Cliquer/i });
      await user.click(button);

      expect(screen.getByText(/Cliqué!/i)).toBeInTheDocument();
    });
  });
});
```

### Mocking API Calls

```javascript
import api from '../utils/api';

vi.mock('../utils/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Dans le test
api.post.mockResolvedValueOnce({
  data: { message: 'Succès' },
});

// Ou pour simuler une erreur
api.post.mockRejectedValueOnce({
  response: { data: { error: 'Erreur serveur' } },
});
```

### Mocking Navigation (React Router)

```javascript
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Vérifier redirection
expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
```

### Helper pour Router

```javascript
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Utilisation
renderWithRouter(<Login setIsAuthenticated={mockFn} />);
```

---

## 🔍 Queries React Testing Library

### Ordre de Priorité (recommandé)

1. **getByRole** - Accessible (boutons, inputs, etc.)
   ```javascript
   screen.getByRole('button', { name: /Se connecter/i })
   ```

2. **getByLabelText** - Labels de formulaires
   ```javascript
   screen.getByLabelText(/Email/i)
   ```

3. **getByPlaceholderText** - Placeholders
   ```javascript
   screen.getByPlaceholderText(/admin@example.com/i)
   ```

4. **getByText** - Contenu texte
   ```javascript
   screen.getByText(/E-Voting/i)
   ```

5. **getByTestId** - Dernier recours
   ```javascript
   screen.getByTestId('custom-element')
   ```

### Variants

- **getBy...** - Erreur si non trouvé
- **queryBy...** - Retourne null si non trouvé
- **findBy...** - Async, attend apparition

### Assertions Courantes

```javascript
// Présence
expect(element).toBeInTheDocument();
expect(element).toBeVisible();

// Attributs
expect(input).toHaveValue('test@example.com');
expect(input).toBeRequired();
expect(input).toBeDisabled();
expect(input).toHaveAttribute('type', 'email');

// Texte
expect(element).toHaveTextContent('Texte');

// Classes/Styles
expect(element).toHaveClass('btn-primary');
expect(element).toHaveStyle({ color: 'red' });
```

---

## 🎯 Bonnes Pratiques

### 1. Tester le Comportement, Pas l'Implémentation

❌ **Mauvais:**
```javascript
expect(component.state.count).toBe(5);
```

✅ **Bon:**
```javascript
expect(screen.getByText(/5 items/i)).toBeInTheDocument();
```

### 2. Utiliser userEvent au Lieu de fireEvent

❌ **Mauvais:**
```javascript
fireEvent.click(button);
```

✅ **Bon:**
```javascript
const user = userEvent.setup();
await user.click(button);
```

**Pourquoi:** `userEvent` simule mieux les interactions réelles (focus, hover, etc.)

### 3. Éviter waitFor si Possible

❌ **Mauvais:**
```javascript
await waitFor(() => {
  expect(screen.getByText(/Succès/i)).toBeInTheDocument();
});
```

✅ **Bon:**
```javascript
expect(await screen.findByText(/Succès/i)).toBeInTheDocument();
```

### 4. Nettoyer les Mocks

```javascript
beforeEach(() => {
  vi.clearAllMocks();  // Nettoie compteurs et arguments
  localStorage.clear(); // Nettoie localStorage
});
```

### 5. Grouper les Tests Logiquement

```javascript
describe('MyComponent', () => {
  describe('Rendering', () => { /* ... */ });
  describe('User Interaction', () => { /* ... */ });
  describe('API Calls', () => { /* ... */ });
});
```

### 6. Utiliser des describe Descriptifs

✅ **Bon:**
```javascript
describe('Login Component', () => {
  describe('Successful Login', () => {
    it('devrait stocker le token dans localStorage', () => {});
  });
});
```

### 7. Tester les Cas Limites

- Champs vides
- Erreurs réseau
- Réponses inattendues
- États de chargement
- Désactivation boutons

---

## 🐛 Debugging des Tests

### 1. Afficher le DOM

```javascript
import { screen } from '@testing-library/react';

screen.debug();  // Affiche tout le DOM
screen.debug(element);  // Affiche un élément spécifique
```

### 2. Logcat Queries Disponibles

```javascript
screen.logTestingPlaygroundURL();
```

Génère un lien vers Testing Playground avec suggestions de queries.

### 3. Pause d'Exécution

```javascript
import { screen } from '@testing-library/react';

await screen.findByText(/Loading/i);
await new Promise(r => setTimeout(r, 1000));  // Pause 1s
```

### 4. Voir les Mocks Appelés

```javascript
console.log(api.post.mock.calls);  // Tous les appels
console.log(api.post.mock.calls[0]);  // Premier appel
console.log(api.post.mock.calls[0][0]);  // URL du premier appel
console.log(api.post.mock.calls[0][1]);  // Body du premier appel
```

---

## 📈 Intégration Continue (CI/CD)

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

---

## ❓ FAQ

### Q: Pourquoi "getByLabelText" échoue ?

**R:** Le label n'a pas d'attribut `for` associé à l'input. Solutions:

```javascript
// Option 1: Utiliser getByPlaceholderText
const input = screen.getByPlaceholderText(/Email/i);

// Option 2: Utiliser container.querySelector
const { container } = render(<Component />);
const input = container.querySelector('input[type="email"]');

// Option 3: Corriger le composant (recommandé)
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Q: Test échoue avec "act" warning ?

**R:** Opération asynchrone pas attendue. Utilisez `await` ou `waitFor`:

```javascript
// ❌ Mauvais
user.click(button);

// ✅ Bon
await user.click(button);
```

### Q: Comment tester un composant avec Context ?

**R:** Wrapper le composant:

```javascript
const renderWithContext = (component) => {
  return render(
    <AuthContext.Provider value={{ user: mockUser }}>
      {component}
    </AuthContext.Provider>
  );
};
```

### Q: Comment tester window.location ?

**R:** Mock window.location:

```javascript
beforeEach(() => {
  delete window.location;
  window.location = { origin: 'http://localhost:5173' };
});
```

---

## 🔗 Ressources

### Documentation Officielle

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM](https://github.com/testing-library/jest-dom)
- [User Event](https://testing-library.com/docs/user-event/intro/)

### Cheatsheets

- [React Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom#custom-matchers)

### Tutoriels

- [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Playground](https://testing-playground.com/)

---

## ✅ Conclusion

### Ce qui a été fait:

✅ Infrastructure de tests complète (Vitest + React Testing Library)
✅ 97 tests unitaires et d'intégration
✅ 4 composants critiques testés (Auth + Voters)
✅ Mocking API, Router, localStorage, clipboard
✅ Documentation complète

### Prochaines étapes suggérées:

1. **Tests E2E** (Playwright ou Cypress)
2. **Tests des composants restants** (Dashboard, CreateElection, VotingPage)
3. **Tests backend** (routes API avec Supertest)
4. **Tests de performance** (React Profiler)
5. **Snapshot testing** (pour détecter changements UI)

---

🎉 **L'application E-Voting v2.0 dispose maintenant d'une base solide de tests automatisés!**
