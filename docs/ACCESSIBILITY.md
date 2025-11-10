# Documentation d'Accessibilité - E-Voting Platform

**Version**: 2.2.0
**Date**: 10 novembre 2025
**Norme**: WCAG 2.1 Niveau AA
**Statut**: ✅ Conforme

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Conformité WCAG 2.1](#conformité-wcag-21)
3. [Fonctionnalités d'accessibilité](#fonctionnalités-daccessibilité)
4. [Tests d'accessibilité](#tests-daccessibilité)
5. [Navigation au clavier](#navigation-au-clavier)
6. [Technologies d'assistance](#technologies-dassistance)
7. [Contraste et couleurs](#contraste-et-couleurs)
8. [Structure sémantique](#structure-sémantique)
9. [Formulaires accessibles](#formulaires-accessibles)
10. [Guide de développement](#guide-de-développement)
11. [Problèmes connus](#problèmes-connus)
12. [Ressources](#ressources)

---

## Vue d'ensemble

E-Voting Platform est conçue pour être accessible à tous les utilisateurs, y compris ceux qui utilisent des technologies d'assistance comme les lecteurs d'écran, la navigation au clavier, ou qui ont des besoins visuels spécifiques.

### Engagement d'accessibilité

Nous nous engageons à :
- ✅ Respecter les directives WCAG 2.1 Niveau AA
- ✅ Tester régulièrement avec des technologies d'assistance
- ✅ Maintenir une navigation au clavier complète
- ✅ Fournir des alternatives textuelles pour tout contenu non-textuel
- ✅ Garantir un contraste de couleurs conforme (ratio minimum 4.5:1)
- ✅ Documenter toutes les fonctionnalités d'accessibilité

---

## Conformité WCAG 2.1

### Principes POUR (Perceivable, Operable, Understandable, Robust)

#### 1. Perceptible

✅ **1.1 Alternatives textuelles**
- Tous les éléments non-textuels ont des alt text appropriés
- Les icônes décoratives ont `aria-hidden="true"`
- Les graphiques ont des labels descriptifs

✅ **1.3 Adaptable**
- Structure sémantique HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`)
- Landmarks ARIA pour la navigation
- Hiérarchie de headings logique (h1 → h2 → h3)

✅ **1.4 Distinguable**
- Contraste de couleurs conforme (minimum 4.5:1 pour texte normal, 3:1 pour texte large)
- Focus visible sur tous les éléments interactifs
- Pas de dépendance uniquement à la couleur pour transmettre l'information

#### 2. Utilisable

✅ **2.1 Accessible au clavier**
- Toutes les fonctionnalités sont accessibles au clavier
- Pas de piège au clavier
- Ordre de navigation logique
- Raccourcis clavier documentés

✅ **2.2 Temps suffisant**
- Pas de limite de temps arbitraire pour les actions
- Sessions prolongeables
- Avertissements avant expiration de session

✅ **2.4 Navigable**
- Skip links pour contenu principal
- Titres de page descriptifs
- Navigation cohérente sur toutes les pages
- Breadcrumbs et fil d'Ariane

#### 3. Compréhensible

✅ **3.1 Lisible**
- Langue de la page spécifiée (`lang="fr"`)
- Termes techniques expliqués
- Messages d'erreur clairs

✅ **3.2 Prévisible**
- Navigation cohérente
- Identification cohérente des composants
- Pas de changement de contexte inattendu

✅ **3.3 Assistance à la saisie**
- Labels explicites sur tous les champs
- Messages d'erreur descriptifs
- Validation en temps réel (à venir Sprint 10)
- Suggestions de correction

#### 4. Robuste

✅ **4.1 Compatible**
- HTML valide
- ARIA utilisé correctement
- Compatible avec les technologies d'assistance
- Tests avec NVDA, JAWS, VoiceOver

---

## Fonctionnalités d'accessibilité

### Skip Links

Un lien "Aller au contenu principal" est présent sur toutes les pages pour permettre aux utilisateurs de navigation clavier de sauter directement au contenu.

```html
<a href="#main-content" className="skip-link">
  Aller au contenu principal
</a>
```

**Style**:
- Caché visuellement jusqu'à ce qu'il reçoive le focus
- Apparaît en haut à gauche lors du focus
- Contraste élevé (bleu sur blanc)

### Landmarks ARIA

Tous les éléments principaux de la page utilisent des landmarks ARIA :

| Landmark | Element | ARIA Role | Usage |
|----------|---------|-----------|-------|
| Banner | `<header>` | `role="banner"` | En-tête principal avec logo et navigation |
| Navigation | `<nav>` | `role="navigation"` | Menu de navigation principal |
| Main | `<main>` | `role="main"` | Contenu principal de la page |
| Section | `<section>` | `role="region"` | Sections importantes avec `aria-labelledby` |
| Alert | `<div>` | `role="alert"` | Messages d'erreur critiques |
| Status | `<div>` | `role="status"` | Notifications non-urgentes |

### Live Regions

Les mises à jour dynamiques sont annoncées aux lecteurs d'écran :

```jsx
// Résultats de recherche
<div role="status" aria-live="polite" aria-atomic="true">
  {filteredElections.length} résultat(s) trouvé(s)
</div>

// Messages d'erreur
<div role="alert" aria-live="assertive" aria-atomic="true">
  Erreur : Échec de la connexion
</div>

// Auto-save indicator
<div role="status" aria-live="polite" aria-atomic="true">
  Modifications enregistrées avec succès
</div>
```

**Types de live regions** :
- `aria-live="assertive"` : Interruption immédiate (erreurs critiques)
- `aria-live="polite"` : Annonce après l'action en cours (notifications, statuts)

### Focus Management

#### Indicateurs de focus visibles

```css
/* Focus visible par défaut */
*:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
}

/* Focus sur les inputs */
.input:focus,
select:focus,
textarea:focus {
  border-width: 2px;
  border-color: var(--primary-500);
}
```

#### Ordre de tabulation

L'ordre de tabulation suit l'ordre visuel et logique :
1. Skip link
2. Header navigation (Logo, Sécurité, Déconnexion)
3. Contenu principal
4. Formulaires et boutons
5. Footer (si présent)

#### Gestion du focus dans les onglets

```jsx
// Onglets WCAG conformes dans ElectionDetails
<div role="tablist" aria-label="Navigation de l'élection">
  <button
    role="tab"
    id="tab-voters"
    aria-selected={activeTab === 'voters'}
    aria-controls="panel-voters"
    tabIndex={activeTab === 'voters' ? 0 : -1}
    onKeyDown={(e) => {
      if (e.key === 'ArrowRight') {
        // Navigation vers l'onglet suivant
      }
    }}
  >
    Électeurs
  </button>
</div>
```

**Raccourcis clavier pour onglets** :
- `Tab` : Entrer/sortir du groupe d'onglets
- `Arrow Right/Left` : Naviguer entre les onglets
- `Enter/Space` : Activer l'onglet

---

## Tests d'accessibilité

### Tests automatisés avec axe-core

Nous utilisons [axe-core](https://github.com/dequelabs/axe-core) pour les tests automatisés d'accessibilité.

**Exécuter les tests** :
```bash
npm run test -- Dashboard.accessibility.test.jsx
```

**Exemple de test** :
```javascript
import { toHaveNoViolations } from './test-utils/axe';
import { axe } from 'axe-core';

expect.extend({ toHaveNoViolations });

test('should be accessible', async () => {
  const { container } = render(<Dashboard />);
  await expect(container).toHaveNoViolations();
});
```

### Tests manuels

#### Lecteurs d'écran testés

| Lecteur d'écran | Navigateur | OS | Status |
|----------------|------------|-----|--------|
| NVDA 2024.3 | Firefox | Windows | ✅ Testé |
| JAWS 2024 | Chrome | Windows | ✅ Testé |
| VoiceOver | Safari | macOS | ✅ Testé |
| TalkBack | Chrome | Android | ⏳ À tester |
| Narrator | Edge | Windows | ✅ Testé |

#### Checklist de test manuel

- [ ] Navigation complète au clavier (sans souris)
- [ ] Tous les boutons et liens sont accessibles
- [ ] Les formulaires sont utilisables au clavier
- [ ] Les messages d'erreur sont annoncés
- [ ] Les notifications sont annoncées
- [ ] Le focus est visible à tout moment
- [ ] Pas de piège au clavier
- [ ] Les onglets fonctionnent avec les flèches
- [ ] Les modals peuvent être fermées avec Escape
- [ ] Le skip link fonctionne

### Outils de test

1. **axe DevTools** (Extension navigateur)
   - Scan automatique de la page
   - Rapport détaillé des violations
   - [Chrome](https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

2. **WAVE** (Extension navigateur)
   - Évaluation visuelle de l'accessibilité
   - [WAVE Extension](https://wave.webaim.org/extension/)

3. **Lighthouse** (Chrome DevTools)
   - Audit d'accessibilité intégré
   - Score et recommandations

4. **pa11y-ci** (CLI)
   ```bash
   npm run test:a11y
   ```

---

## Navigation au clavier

### Raccourcis globaux

| Raccourci | Action |
|-----------|--------|
| `Tab` | Élément suivant |
| `Shift + Tab` | Élément précédent |
| `Enter` | Activer bouton/lien |
| `Space` | Activer bouton/checkbox |
| `Escape` | Fermer modal/dropdown |
| `Arrow Keys` | Navigation dans onglets/select |

### Navigation dans les composants

#### Onglets (Tab Pattern)
- `Tab` : Entrer dans le groupe d'onglets
- `Arrow Right` : Onglet suivant
- `Arrow Left` : Onglet précédent
- `Home` : Premier onglet
- `End` : Dernier onglet

#### Dropdown / Select
- `Enter/Space` : Ouvrir
- `Arrow Up/Down` : Naviguer dans les options
- `Enter` : Sélectionner
- `Escape` : Fermer sans sélectionner

#### Modal / Dialog
- `Tab` : Focus piégé dans le modal
- `Escape` : Fermer le modal
- Focus automatique sur le premier élément interactif

---

## Technologies d'assistance

### Support des lecteurs d'écran

#### NVDA (Windows - Gratuit)

**Configuration testée** :
- NVDA 2024.3
- Firefox 120+
- Windows 10/11

**Annonces testées** :
- ✅ Navigation dans les landmarks
- ✅ Headings et structure
- ✅ Labels de formulaires
- ✅ Messages d'erreur (role="alert")
- ✅ Notifications (aria-live)
- ✅ Changements dynamiques
- ✅ Onglets (tablist pattern)

#### JAWS (Windows - Commercial)

**Configuration testée** :
- JAWS 2024
- Chrome 120+
- Windows 10/11

**Annonces testées** :
- ✅ Virtual cursor navigation
- ✅ Forms mode
- ✅ Table navigation
- ✅ ARIA landmarks
- ✅ Live regions

#### VoiceOver (macOS - Intégré)

**Configuration testée** :
- macOS Sonoma 14.x
- Safari 17+

**Annonces testées** :
- ✅ Rotor navigation
- ✅ Headings
- ✅ Formulaires
- ✅ Notifications

### Support de la navigation au clavier

- ✅ Tous les éléments interactifs sont focusables
- ✅ Focus visible sur tous les éléments
- ✅ Ordre de tabulation logique
- ✅ Pas de piège au clavier
- ✅ Raccourcis clavier documentés

### Support du zoom

- ✅ Zoom jusqu'à 200% sans perte de fonctionnalité
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Pas de défilement horizontal à 400% (WCAG 2.1 Level AA)

---

## Contraste et couleurs

### Ratios de contraste conformes

Toutes les couleurs respectent le ratio minimum de **4.5:1** pour le texte normal et **3:1** pour le texte large (≥18pt).

| Couleur | Hex | Ratio | Usage | Status |
|---------|-----|-------|-------|--------|
| Primary | `#2563eb` | 5.17:1 | Texte sur fond blanc | ✅ |
| Success | `#047857` | 6.36:1 | Messages de succès | ✅ |
| Danger | `#dc2626` | 4.83:1 | Messages d'erreur | ✅ |
| Warning | `#b45309` | 6.26:1 | Avertissements | ✅ |
| Info | `#2563eb` | 5.17:1 | Informations | ✅ |
| Text Muted | `#6b7280` | 4.83:1 | Texte secondaire | ✅ |

### Variables CSS

```css
:root {
  /* Primary colors */
  --primary: #2563eb;         /* 5.17:1 ✅ */
  --primary-600: #1d4ed8;     /* 6.70:1 ✅ */

  /* Functional colors */
  --success: #047857;         /* 6.36:1 ✅ */
  --success-600: #047857;     /* 6.36:1 ✅ */
  --danger: #dc2626;          /* 4.83:1 ✅ */
  --warning: #b45309;         /* 6.26:1 ✅ */

  /* Text colors */
  --text-primary: #111827;    /* 16.05:1 ✅ */
  --text-secondary: #374151;  /* 11.74:1 ✅ */
  --text-muted: #6b7280;      /* 4.83:1 ✅ */
}
```

### Indication non uniquement par couleur

⚠️ **Principe important** : Ne jamais utiliser uniquement la couleur pour transmettre l'information.

✅ **Bonne pratique** :
```jsx
{/* Icon + Couleur + Texte */}
<div style={{ color: 'var(--success-600)' }}>
  <CheckCircle aria-hidden="true" />
  <span>Vote enregistré avec succès</span>
</div>
```

❌ **Mauvaise pratique** :
```jsx
{/* Couleur seule */}
<div style={{ color: 'green' }}>
  Vote enregistré
</div>
```

---

## Structure sémantique

### Hiérarchie de headings

Chaque page doit avoir une hiérarchie de headings logique :

```html
<h1>Tableau de bord</h1>  <!-- Un seul h1 par page -->
  <h2>Statistiques</h2>
  <h2>Mes élections</h2>
    <h3>Élection 1</h3>
    <h3>Élection 2</h3>
```

⚠️ **Ne jamais sauter de niveau** (h1 → h3)

### Landmarks HTML5 + ARIA

```jsx
// Dashboard.jsx - Exemple de structure
<div>
  {/* Banner landmark */}
  <header role="banner">
    <h1>Tableau de bord</h1>
    <nav aria-label="Navigation principale">
      <button>Sécurité</button>
      <button>Déconnexion</button>
    </nav>
  </header>

  {/* Main content */}
  <main id="main-content" role="main">
    {/* Statistics section */}
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Statistiques des élections
      </h2>
      {/* Stats cards */}
    </section>

    {/* Elections list */}
    <section aria-labelledby="elections-heading">
      <h2 id="elections-heading">Mes élections</h2>
      {/* Elections list */}
    </section>
  </main>
</div>
```

### Classe .sr-only

Pour masquer visuellement du contenu tout en le gardant accessible aux lecteurs d'écran :

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Usage** :
```jsx
<h2 className="sr-only">Statistiques</h2>
<label htmlFor="search" className="sr-only">
  Rechercher une élection
</label>
```

---

## Formulaires accessibles

### Labels explicites

✅ **Toujours associer un label à chaque input** :

```jsx
<label htmlFor="email">Adresse email</label>
<input
  id="email"
  type="email"
  aria-required="true"
  aria-invalid={error ? "true" : "false"}
  aria-describedby={error ? "email-error" : undefined}
/>
{error && (
  <div id="email-error" role="alert">
    {error}
  </div>
)}
```

### Messages d'erreur accessibles

Les messages d'erreur doivent :
1. Avoir `role="alert"` pour être annoncés immédiatement
2. Être liés au champ avec `aria-describedby`
3. Expliquer comment corriger l'erreur

```jsx
// ErrorAlert.jsx - Composant accessible
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  <AlertCircle aria-hidden="true" />
  <div>
    <strong>Erreur :</strong> {message}
  </div>
  {actionHint && (
    <div>
      <Info aria-hidden="true" />
      {actionHint}
    </div>
  )}
</div>
```

### Champs requis

```jsx
<label htmlFor="password">
  Mot de passe
  <span className="form-field__required" aria-label="required">
    *
  </span>
</label>
<input
  id="password"
  type="password"
  aria-required="true"
  required
/>
```

### Groupes de champs (fieldset)

Pour les groupes de champs liés (checkboxes, radios) :

```jsx
<fieldset>
  <legend>Paramètres de vote</legend>
  <label>
    <input type="checkbox" name="is_secret" />
    Vote secret
  </label>
  <label>
    <input type="checkbox" name="is_weighted" />
    Vote pondéré
  </label>
</fieldset>
```

---

## Guide de développement

### Checklist pour les nouveaux composants

Avant de créer un nouveau composant, vérifiez :

- [ ] **Sémantique HTML**
  - [ ] Utiliser des balises HTML5 appropriées
  - [ ] Headings dans le bon ordre (h1 → h2 → h3)
  - [ ] Landmarks ARIA si nécessaire

- [ ] **Clavier**
  - [ ] Tous les éléments interactifs sont focusables
  - [ ] Focus visible
  - [ ] Pas de piège au clavier
  - [ ] Gestion des événements clavier (Enter, Space, Escape)

- [ ] **ARIA**
  - [ ] Labels sur tous les éléments interactifs
  - [ ] `aria-hidden="true"` sur les icônes décoratives
  - [ ] Roles appropriés (button, tab, dialog, etc.)
  - [ ] Live regions pour les changements dynamiques

- [ ] **Couleurs et contrastes**
  - [ ] Utiliser les variables CSS conformes
  - [ ] Vérifier le contraste avec un outil (WebAIM Contrast Checker)
  - [ ] Ne pas utiliser uniquement la couleur

- [ ] **Formulaires**
  - [ ] Labels explicites avec `htmlFor`
  - [ ] Messages d'erreur avec `role="alert"`
  - [ ] `aria-required`, `aria-invalid`, `aria-describedby`

- [ ] **Tests**
  - [ ] Tests automatisés avec axe-core
  - [ ] Test manuel au clavier
  - [ ] Test avec un lecteur d'écran

### Bonnes pratiques

#### 1. Icônes décoratives

```jsx
// ✅ Bon
<Save size={14} aria-hidden="true" />
<span>Enregistrer</span>

// ❌ Mauvais
<Save size={14} />
```

#### 2. Boutons vs Links

```jsx
// ✅ Button pour les actions
<button onClick={handleSave}>
  Enregistrer
</button>

// ✅ Link pour la navigation
<Link to="/elections">
  Voir les élections
</Link>

// ❌ Div avec onClick
<div onClick={handleSave}>  {/* Non accessible au clavier */}
  Enregistrer
</div>
```

#### 3. Focus trap dans les modals

```jsx
useEffect(() => {
  if (isOpen) {
    // Focus sur le premier élément
    modalRef.current?.querySelector('button, input')?.focus();

    // Gérer Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }
}, [isOpen, onClose]);
```

#### 4. Live regions

```jsx
// Pour les notifications non-critiques
<div role="status" aria-live="polite" aria-atomic="true">
  Élection créée avec succès
</div>

// Pour les erreurs critiques
<div role="alert" aria-live="assertive" aria-atomic="true">
  Erreur : Échec de la sauvegarde
</div>
```

---

## Problèmes connus

### En cours de résolution

1. **Validation en temps réel des formulaires** (Sprint 10)
   - Status : ⏳ Planifié
   - Impact : Moyen
   - Description : Validation instantanée pendant la saisie pour une meilleure UX

2. **Focus trap dans certaines modales WebhookSettings**
   - Status : ⏳ À corriger
   - Impact : Faible
   - Description : Le focus peut sortir de la modale avec Tab
   - Workaround : Utiliser Escape pour fermer

### Limitations techniques

1. **Recharts (graphiques)**
   - Les graphiques Recharts ont un support d'accessibilité limité
   - Workaround : Fournir des tableaux de données alternatifs
   - À améliorer : Ajouter des descriptions textuelles complètes

2. **QR Codes**
   - Les QR codes ne sont pas accessibles aux lecteurs d'écran
   - Workaround : Fournir des URLs alternatives
   - Conformité : OK car alternative textuelle fournie

---

## Ressources

### Documentation WCAG

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Articles](https://webaim.org/articles/)

### Outils

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Lecteurs d'écran

- [NVDA (Windows - Gratuit)](https://www.nvaccess.org/)
- [JAWS (Windows - Commercial)](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (macOS - Intégré)](https://www.apple.com/accessibility/voiceover/)

### Testing

- [axe-core](https://github.com/dequelabs/axe-core)
- [pa11y](https://pa11y.org/)
- [jest-axe](https://github.com/nickcolley/jest-axe)

---

## Contact et Support

Pour toute question ou problème d'accessibilité, veuillez :

1. **Signaler un problème** : [GitHub Issues](https://github.com/your-org/e-voting/issues)
2. **Email** : accessibility@evoting.example.com
3. **Documentation** : Consultez ce fichier ACCESSIBILITY.md

Nous nous engageons à répondre sous 48 heures et à corriger les problèmes d'accessibilité critiques en priorité.

---

**Dernière mise à jour** : 10 novembre 2025
**Prochaine révision** : Sprint 10 (validation temps réel)
