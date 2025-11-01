# Guide de Test - Lazy Loading

## 🧪 Tests à Effectuer

### 1. Test de Build

```bash
# Nettoyer et builder
npm run build

# Vérifier les chunks générés
ls -lh dist/assets/

# Résultat attendu:
# - vendor-react-[hash].js (~120 KB)
# - vendor-ui-[hash].js (~30 KB)
# - index-[hash].js (~30 KB)
# - Login-[hash].js (~15 KB)
# - Dashboard-[hash].js (~20 KB)
# etc.
```

### 2. Test de Performance (DevTools)

1. Ouvrir Chrome DevTools (F12)
2. Onglet **Network**
3. Cocher "Disable cache"
4. Rafraîchir la page (Ctrl+R)

**Vérifications**:
- ✅ Seulement 3-4 fichiers JS chargés initialement (~165 KB total)
- ✅ Login.jsx chargé uniquement
- ✅ Dashboard.jsx PAS chargé
- ✅ Autres pages PAS chargées

5. Naviguer vers Dashboard
6. **Vérifier**:
   - ✅ Dashboard-[hash].js chargé (~20 KB)
   - ✅ Chargement < 200ms

### 3. Test de Suspense

1. Throttle réseau: "Slow 3G" dans DevTools
2. Naviguer entre pages
3. **Vérifier**:
   - ✅ PageLoader s'affiche avec spinner
   - ✅ Transition fluide vers la page
   - ✅ Pas d'erreur console

### 4. Test des Modales

1. Ouvrir ElectionDetails
2. **Avant** de cliquer "Ajouter électeurs":
   - ✅ AddVotersModal-[hash].js PAS chargé
3. **Après** clic:
   - ✅ AddVotersModal-[hash].js chargé (~10 KB)
   - ✅ Modale s'affiche

### 5. Test Cache

1. Visiter la page une première fois
2. Fermer et rouvrir le navigateur
3. Visiter à nouveau
4. **Vérifier** (Network tab):
   - ✅ vendor-react-[hash].js: "(disk cache)" ou "304 Not Modified"
   - ✅ Chargement instantané

### 6. Lighthouse Test

```bash
# Ou via Chrome DevTools > Lighthouse
1. Ouvrir en mode incognito
2. DevTools > Lighthouse
3. Cocher: Performance, Accessibility, Best Practices, SEO
4. Click "Analyze"
```

**Scores attendus**:
- Performance: 90-95/100 🟢
- Accessibility: 90+/100 🟢
- Best Practices: 90+/100 🟢
- SEO: 95+/100 🟢

### 7. Test Métriques Core Web Vitals

**Dans Chrome DevTools > Performance**:

1. Enregistrer 6 secondes de chargement
2. **Vérifier**:
   - ✅ LCP < 1.5s (cible: ~1.0s)
   - ✅ FCP < 1.0s (cible: ~0.8s)
   - ✅ CLS < 0.1 (cible: ~0.02)

### 8. Test Bundle Size

```bash
# Analyser la taille
npm run build

# Chercher les warnings
grep "chunk size" build-output.log
```

**Vérifications**:
- ✅ Aucun chunk > 500 KB
- ✅ Total dist/ < 800 KB

### 9. Test Production

```bash
# Prévisualiser le build
npm run preview

# Ouvrir http://localhost:4173
```

**Vérifier**:
- ✅ Pas de console.log dans la console
- ✅ Source maps disponibles (pour debugging)
- ✅ Toutes les pages fonctionnent

### 10. Test Mobile

1. DevTools > Device Toolbar (Ctrl+Shift+M)
2. Sélectionner "iPhone 12 Pro"
3. Throttle: "Fast 3G"

**Vérifier**:
- ✅ Chargement < 3s
- ✅ PageLoader responsive
- ✅ Pas de layout shift

---

## 📊 Résultats Attendus

### Before vs After

```
┌─────────────────┬──────────┬──────────┬────────────┐
│ Métrique        │ Avant    │ Après    │ Gain       │
├─────────────────┼──────────┼──────────┼────────────┤
│ Bundle Initial  │ 250 KB   │ 90 KB    │ -64%       │
│ Temps Load      │ 2.5s     │ 1.0s     │ -60%       │
│ LCP             │ 2.2s     │ 1.0s     │ -55%       │
│ FCP             │ 1.8s     │ 0.8s     │ -56%       │
│ TTI             │ 3.2s     │ 1.4s     │ -56%       │
└─────────────────┴──────────┴──────────┴────────────┘
```

---

## 🐛 Problèmes Courants

### Erreur: "Suspense boundary not found"

**Solution**: Vérifier que `<Suspense>` entoure les composants lazy

### Erreur: "Cannot read property of undefined"

**Solution**: Vérifier les imports/exports des composants lazy

### Warning: "Chunk size exceeded"

**Solution**: Diviser le chunk en plusieurs plus petits dans vite.config.js

### Performance pas améliorée

**Solution**:
1. Vider le cache: DevTools > Network > "Disable cache"
2. Mode incognito pour test clean
3. Vérifier que le build est optimisé (`npm run build`)

---

## ✅ Checklist Complète

- [ ] Build réussi sans erreur
- [ ] Chunks vendor générés
- [ ] Bundle initial < 100 KB
- [ ] Pages lazy-loadées
- [ ] Modales lazy-loadées
- [ ] PageLoader s'affiche
- [ ] Pas d'erreur console
- [ ] Cache fonctionne
- [ ] Lighthouse > 90
- [ ] LCP < 1.5s
- [ ] Responsive mobile OK
- [ ] Production preview OK

---

**Si tous les tests passent: ✅ Lazy Loading opérationnel!**
