# 📋 Roadmap d'Améliorations - E-Voting Application

**Document de Planification Détaillé**
**Date:** Novembre 2024
**Version:** 1.0
**Statut:** Approuvé pour Implémentation

---

## 📑 Table des Matières

1. [Executive Summary](#executive-summary)
2. [Phase 1: Critique](#phase-1---critique-1-2-semaines)
3. [Phase 2: Important](#phase-2---important-2-4-semaines)
4. [Phase 3: Utile](#phase-3---utile-1-mois)
5. [Matrices de Dépendances](#matrices-de-dépendances)
6. [Métriques de Succès](#métriques-de-succès)
7. [Estimations et Timeline](#estimations-et-timeline)
8. [Risques et Mitigation](#risques-et-mitigation)

---

## Executive Summary

### Contexte
L'application e-voting actuelle est **production-ready** avec un score global de **7.6/10**. Cette roadmap optimise les domaines clés:
- **Performance** (+3 points) - React Query pour caching
- **Testing** (+4 points) - Coverage de 27% → 80%+
- **Type Safety** (+2 points) - TypeScript
- **Accessibilité** (+2 points) - ARIA labels
- **Documentation** (+2 points) - Swagger OpenAPI

### Bénéfices Attendus
| Impact | Métrique | Actuel | Cible | Gain |
|--------|----------|--------|-------|------|
| **Performance** | Latency p95 | 3-5s | 500ms | 90% ↓ |
| **Tests** | Coverage | 27% | 80% | +53pp |
| **Maintenance** | Type errors | ~5/sprint | ~0/sprint | 100% ↓ |
| **Accessibilité** | WCAG 2.1 AA | ~60% | 95% | +35pp |
| **Stabilité** | Regressions | ~3/sprint | ~1/sprint | 67% ↓ |

### Investissement Total
- **Effort:** 12-16 semaines (1 senior + 1 junior dev)
- **Budget:** ~60,000-80,000 EUR (en ressources)
- **ROI:** 3-4x (qualité, moins de bugs, maintenance réduite)

---

## 🔴 PHASE 1 - CRITIQUE (1-2 semaines)

### Objectif
Améliorations à impact maximal, effort minimal. Niveau **MUST HAVE**.

---

## 1.1 React Query - Caching Client

### 🎯 Objectif
Implémenter une stratégie de cache côté client pour les données serveur, réduisant les appels API et améliorant la UX de 90%.

### 📊 Impact
| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **API Calls** | 30 req/session | 8 req/session | -73% |
| **Latency p95** | 3-5s | 500ms | -90% |
| **Page Load** | 4s | 1.2s | -70% |
| **Server Load** | 100% | 30% | -70% |
| **User Satisfaction** | 6/10 | 9/10 | +50% |

### 📋 Tâches

#### 1.1.1 Setup React Query Infrastructure
**Effort:** 4 heures
**Assigné à:** Senior Dev

**Livrables:**
- [ ] Installation `@tanstack/react-query` et `@tanstack/react-query-devtools`
- [ ] Création de `QueryClientProvider` dans `App.jsx`
- [ ] Configuration options globales:
  ```javascript
  // src/config/queryClient.js
  import { QueryClient } from '@tanstack/react-query';

  export const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,        // 5 minutes
        cacheTime: 1000 * 60 * 10,       // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
  ```
- [ ] Installation React Query DevTools pour debugging
- [ ] Documentation setup local

#### 1.1.2 Refactoriser Elections List
**Effort:** 6 heures
**Assigné à:** Senior Dev

**Fichiers à modifier:**
- `src/pages/Dashboard.jsx`
- `src/hooks/useAuth.js` (ajouter hook élections)

**Implémentation:**
```javascript
// src/hooks/useElections.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

export function useElections(page = 1, limit = 10, filters = {}) {
  return useQuery({
    queryKey: ['elections', page, limit, filters],
    queryFn: async () => {
      const response = await api.get('/elections', {
        params: { page, limit, ...filters }
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 5,      // Valide 5 minutes
    cacheTime: 1000 * 60 * 10,     // Cache 10 minutes
  });
}

// Dashboard.jsx
const { data, isLoading, isPreviousData } = useElections(currentPage, 10);

// Automatique:
// - Cache sur pagination arrière
// - Background refetch chaque 5 minutes
// - Optimistic updates possibles
```

**Tests à ajouter:**
- [ ] Test cache hit on page navigation
- [ ] Test background refetch
- [ ] Test stale invalidation

#### 1.1.3 Refactoriser Voters List
**Effort:** 8 heures
**Assigné à:** Senior Dev

**Fichiers à modifier:**
- `src/components/VotersTable.jsx`
- `src/hooks/useVoters.js` (NEW)

**Implémentation:**
```javascript
// src/hooks/useVoters.js
import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

export function useVoters(electionId, page = 1, filters = {}) {
  return useQuery({
    queryKey: ['voters', electionId, page, filters],
    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/voters`, {
        params: { page, ...filters }
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 3,       // 3 minutes (volatile data)
    cacheTime: 1000 * 60 * 5,       // 5 minutes cache
    enabled: !!electionId,          // Only fetch if election selected
  });
}

// VotersTable.jsx
const { data: voters, isLoading, error } = useVoters(
  electionId,
  currentPage,
  { search, status, sort }
);

// Plus de loadings brusques on revient en arrière!
```

**Tests à ajouter:**
- [ ] Test voters cache
- [ ] Test enabled logic
- [ ] Test filter changes invalidate

#### 1.1.4 Refactoriser Results Page
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Fichiers à modifier:**
- `src/pages/Results.jsx`
- `src/hooks/useResults.js` (NEW)

**Implémentation:**
```javascript
// src/hooks/useResults.js
export function useResults(electionId) {
  return useQuery({
    queryKey: ['results', electionId],
    queryFn: () => api.get(`/elections/${electionId}/results`),
    staleTime: 1000 * 30,           // 30 secondes (live updates)
    refetchInterval: 1000 * 10,     // Refetch toutes les 10s
    enabled: !!electionId,
  });
}
```

#### 1.1.5 Mutations et Optimistic Updates
**Effort:** 6 heures
**Assigné à:** Senior Dev

**Fichiers à créer:**
- `src/hooks/useMutations.js`

**Implémentation:**
```javascript
// Exemple: Add voter
export function useAddVoter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (voterData) =>
      api.post('/voters', voterData),

    // Optimistic update
    onMutate: async (newVoter) => {
      // Annuler refetch en vol
      await queryClient.cancelQueries({ queryKey: ['voters'] });

      // Snapshot ancien state
      const previousVoters = queryClient.getQueryData(['voters']);

      // Optimistic update
      queryClient.setQueryData(['voters'], (old) => ({
        ...old,
        voters: [newVoter, ...old.voters]
      }));

      return { previousVoters };
    },

    // Rollback on error
    onError: (err, newVoter, context) => {
      if (context?.previousVoters) {
        queryClient.setQueryData(['voters'], context.previousVoters);
      }
    },

    // Invalidate quand succès
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters'] });
    }
  });
}
```

**Où utiliser:**
- [ ] Add voter form
- [ ] Bulk import voters
- [ ] Update election settings
- [ ] Delete voters
- [ ] Create election

#### 1.1.6 Documentation React Query
**Effort:** 4 heures
**Assigné à:** Junior Dev

**Créer:** `docs/REACT_QUERY_GUIDE.md`
- Installation & setup
- Exemples de hooks
- Best practices
- Debugging avec DevTools
- Cache strategy

#### 1.1.7 Testing React Query
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Créer:** Tests pour tous les hooks
```javascript
// tests/hooks/useElections.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { useElections } from '@/hooks/useElections';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useElections', () => {
  it('caches elections data', async () => {
    const { result, rerender } = renderHook(
      () => useElections(1, 10),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstData = result.current.data;

    // Rerender - devrait utiliser le cache
    rerender();

    expect(result.current.data).toBe(firstData);
  });
});
```

**Livrables:**
- [ ] useElections.test.js
- [ ] useVoters.test.js
- [ ] useResults.test.js
- [ ] useMutations.test.js
- [ ] Coverage: 80%+

### 📦 Dépendances
```json
{
  "@tanstack/react-query": "^5.28.0",
  "@tanstack/react-query-devtools": "^5.28.0"
}
```

### 🎯 Critères d'Acceptation
- [ ] Tous les hooks créés et testés
- [ ] Coverage > 80%
- [ ] Latency p95 < 500ms (vs 3-5s)
- [ ] API calls -70%
- [ ] No console errors
- [ ] All tests passing

### 📅 Timeline
- **Semaine 1:** 1.1.1 → 1.1.3 (setup + 2 pages)
- **Semaine 1.5:** 1.1.4 → 1.1.7 (remaining)
- **Total:** 40 heures = 1 senior dev, 1 semaine

---

## 1.2 Test Coverage Expansion

### 🎯 Objectif
Augmenter couverture de 27% → 80% en testant les composants critiques.

### 📊 Impact
| Composant | Criticalité | État | Tests |
|-----------|-------------|------|-------|
| **ResultsChart** | 🔴 CRITICAL | None | NEW |
| **VotersTable** | 🔴 CRITICAL | None | NEW |
| **VotingPage** | 🔴 CRITICAL | None | NEW |
| **ElectionDetails** | 🟡 HIGH | None | NEW |
| **AddVotersModal** | 🟡 HIGH | ~20% | +80% |
| **QuorumIndicator** | 🟡 HIGH | None | NEW |
| **Pagination** | 🟢 MEDIUM | ~60% | +40% |

### 📋 Tâches

#### 1.2.1 ResultsChart Tests
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Fichier:** `src/test/ResultsChart.test.jsx`

**Tests à ajouter:**
```javascript
describe('ResultsChart', () => {
  it('renders bar chart correctly', () => {
    const results = {
      results: [
        { option: 'Oui', votes: 100 },
        { option: 'Non', votes: 50 }
      ]
    };
    render(<ResultsChart results={results} />);
    expect(screen.getByText('Oui')).toBeInTheDocument();
  });

  it('handles empty results', () => {
    render(<ResultsChart results={{ results: [] }} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('calculates percentages correctly', () => {
    // Verify 100/150 = 66.67%
    const results = {
      results: [
        { option: 'A', votes: 100 },
        { option: 'B', votes: 50 }
      ]
    };
    render(<ResultsChart results={results} />);
    expect(screen.getByText('66.67%')).toBeInTheDocument();
  });

  it('updates when results change', () => {
    const { rerender } = render(
      <ResultsChart results={{ results: [{ option: 'A', votes: 10 }] }} />
    );
    rerender(
      <ResultsChart results={{ results: [{ option: 'A', votes: 20 }] }} />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles weighted voting', () => {
    const results = {
      results: [
        { option: 'A', votes: 5, weight: 2 }, // 5 * 2 = 10
        { option: 'B', votes: 10, weight: 1 } // 10 * 1 = 10
      ]
    };
    render(<ResultsChart results={results} />);
    // Each should be 50%
    expect(screen.getByText('50.00%')).toBeInTheDocument();
  });
});
```

#### 1.2.2 VotersTable Tests
**Effort:** 10 heures
**Assigné à:** Senior Dev

**Fichier:** `src/test/VotersTable.test.jsx`

**Tests à ajouter:**
```javascript
describe('VotersTable', () => {
  // Pagination
  it('navigates between pages', async () => {
    render(<VotersTable electionId="123" />);
    const nextBtn = screen.getByRole('button', { name: /next/i });

    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(screen.getByText('Page 2')).toBeInTheDocument();
    });
  });

  // Search
  it('filters voters by search term', async () => {
    render(<VotersTable electionId="123" />);
    const searchInput = screen.getByPlaceholderText('Search');

    fireEvent.change(searchInput, { target: { value: 'john' } });
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
    });
  });

  // Sorting
  it('sorts by column', async () => {
    render(<VotersTable electionId="123" />);
    const emailHeader = screen.getByText('Email');

    fireEvent.click(emailHeader);
    await waitFor(() => {
      const emails = screen.getAllByTestId('voter-email');
      expect(emails[0]).toHaveTextContent('a@example.com');
    });
  });

  // Selection
  it('selects multiple voters', () => {
    render(<VotersTable electionId="123" />);
    const checkboxes = screen.getAllByRole('checkbox');

    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  // Bulk actions
  it('performs bulk delete', async () => {
    render(<VotersTable electionId="123" />);
    // Select voters
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    // Delete
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    // Confirm
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Deleted successfully')).toBeInTheDocument();
    });
  });

  // CSV Import
  it('imports voters from CSV', async () => {
    render(<VotersTable electionId="123" />);
    const uploadBtn = screen.getByRole('button', { name: /import/i });
    fireEvent.click(uploadBtn);

    const file = new File(['email,name\njohn@test.com,John'], 'voters.csv');
    const input = screen.getByType('file');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Imported 1 voter')).toBeInTheDocument();
    });
  });
});
```

#### 1.2.3 VotingPage Tests
**Effort:** 8 heures
**Assigné à:** Senior Dev

**Fichier:** `src/test/VotingPage.test.jsx`

**Tests à ajouter:**
```javascript
describe('VotingPage', () => {
  it('authenticates voter with token', async () => {
    render(<VotingPage token="voter-token-123" />);
    await waitFor(() => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
    });
  });

  it('renders voting options', () => {
    const election = {
      options: [
        { id: '1', text: 'Yes' },
        { id: '2', text: 'No' }
      ]
    };
    render(<VotingPage election={election} />);

    expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    expect(screen.getByLabelText('No')).toBeInTheDocument();
  });

  it('handles simple majority voting', async () => {
    render(<VotingPage type="simple" />);
    const yesRadio = screen.getByRole('radio', { name: 'Yes' });
    fireEvent.click(yesRadio);

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Vote submitted')).toBeInTheDocument();
    });
  });

  it('handles approval voting', async () => {
    render(<VotingPage type="approval" />);
    const checkboxes = screen.getAllByRole('checkbox');

    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Vote submitted')).toBeInTheDocument();
    });
  });

  it('prevents double voting', async () => {
    render(<VotingPage token="voted-token" />);
    await waitFor(() => {
      expect(screen.getByText('Already voted')).toBeInTheDocument();
    });
  });

  it('respects rate limiting', async () => {
    render(<VotingPage />);
    const submitBtn = screen.getByRole('button', { name: /submit/i });

    // Try to vote multiple times
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
    });
  });
});
```

#### 1.2.4 ElectionDetails Tests
**Effort:** 8 heures
**Assigné à:** Junior Dev

**Fichier:** `src/test/ElectionDetails.test.jsx`

**Tests à ajouter:**
```javascript
describe('ElectionDetails', () => {
  it('displays election info', () => {
    render(<ElectionDetails electionId="123" />);
    expect(screen.getByText('Test Election')).toBeInTheDocument();
  });

  it('allows editing election settings', async () => {
    render(<ElectionDetails electionId="123" />);
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);

    const titleInput = screen.getByDisplayValue('Test Election');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    });
  });

  it('shows active status during voting', () => {
    render(<ElectionDetails electionId="123" />);
    expect(screen.getByText('Status: Active')).toBeInTheDocument();
  });

  it('closes election when quorum met', async () => {
    render(<ElectionDetails electionId="123" />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.getByText('Status: Closed')).toBeInTheDocument();
    });
  });

  it('prevents closing without quorum', async () => {
    render(<ElectionDetails electionId="123" />);
    // No quorum met
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.getByText(/quorum not met/i)).toBeInTheDocument();
    });
  });
});
```

#### 1.2.5 QuorumIndicator Tests
**Effort:** 4 heures
**Assigné à:** Junior Dev

**Fichier:** `src/test/QuorumIndicator.test.jsx`

```javascript
describe('QuorumIndicator', () => {
  it('displays quorum progress', () => {
    render(<QuorumIndicator required={100} current={65} />);
    expect(screen.getByText('65/100 (65%)')).toBeInTheDocument();
  });

  it('shows green when met', () => {
    render(<QuorumIndicator required={100} current={100} />);
    const indicator = screen.getByTestId('quorum-bar');
    expect(indicator).toHaveClass('bg-green-500');
  });

  it('shows red when not met', () => {
    render(<QuorumIndicator required={100} current={50} />);
    const indicator = screen.getByTestId('quorum-bar');
    expect(indicator).toHaveClass('bg-red-500');
  });

  it('animates progress change', async () => {
    const { rerender } = render(
      <QuorumIndicator required={100} current={50} />
    );

    rerender(<QuorumIndicator required={100} current={75} />);

    await waitFor(() => {
      expect(screen.getByText('75/100 (75%)')).toBeInTheDocument();
    });
  });
});
```

#### 1.2.6 Pagination Tests
**Effort:** 4 heures
**Assigné à:** Junior Dev

**Fichier:** `src/test/PaginationControls.test.jsx`

### 📊 Coverage Report
**Avant:**
```
Statements   : 27% ( 150/550 )
Branches     : 18% ( 45/250 )
Functions    : 20% ( 30/150 )
Lines        : 28% ( 155/550 )
```

**Après:**
```
Statements   : 82% ( 450/550 )
Branches     : 78% ( 195/250 )
Functions    : 85% ( 127/150 )
Lines        : 83% ( 455/550 )
```

### 🎯 Critères d'Acceptation
- [ ] Tous les composants critiques testés
- [ ] Coverage: 80%+
- [ ] All tests passing
- [ ] No console warnings
- [ ] Test execution < 30 seconds

### 📅 Timeline
- **Semaine 2:** Tous les tests ajoutés et validés
- **Total:** 40 heures = 1 senior + 1 junior dev, 1 semaine

---

## 1.3 Accessibilité - ARIA Labels & Semantic HTML

### 🎯 Objectif
Atteindre WCAG 2.1 AA (95%) en ajoutant ARIA labels, roles et semantic HTML.

### 📊 Impact
| Métrique | Actuel | Cible | Gain |
|----------|--------|-------|------|
| **WCAG AA Score** | 60% | 95% | +35pp |
| **Screen Reader Compatibility** | ~40% | ~95% | +55pp |
| **Keyboard Navigation** | ~70% | ~100% | +30pp |
| **Color Contrast** | 80% | 100% | +20pp |

### 📋 Tâches

#### 1.3.1 Audit Accessibilité Complet
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Outils:**
- axe DevTools
- WAVE
- Lighthouse
- Manual testing

**Rapport:** Document ACCESSIBILITY_AUDIT.md listant:
- [ ] 200+ issues trouvées
- [ ] Groupées par sévérité
- [ ] Avec recommandations

#### 1.3.2 Navigation au Clavier
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Implémentation:**
```javascript
// Ajouter tabIndex et focus management
<button
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Delete
</button>

// Modal focus trap
<div role="dialog" aria-modal="true">
  <FocusTrap> {/* First focusable gets focus */}
    {/* Content */}
  </FocusTrap>
</div>
```

**Tests:**
- [ ] Tab through entire app
- [ ] No focus traps
- [ ] Focus visible outline

#### 1.3.3 ARIA Labels sur Icônes
**Effort:** 8 heures
**Assigné à:** Junior Dev

**Pattern:**
```javascript
// Avant
<button onClick={handleDelete}>
  <TrashIcon />
</button>

// Après
<button
  onClick={handleDelete}
  aria-label="Delete voter"
  title="Delete voter"
  className="focus:outline-2 focus:outline-offset-2 focus:outline-blue-500"
>
  <TrashIcon aria-hidden="true" />
</button>
```

**Fichiers à modifier:**
- [ ] VotersTable.jsx
- [ ] ElectionDetails.jsx
- [ ] Results.jsx
- [ ] Dashboard.jsx
- [ ] NotificationCenter.jsx
- [ ] All action buttons

#### 1.3.4 Semantic HTML
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Changements:**
```javascript
// Avant: <div> soup
<div className="header">
  <div className="title">Elections</div>
  <div className="nav">
    <div>Dashboard</div>
    <div>Results</div>
  </div>
</div>

// Après: Semantic
<header>
  <h1>Elections</h1>
  <nav>
    <a href="/dashboard">Dashboard</a>
    <a href="/results">Results</a>
  </nav>
</header>
```

**Éléments à utiliser:**
- `<header>`, `<nav>`, `<main>`, `<footer>`
- `<section>`, `<article>`, `<aside>`
- `<h1>` → `<h6>` pour hiérarchie
- `<button>` vs `<div>` pour actions
- `<form>` avec `<label for="id">`

#### 1.3.5 Live Regions
**Effort:** 4 heures
**Assigné à:** Junior Dev

**Implémentation:**
```javascript
// Notifications
<div aria-live="polite" role="status">
  {notification.message}
</div>

// Results updates
<div aria-live="assertive" role="alert">
  Vote count updated: {votes}
</div>

// Loading states
<div aria-busy={isLoading} aria-label="Loading elections...">
  {isLoading ? <Spinner /> : <Content />}
</div>
```

#### 1.3.6 Color Contrast
**Effort:** 4 heures
**Assigné à:** Junior Dev

**Audit et fixes CSS:**
```css
/* Avant: #666 text on #f5f5f5 = 4.5:1 ratio (FAIL) */
/* Après: #333 text on #f5f5f5 = 12.6:1 ratio (PASS AAA) */

.card-text {
  color: #333333;  /* 4.5:1 minimum WCAG AA, 7:1 AAA */
  background: #f5f5f5;
}

/* Focus states pour tous les interactions */
button:focus {
  outline: 2px solid #0b57d0;
  outline-offset: 2px;
}
```

#### 1.3.7 Form Accessibility
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Implémentation:**
```javascript
// Avant
<input type="email" placeholder="Email" />

// Après
<label htmlFor="email">Email address</label>
<input
  id="email"
  type="email"
  placeholder="user@example.com"
  aria-label="Email address"
  aria-describedby="email-hint"
  required
/>
<div id="email-hint">
  We'll never share your email
</div>
```

**Fichiers à modifier:**
- [ ] Login.jsx
- [ ] Register.jsx
- [ ] CreateElection.jsx
- [ ] All form components

#### 1.3.8 Testing Accessibility
**Effort:** 6 heures
**Assigné à:** Junior Dev

**Fichier:** `src/test/accessibility.test.js`

```javascript
import { axe } from 'jest-axe';

describe('Accessibility', () => {
  it('Dashboard passes axe checks', async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('VotingPage is keyboard navigable', () => {
    render(<VotingPage />);

    const button = screen.getByRole('button');
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('form inputs have labels', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
```

### 🎯 Critères d'Acceptation
- [ ] WCAG 2.1 AA score 95%+
- [ ] All images have alt text
- [ ] All buttons have aria-label
- [ ] Keyboard navigation works
- [ ] Color contrast 4.5:1+
- [ ] All tests passing
- [ ] Manual screen reader test

### 📅 Timeline
- **Semaine 2-3:** Audit + implémentation
- **Total:** 46 heures = 1 junior dev, ~1.2 semaines

---

## 📊 Phase 1 - Résumé

| Tâche | Effort | Dev | Timeline |
|-------|--------|-----|----------|
| **1.1 React Query** | 40h | 1 Senior | Semaine 1 |
| **1.2 Tests** | 40h | 1 Senior + Junior | Semaine 2 |
| **1.3 Accessibilité** | 46h | 1 Junior | Semaine 2-3 |
| **TOTAL PHASE 1** | **126h** | **1-2 devs** | **2-3 semaines** |

### Livrables Phase 1
- ✅ React Query infrastructure complète
- ✅ Hooks pour elections/voters/results/mutations
- ✅ Test coverage 80%+
- ✅ WCAG 2.1 AA 95%+
- ✅ Documentation React Query
- ✅ Accessibility audit report

### Dépendances
- Aucune pour Phase 1
- Phase 2 dépend de Phase 1 complète

---

## 🟠 PHASE 2 - IMPORTANT (2-4 semaines)

### Objectif
Améliorations significatives pour architecture et maintenance long-terme.

---

## 2.1 TypeScript Migration

### 🎯 Objectif
Migrer progressivement vers TypeScript pour type-safety complète.

### 📊 Impact
| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **Type Errors** | ~5/sprint | ~0/sprint | 100% ↓ |
| **Refactoring Time** | 4h | 1h | 75% ↓ |
| **IDE Autocomplete** | 60% | 100% | +40% |
| **Documentation** | Manual | Auto-generated | +infinity |
| **Bug Prevention** | ~3/sprint | ~1/sprint | 67% ↓ |

### 📋 Tâches

#### 2.1.1 TypeScript Setup & Config
**Effort:** 4 heures
**Assigné à:** Senior Dev

**Livrables:**
- [ ] `tsconfig.json` configuration
- [ ] Type definition files setup
- [ ] Build pipeline integration (Vite)
- [ ] IDE setup (ESLint + TypeScript)
- [ ] Pre-commit hooks for type checking

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

#### 2.1.2 Core Types Definition
**Effort:** 8 heures
**Assigné à:** Senior Dev

**Créer:** `src/types/index.ts`

```typescript
// types/election.ts
export interface Election {
  id: string;
  title: string;
  description: string;
  type: 'simple' | 'approval' | 'preference' | 'list';
  status: 'draft' | 'active' | 'closed' | 'archived';
  votingType: 'secret' | 'public' | 'hybrid';
  isSecret: boolean;
  isWeighted: boolean;
  allowAnonymity: boolean;
  maxVoters: number;
  quorumType: 'none' | 'percentage' | 'absolute' | 'weighted';
  quorumValue?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  settings: ElectionSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Voter {
  id: string;
  electionId: string;
  email: string;
  name: string;
  weight: number;
  token: string;
  qrCode?: string;
  hasVoted: boolean;
  votedAt?: Date;
  createdAt: Date;
}

export interface Vote {
  id: string;
  electionId: string;
  voterToken: string;
  encrypted: string;
  ballotHash: string;
  castAt: Date;
}

export interface Result {
  electionId: string;
  option: string;
  votes: number;
  percentage: number;
  weight?: number;
  weightedTotal?: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Hook types
export interface UseQueryOptions {
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
  retry?: number | boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}
```

#### 2.1.3 Migrate Core Utilities
**Effort:** 12 heures
**Assigné à:** Senior Dev

**Fichiers à migrer (priorité):**
- [ ] src/utils/api.ts
- [ ] src/utils/errorHandler.ts
- [ ] src/utils/validators.ts
- [ ] src/config/errorHandler.ts
- [ ] src/contexts/NotificationContext.tsx

**Exemple:**
```typescript
// Before: src/utils/api.js
export const api = axios.create({...});

// After: src/utils/api.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

#### 2.1.4 Migrate Hooks
**Effort:** 16 heures
**Assigné à:** Senior Dev + Junior Dev

**Fichiers à migrer:**
- [ ] src/hooks/useAuth.ts
- [ ] src/hooks/useCsrfToken.ts
- [ ] src/hooks/useElections.ts (from React Query)
- [ ] src/hooks/useVoters.ts
- [ ] src/hooks/useResults.ts
- [ ] src/hooks/useMutations.ts

```typescript
// Before: src/hooks/useAuth.js
export function useAuth() {
  // ...
}

// After: src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { AuthContextType, User } from '../types';

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // Fetch user
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // Implementation
  };

  return {
    user,
    token,
    loading,
    login,
    logout: () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    },
    isAdmin: user?.role === 'admin' ?? false,
  };
}
```

#### 2.1.5 Migrate Components (High Priority)
**Effort:** 20 heures
**Assigné à:** Senior Dev + Junior Dev

**Fichiers à migrer (priority order):**
1. [ ] src/components/ResultsChart.tsx
2. [ ] src/components/VotersTable.tsx
3. [ ] src/components/VotingPage.tsx
4. [ ] src/components/ElectionDetails.tsx
5. [ ] src/pages/Dashboard.tsx
6. [ ] src/pages/Results.tsx

**Pattern:**
```typescript
// Before: ResultsChart.jsx
export function ResultsChart({ results }) {
  return ...
}

// After: ResultsChart.tsx
interface ResultsChartProps {
  results: Result[];
  electionId: string;
  onExport?: (format: 'pdf' | 'csv') => void;
}

export function ResultsChart({
  results,
  electionId,
  onExport
}: ResultsChartProps): JSX.Element {
  // ...
}
```

#### 2.1.6 Update Test Files
**Effort:** 12 heures
**Assigné à:** Junior Dev

**Convertir tests en TypeScript:**
```typescript
// Before: ResultsChart.test.jsx
describe('ResultsChart', () => {
  it('renders', () => {...});
});

// After: ResultsChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsChart } from './ResultsChart';
import type { Result } from '../types';

describe('ResultsChart', () => {
  it('renders bar chart correctly', () => {
    const results: Result[] = [
      { option: 'Yes', votes: 100, percentage: 66.67 },
      { option: 'No', votes: 50, percentage: 33.33 }
    ];
    render(<ResultsChart results={results} electionId="test" />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });
});
```

#### 2.1.7 Server TypeScript Migration
**Effort:** 24 heures
**Assigné à:** Senior Dev

**Fichiers à migrer:**
- [ ] server/index.ts
- [ ] server/routes/*.ts
- [ ] server/services/*.ts
- [ ] server/middleware/*.ts
- [ ] server/database/db.ts

```typescript
// Before: server/routes/elections.js
router.get('/', (req, res) => {...});

// After: server/routes/elections.ts
import { Router, Request, Response } from 'express';
import { Election, ApiResponse } from '../types';

const router = Router();

router.get('/', async (req: Request, res: Response<ApiResponse<Election[]>>) => {
  // Implementation with types
});

export default router;
```

#### 2.1.8 CI/CD Integration
**Effort:** 4 heures
**Assigné à:** Senior Dev

**Livrables:**
- [ ] Pre-commit hook for `tsc --noEmit`
- [ ] GitHub Actions: Run type checking
- [ ] Build step includes type checking
- [ ] Documentation for developers

### 🎯 Critères d'Acceptation
- [ ] All TypeScript compiled without errors
- [ ] No `any` types (strict mode)
- [ ] 100% of core files migrated
- [ ] All tests passing
- [ ] Build succeeds
- [ ] Type coverage > 90%

### 📅 Timeline
- **Semaine 3-4:** Setup + utilities + hooks
- **Semaine 5:** Components + server
- **Total:** 100 heures = 1 senior + 1 junior, 2.5 semaines

---

## 2.2 Swagger/OpenAPI Documentation

### 🎯 Objectif
Générer documentation API interactive complète avec Swagger UI.

### 📊 Impact
| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **API Discovery** | Manual | Interactive UI | ∞ |
| **Integration Time** | 3h | 30min | 83% ↓ |
| **Documentation Accuracy** | ~70% | 100% | +30pp |
| **Testing Endpoints** | Terminal | UI | ∞ |

### 📋 Tâches

#### 2.2.1 Swagger Setup
**Effort:** 4 heures
**Assigné à:** Senior Dev

```bash
npm install swagger-ui-express swagger-jsdoc
```

**Fichier:** `server/swagger.js`
```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Voting API',
      version: '2.1.0',
      description: 'Complete E-Voting Election Management API'
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.example.com', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        CsrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token'
        }
      },
      schemas: {
        Election: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { enum: ['draft', 'active', 'closed'] },
            votingType: { enum: ['secret', 'public', 'hybrid'] }
          }
        },
        Voter: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            hasVoted: { type: 'boolean' }
          }
        }
      }
    }
  },
  apis: ['./server/routes/**/*.js']
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

#### 2.2.2 Document All Routes
**Effort:** 16 heures
**Assigné à:** Senior Dev + Junior Dev

**Exemple pattern:**
```javascript
/**
 * @swagger
 * /api/elections:
 *   get:
 *     summary: List all elections
 *     description: Retrieve paginated list of elections with optional filtering
 *     tags:
 *       - Elections
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-indexed)
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Items per page
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [draft, active, closed]
 *         description: Filter by status
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           default: created_at
 *         description: Sort field
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Election'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests (rate limited)
 *   post:
 *     summary: Create election
 *     tags:
 *       - Elections
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, votingType]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [simple, approval, preference, list]
 *               votingType:
 *                 type: string
 *                 enum: [secret, public, hybrid]
 *     responses:
 *       201:
 *         description: Election created
 *       400:
 *         description: Invalid request
 */
```

### 📅 Timeline
- **Semaine 4:** Setup + documentation
- **Total:** 20 heures = 1 senior + 1 junior, 0.5 semaine

---

## 2.3 State Management Centralization

### 🎯 Objectif
Centraliser l'état global avec Zustand pour meilleure scalabilité.

### 📊 Impact
| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| **Prop Drilling** | High | None | 100% ↓ |
| **State Predictability** | Medium | High | +40% |
| **Dev Tools** | None | Redux DevTools | ✅ |

### 📋 Tâches

#### 2.3.1 Zustand Setup
**Effort:** 6 heures
**Assigné à:** Senior Dev

```bash
npm install zustand
```

**Fichier:** `src/store/electionStore.ts`
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ElectionStore {
  elections: Election[];
  selectedElection: Election | null;
  filters: {
    status: string;
    search: string;
  };

  // Actions
  setElections: (elections: Election[]) => void;
  selectElection: (election: Election) => void;
  setFilters: (filters: Partial<ElectionStore['filters']>) => void;
}

export const useElectionStore = create<ElectionStore>()(
  devtools(
    persist(
      (set) => ({
        elections: [],
        selectedElection: null,
        filters: { status: '', search: '' },

        setElections: (elections) => set({ elections }),
        selectElection: (election) => set({ selectedElection: election }),
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters }
          })),
      }),
      {
        name: 'election-storage',
      }
    )
  )
);
```

#### 2.3.2 Migrate Context to Zustand
**Effort:** 8 heures
**Assigné à:** Senior Dev

**Remplacer NotificationContext avec store Zustand**

#### 2.3.3 Usage in Components
**Effort:** 8 heures
**Assigné à:** Junior Dev

```typescript
// Before: Prop drilling
<Dashboard elections={elections} onSelect={setSelected} />

// After: Direct store access
function Dashboard() {
  const elections = useElectionStore((s) => s.elections);
  const selectElection = useElectionStore((s) => s.selectElection);
  // ...
}
```

### 📅 Timeline
- **Semaine 4-5:** Setup + migration
- **Total:** 22 heures = 1 senior + 1 junior, 0.5 semaine

---

## 📊 Phase 2 - Résumé

| Tâche | Effort | Dev | Timeline |
|-------|--------|-----|----------|
| **2.1 TypeScript** | 100h | 1 Senior + Junior | 2.5 semaines |
| **2.2 Swagger** | 20h | 1 Senior + Junior | 0.5 semaine |
| **2.3 Zustand** | 22h | 1 Senior + Junior | 0.5 semaine |
| **TOTAL PHASE 2** | **142h** | **1-2 devs** | **3.5 semaines** |

---

## 🟡 PHASE 3 - UTILE (1 mois)

### Objectif
Améliorations de polishing et optimisations supplémentaires.

---

## 3.1 Error Boundaries par Page
**Effort:** 8 heures
**Assigné à:** Junior Dev

## 3.2 Performance Monitoring
**Effort:** 16 heures
**Assigné à:** Senior Dev

## 3.3 Lazy Loading Images
**Effort:** 6 heures
**Assigné à:** Junior Dev

## 3.4 Tailwind CSS Migration
**Effort:** 20 heures
**Assigné à:** 2 Junior Devs

## 3.5 Database Query Monitoring
**Effort:** 12 heures
**Assigné à:** Senior Dev

---

## 📊 MATRICES DE DÉPENDANCES

### Graphe de Dépendances
```
Phase 1:
├── 1.1 React Query ✓ (no deps)
├── 1.2 Tests → depends on 1.1 ✓
├── 1.3 Accessibility → independent ✓

Phase 2:
├── 2.1 TypeScript → depends on Phase 1 ✓
├── 2.2 Swagger → independent of 2.1
├── 2.3 Zustand → depends on 2.1 for types

Phase 3:
├── 3.1 Error Boundaries → depends on 2.1
├── 3.2 Performance → independent
├── 3.3 Lazy Loading → independent
├── 3.4 Tailwind → can run parallel with 2.1
├── 3.5 DB Monitoring → independent
```

### Ordre d'Exécution Recommandé
```
Week 1-2:  1.1 (React Query) + 1.3 (Accessibility)
Week 2-3:  1.2 (Tests)
Week 3-4:  2.1 (TypeScript - setup phase)
Week 4-5:  2.1 (TypeScript - migration) + 2.2 (Swagger)
Week 5-6:  2.3 (Zustand) + 3.4 (Tailwind)
Week 6-8:  Phase 3 (remaining improvements)
```

---

## 📊 MÉTRIQUES DE SUCCÈS

### 1. Performance Metrics

| Métrique | Seuil | Baseline | Cible |
|----------|-------|----------|-------|
| **First Contentful Paint** | p95 | 2.5s | <1.5s |
| **Largest Contentful Paint** | p95 | 4.2s | <2.5s |
| **Time to Interactive** | p95 | 5.1s | <2s |
| **API Latency** | p95 | 3-5s | <500ms |
| **Cache Hit Rate** | minimum | 10% | 70%+ |

### 2. Quality Metrics

| Métrique | Seuil | Baseline | Cible |
|----------|-------|----------|-------|
| **Test Coverage** | minimum | 27% | 80%+ |
| **Type Coverage** | minimum | 0% | 90%+ |
| **Accessibility Score** | WCAG AA | 60% | 95%+ |
| **Bundle Size** | maximum | 450KB | 350KB |
| **Lighthouse Score** | minimum | 72 | 90+ |

### 3. Reliability Metrics

| Métrique | Seuil | Baseline | Cible |
|----------|-------|----------|-------|
| **Runtime Errors** | per sprint | ~5 | <1 |
| **Type Errors** | per sprint | ~3 | 0 |
| **Test Failures** | percentage | 0% | 0% |
| **Regression Rate** | per sprint | ~3 | <1 |

### 4. Developer Experience

| Métrique | Seuil | Baseline | Cible |
|----------|-------|----------|-------|
| **IDE Autocomplete** | percentage | 60% | 100% |
| **Setup Time** | for new dev | 2h | <30min |
| **Build Time** | dev build | 3s | <1s |
| **Type Checking Time** | full check | - | <5s |

---

## 📅 ESTIMATIONS ET TIMELINE

### Scénario 1: 1 Senior Dev + 1 Junior Dev (RECOMMANDÉ)

```
Semaine 1-2:  Phase 1.1 (React Query)           → 40h
Semaine 2-3:  Phase 1.2 (Tests) + 1.3 (A11y)    → 86h
Semaine 3-4:  Phase 2.1 (TypeScript setup)      → 40h
Semaine 4-5:  Phase 2.1 (TypeScript migration)  → 60h
Semaine 5-6:  Phase 2.2 (Swagger) + 2.3 (Store) → 42h
Semaine 6-8:  Phase 3 (Polish + Optimization)   → 62h

Total: 12 semaines = 3 mois
Coût: ~60,000 EUR (1500 EUR/jour * 40 jours)
```

### Scénario 2: 3 Developers (ACCÉLÉRÉ)

```
Semaine 1:   Phase 1.1 + 1.3 parallel          → Done
Semaine 2:   Phase 1.2 (Tests)                  → Done
Semaine 3:   Phase 2.1 (TypeScript) + 2.2      → Done
Semaine 4:   Phase 2.3 + 3.x (Parallel)        → Done

Total: 4 semaines = 1 mois
Coût: ~48,000 EUR (1500 EUR/jour * 32 jours)
```

### Scénario 3: Minimal (1 Dev Only)

```
Semaine 1-4:   Phase 1 (Essentials)             → 126h
Semaine 5-10:  Phase 2 (Core Improvements)      → 142h
Semaine 10-16: Phase 3 (Polish)                 → 62h

Total: 16 semaines = 4 mois
Coût: ~48,000 EUR (1500 EUR/jour * 32 jours)
```

### Recommandation
**Scénario 1:** 1 Senior + 1 Junior, 12 semaines
- Équilibre coût/timing
- Assure qualité (SR supervise)
- Flexible sur priorités

---

## 🚨 RISQUES ET MITIGATION

### Risque 1: React Query Learning Curve
**Sévérité:** 🟡 MEDIUM
**Probabilité:** 70%
**Impact:** -5 jours

**Mitigation:**
- [ ] Workshop initial (4h) pour équipe
- [ ] Pair programming premium
- [ ] Documentation interne complète
- [ ] Exemple working chemin critique

---

### Risque 2: TypeScript Migration Complexity
**Sévérité:** 🔴 HIGH
**Probabilité:** 50%
**Impact:** -10 jours

**Mitigation:**
- [ ] Migrate progressivement (files critiques d'abord)
- [ ] Keep .js files pendant transition
- [ ] `skipLibCheck: true` initialement
- [ ] Allow `any` types pour legacy code
- [ ] Strict mode graduellement

---

### Risque 3: Test Fragility
**Sévérité:** 🟡 MEDIUM
**Probabilité:** 40%
**Impact:** -5 jours

**Mitigation:**
- [ ] Mock API responses (msw - Mock Service Worker)
- [ ] Test stable DOM selectors
- [ ] User-centric tests (not implementation)
- [ ] Avoid snapshot tests (brittle)

---

### Risque 4: Performance Regression
**Sévérité:** 🔴 HIGH
**Probabilité:** 30%
**Impact:** -7 jours

**Mitigation:**
- [ ] Baseline Lighthouse scores
- [ ] Bundle analysis tool
- [ ] Performance budget in CI
- [ ] Lighthouse CI integration

---

### Risque 5: Database Migration Issues
**Sévérité:** 🟡 MEDIUM
**Probabilité:** 20%
**Impact:** -3 jours

**Mitigation:**
- [ ] Schema versioning
- [ ] Backward compatibility
- [ ] Dry-run migrations
- [ ] Rollback procedure

---

### Risque 6: Breaking Changes
**Sévérité:** 🟡 MEDIUM
**Probabilité:** 40%
**Impact:** -4 jours

**Mitigation:**
- [ ] Feature flags for new code
- [ ] Gradual rollout
- [ ] Monitoring + quick rollback
- [ ] User communication

---

## 📋 PLAN D'ACTION DÉTAILLÉ

### Semaine 1

**Monday:**
- [ ] Team meeting: review roadmap
- [ ] Setup environment (branches, configs)
- [ ] Create tickets in project management tool
- [ ] Dev: React Query setup (4h)
- [ ] Dev: TypeScript tsconfig (2h)

**Tuesday-Wednesday:**
- [ ] Dev: useElections hook (6h)
- [ ] Dev: useVoters hook (6h)
- [ ] Code review + iteration

**Thursday-Friday:**
- [ ] Dev: useResults hook (4h)
- [ ] Dev: Mutations setup (6h)
- [ ] Testing + documentation

**End of Week 1 Deliverables:**
- ✅ React Query fully functional
- ✅ 3 critical hooks implemented
- ✅ Documentation started

---

### Semaine 2

**Monday-Wednesday:**
- [ ] Dev: Test suite expansion (ResultsChart, VotersTable)
- [ ] Dev: Accessibility audit (ARIA labels)

**Thursday-Friday:**
- [ ] Dev: Accessibility implementation
- [ ] Code review + fixes

**End of Week 2 Deliverables:**
- ✅ 80%+ test coverage
- ✅ WCAG AA 95%+ score
- ✅ All tests passing

---

## 📞 COMMUNICATION PLAN

### Stakeholders
- [ ] Product Owner (bi-weekly sync)
- [ ] QA Team (for regression testing)
- [ ] DevOps (for deployment)
- [ ] End Users (changelog updates)

### Weekly Updates
```markdown
## Week X Update

### Completed
- ✅ Task 1
- ✅ Task 2

### In Progress
- 🔄 Task 3
- 🔄 Task 4

### Blockers
- 🚫 None

### Next Week
- Task 5
- Task 6

### Metrics
- Performance: X% improvement
- Test Coverage: XX%
- Type Coverage: XX%
```

---

## ✅ DÉFINITION DE DONE

Une tâche est considérée DONE quand:

1. **Code:**
   - [ ] Code écrit et revu
   - [ ] All edge cases handled
   - [ ] No console errors/warnings
   - [ ] Follows code style guide

2. **Testing:**
   - [ ] Unit tests passing
   - [ ] Integration tests passing
   - [ ] Manual QA passed
   - [ ] No regressions

3. **Documentation:**
   - [ ] Code comments for complex logic
   - [ ] README/docs updated
   - [ ] Changelog entry added

4. **Performance:**
   - [ ] No performance regression
   - [ ] Lighthouse score maintained
   - [ ] Bundle size check passed

5. **Deployment:**
   - [ ] Staging deployment successful
   - [ ] QA signoff received
   - [ ] Changelog reviewed

---

## 📊 RAPPORT DE STATUT TEMPLATE

À inclure dans chaque mise à jour:

```markdown
# Status Report - Week X

## Overall Progress
- Phase 1: 60% (target 100% by week Y)
- Phase 2: 0% (starting week Y)

## Key Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test Coverage | 80% | 65% | 🟡 |
| Type Coverage | 90% | 0% | 🔴 |
| Accessibility | 95% | 80% | 🟡 |

## Risks
1. Learning curve on React Query - mitigated with workshop

## Next Steps
1. Complete remaining test files
2. Begin TypeScript migration

## Blockers
None

## Approvals Needed
- Review of Swagger documentation
```

---

## 🎓 TRAINING PLAN

### Week 0 - Pre-Implementation
**React Query Workshop (4 heures)**
- How caching works
- Query keys
- Mutations
- Devtools

**TypeScript Basics (3 heures)**
- Types fundamentals
- Interfaces vs Types
- Generics
- Testing with types

### Week 1 - Onboarding
- Pair programming on first hook
- Code review intensive
- Debugging session

### Ongoing
- Daily standups (15min)
- Weekly retrospective
- Monthly knowledge share

---

## 💰 BUDGET DÉTAILLÉ

### Ressources Humaines
```
Phase 1 (2-3 weeks):
- 1 Senior Dev: 80h @ 75 EUR/h = 6,000 EUR
- 1 Junior Dev: 46h @ 40 EUR/h = 1,840 EUR

Phase 2 (3.5 weeks):
- 1 Senior Dev: 100h @ 75 EUR/h = 7,500 EUR
- 1 Junior Dev: 42h @ 40 EUR/h = 1,680 EUR

Phase 3 (2 weeks):
- 1 Senior Dev: 20h @ 75 EUR/h = 1,500 EUR
- 1 Junior Dev: 42h @ 40 EUR/h = 1,680 EUR

TOTAL RH: 20,200 EUR
```

### Outils & Services
```
- Sentry subscription: 29 EUR/month
- Datadog (monitoring): 15 EUR/month
- GitHub Actions (CI/CD): Free

TOTAL TOOLS: ~50 EUR/month
```

### Contingency (15%)
```
20,200 * 0.15 = 3,030 EUR
```

### BUDGET TOTAL
```
20,200 + 600 + 3,030 = 23,830 EUR
```

**Note:** Basé sur rates approximatives. À ajuster selon votre région.

---

## 🎯 SUCCESS CRITERIA - FINAL

### Application After Improvements
```
Metrics Scorecard:

Architecture:        9/10 ✅
Security:          10/10 ✅
Performance:        9/10 ⬆️ (from 7)
Testing:            9/10 ⬆️ (from 6)
Type Safety:        9/10 ⬆️ (from 0)
Accessibility:      9/10 ⬆️ (from 7)
Maintainability:    9/10 ✅
Documentation:      9/10 ⬆️ (from 6)
UX/Design:          8/10 ✅

OVERALL: 9.0/10 ⬆️ (from 7.6)
```

### What Success Looks Like
- ✅ Development velocity +50%
- ✅ Bugs in production -70%
- ✅ New feature delivery -40%
- ✅ Developer satisfaction +60%
- ✅ Performance p95: 500ms (was 3-5s)
- ✅ Type errors: 0/sprint (was 5)
- ✅ Test coverage: 80%+ (was 27%)

---

## 📞 CONTACTS & ESCALATION

### Project Management
- **PM:** [Name] - [email]
- **Meetings:** Every Friday 10:00-11:00

### Technical Leadership
- **Tech Lead:** [Name] - [email]
- **Escalation:** Daily standup or #dev-urgent

### Stakeholders
- **Product Owner:** [Name]
- **Marketing:** [Name]

---

## 📚 DOCUMENTATION

**Créer ces documents:**
- [ ] `docs/REACT_QUERY_GUIDE.md` - Usage guide
- [ ] `docs/TYPESCRIPT_GUIDE.md` - Conventions
- [ ] `docs/SWAGGER_API.md` - How to add endpoints
- [ ] `docs/TESTING_GUIDE.md` - Best practices
- [ ] `docs/ACCESSIBILITY_GUIDE.md` - WCAG checklist

---

**Document créé:** Novembre 2024
**Version:** 1.0
**Statut:** Ready for Implementation ✅

Pour démarrer, voir la **Phase 1 - Semaine 1** ci-dessus.
