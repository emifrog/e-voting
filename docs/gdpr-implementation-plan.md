# Plan d'implémentation GDPR/RGPD - E-Voting Platform

**Date**: 10 novembre 2025
**Version**: 1.0
**Sprint**: 9
**Statut**: 📋 Planification

---

## 📋 Table des matières

1. [Contexte légal](#contexte-légal)
2. [Analyse des données](#analyse-des-données)
3. [Exigences RGPD](#exigences-rgpd)
4. [Architecture solution](#architecture-solution)
5. [Plan d'implémentation](#plan-dimplémentation)
6. [Checklist conformité](#checklist-conformité)

---

## Contexte légal

### Réglementation applicable

**RGPD (Règlement Général sur la Protection des Données)**
- Règlement (UE) 2016/679
- Applicable depuis le 25 mai 2018
- **Sanctions** : Jusqu'à 20M€ ou 4% du CA mondial

### Obligations spécifiques au vote électronique

1. **Transparence** : Informer les votants du traitement de leurs données
2. **Minimisation** : Collecter uniquement les données nécessaires
3. **Limitation de conservation** : Définir des durées de rétention
4. **Sécurité** : Protéger les données personnelles
5. **Droits des personnes** : Accès, rectification, effacement, portabilité
6. **Accountability** : Documenter la conformité

---

## Analyse des données

### Données personnelles traitées

#### 1. Données des utilisateurs (Administrateurs)

**Table**: `users`

| Donnée | Type | Sensibilité | Base légale | Durée |
|--------|------|-------------|-------------|--------|
| `id` | UUID | Faible | Exécution contrat | Durée compte |
| `email` | Email | Moyenne | Exécution contrat | Durée compte |
| `password` | Hash | Haute | Exécution contrat | Durée compte |
| `name` | Texte | Moyenne | Exécution contrat | Durée compte |
| `role` | Enum | Faible | Exécution contrat | Durée compte |
| `two_factor_secret` | Secret | Haute | Sécurité | Durée 2FA |
| `two_factor_backup_codes` | Codes | Haute | Sécurité | Durée 2FA |
| `created_at` | Timestamp | Faible | Traçabilité | Durée compte |

**Finalité** : Gestion des comptes administrateurs et authentification

#### 2. Données des électeurs

**Table**: `voters`

| Donnée | Type | Sensibilité | Base légale | Durée |
|--------|------|-------------|-------------|--------|
| `id` | UUID | Faible | Mission légale | Élection + 1 an |
| `election_id` | UUID | Faible | Mission légale | Élection + 1 an |
| `email` | Email | Moyenne | Mission légale | Élection + 1 an |
| `name` | Texte | Moyenne | Mission légale | Élection + 1 an |
| `unique_code` | UUID | Haute | Sécurité vote | Élection + 1 an |
| `has_voted` | Booléen | **SENSIBLE** | Transparence | Élection + 1 an |
| `voted_at` | Timestamp | **SENSIBLE** | Traçabilité | Élection + 1 an |
| `weight` | Nombre | Faible | Fonctionnel | Élection + 1 an |
| `metadata` | JSON | Variable | Contextuel | Élection + 1 an |

**Finalité** : Gestion des listes électorales et participation

⚠️ **Note critique** : `has_voted` et `voted_at` sont des données sensibles car elles peuvent être croisées avec les votes

#### 3. Données des votes

**Table**: `votes`

| Donnée | Type | Sensibilité | Base légale | Durée |
|--------|------|-------------|-------------|--------|
| `id` | UUID | Faible | Mission légale | Élection + 5 ans |
| `election_id` | UUID | Faible | Mission légale | Élection + 5 ans |
| `voter_id` | UUID | **CRITIQUE** | Sécurité | **Anonymiser après** |
| `option_id` | UUID | Haute | Mission légale | Élection + 5 ans |
| `vote_hash` | Hash | Haute | Intégrité | Élection + 5 ans |
| `blockchain_tx` | Hash | Moyenne | Traçabilité | Permanent |
| `voted_at` | Timestamp | Moyenne | Horodatage | Élection + 5 ans |

**Finalité** : Enregistrement des votes et vérification

⚠️ **CRITIQUE** : Le lien `voter_id` doit être anonymisé après clôture pour garantir le secret du vote

#### 4. Données des observateurs

**Table**: `observers`

| Donnée | Type | Sensibilité | Base légale | Durée |
|--------|------|-------------|-------------|--------|
| `id` | UUID | Faible | Mission légale | Élection + 6 mois |
| `election_id` | UUID | Faible | Mission légale | Élection + 6 mois |
| `email` | Email | Moyenne | Mission légale | Élection + 6 mois |
| `name` | Texte | Moyenne | Mission légale | Élection + 6 mois |
| `access_token` | Token | Haute | Sécurité | Élection + 6 mois |

**Finalité** : Supervision des élections

#### 5. Logs d'audit

**Table**: `audit_logs`

| Donnée | Type | Sensibilité | Base légale | Durée |
|--------|------|-------------|-------------|--------|
| `id` | UUID | Faible | Accountability | 5 ans |
| `election_id` | UUID | Faible | Traçabilité | 5 ans |
| `user_id` | UUID | Moyenne | Traçabilité | 5 ans |
| `action` | Texte | Moyenne | Accountability | 5 ans |
| `details` | JSON | Variable | Détails | 5 ans |
| `ip_address` | IP | Moyenne | Sécurité | 5 ans |
| `user_agent` | Texte | Faible | Contexte | 5 ans |
| `timestamp` | Timestamp | Faible | Horodatage | 5 ans |

**Finalité** : Traçabilité et accountability RGPD

### Flux de données

```
┌─────────────┐
│ Création    │ → Données personnelles collectées
│ Utilisateur │    (email, nom, mot de passe)
└─────────────┘
      ↓
┌─────────────┐
│ Utilisation │ → Traitement des données
│ Service     │    (authentification, votes, audit)
└─────────────┘
      ↓
┌─────────────┐
│ Rétention   │ → Conservation selon durées légales
│ Données     │    (voir tableau durées ci-dessus)
└─────────────┘
      ↓
┌─────────────┐
│ Suppression │ → Effacement ou anonymisation
│ / Archivage │    (après durée de rétention)
└─────────────┘
```

---

## Exigences RGPD

### 1. Registre des activités de traitement (Art. 30)

**Obligation** : Documenter tous les traitements de données

**À implémenter** :
- Registre structuré des traitements
- Export PDF pour les auditeurs
- Mise à jour automatique

### 2. Politique de rétention des données (Art. 5.1.e)

**Obligation** : Limiter la conservation des données

**Durées proposées** :

| Type de donnée | Durée de conservation | Justification |
|----------------|----------------------|---------------|
| Comptes administrateurs | Durée du compte + 1 an | Gestion contractuelle |
| Électeurs | Fin élection + 1 an | Contentieux possible |
| Votes | Fin élection + 5 ans | Archive légale |
| Observateurs | Fin élection + 6 mois | Mission temporaire |
| Logs d'audit | 5 ans | Prescription |
| Données anonymisées | Permanent | Non personnelles |

### 3. Droits des personnes (Art. 15-22)

#### Droit d'accès (Art. 15)
- L'utilisateur peut demander une copie de ses données
- Délai : 1 mois
- Gratuit (sauf demandes manifestement excessives)

#### Droit de rectification (Art. 16)
- Corriger des données inexactes
- Compléter des données incomplètes

#### Droit à l'effacement (Art. 17 - "Droit à l'oubli")
- Supprimer les données sur demande
- ⚠️ Exceptions :
  - Obligation légale de conservation (votes)
  - Intérêt public (transparence électorale)

#### Droit à la portabilité (Art. 20)
- Export des données en format structuré (JSON, CSV)
- Transmission à un autre responsable possible

#### Droit d'opposition (Art. 21)
- S'opposer au traitement (sauf base légale)
- ⚠️ Difficile pour le vote (mission légale)

### 4. Notification de violation (Art. 33-34)

**Obligation** : Notifier la CNIL sous 72h en cas de violation

**À implémenter** :
- Système de détection des violations
- Procédure de notification
- Registre des violations

### 5. Analyse d'impact (Art. 35 - DPIA)

**Obligation** : DPIA si traitement à risque élevé

**E-Voting nécessite une DPIA car** :
- Traitement à grande échelle
- Données sensibles (opinions politiques potentielles)
- Profilage possible

### 6. Consentement (Art. 7)

**Obligation** : Obtenir un consentement libre, spécifique, éclairé

**À implémenter** :
- Mentions d'information claires
- Checkboxes non pré-cochées
- Retrait du consentement facile

---

## Architecture solution

### Composants à créer

```
┌─────────────────────────────────────────────────┐
│         GDPR Compliance System                  │
└─────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Backend  │  │ Frontend │  │ Database │
│ Services │  │ UI       │  │ Schema   │
└──────────┘  └──────────┘  └──────────┘
```

### 1. Base de données

#### Table: `gdpr_data_categories`

```sql
CREATE TABLE gdpr_data_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  legal_basis TEXT NOT NULL,
  retention_period TEXT NOT NULL,
  is_sensitive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Données** :
- user_data (Exécution contrat, Durée compte, false)
- voter_data (Mission légale, Élection + 1 an, false)
- vote_data (Mission légale, Élection + 5 ans, true)
- audit_logs (Accountability, 5 ans, false)

#### Table: `gdpr_processing_activities`

```sql
CREATE TABLE gdpr_processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  data_categories TEXT[] NOT NULL,
  legal_basis TEXT NOT NULL,
  recipients TEXT,
  retention_period TEXT NOT NULL,
  security_measures TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `gdpr_data_requests`

```sql
CREATE TABLE gdpr_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  request_type TEXT NOT NULL CHECK (
    request_type IN ('access', 'rectification', 'erasure', 'portability', 'opposition', 'restriction')
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'rejected')
  ),
  details TEXT,
  response TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `gdpr_consents`

```sql
CREATE TABLE gdpr_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Backend Services

#### `server/services/gdprService.js`

**Fonctions** :

```javascript
// Registre des activités de traitement
export async function getProcessingActivitiesRegistry()

// Génération de rapport PDF
export async function generateComplianceReport(options)

// Gestion des demandes de droits
export async function handleDataAccessRequest(email)
export async function handleDataPortabilityRequest(email)
export async function handleDataErasureRequest(email, userId)
export async function handleDataRectificationRequest(email, data)

// Politique de rétention
export async function enforceRetentionPolicy()
export async function anonymizeOldData()

// Consentements
export async function recordConsent(userId, type, granted, metadata)
export async function withdrawConsent(userId, type)
export async function getConsentHistory(userId)

// Export de données
export async function exportUserData(userId, format = 'json')
```

#### `server/routes/gdpr.js`

**Endpoints** :

```javascript
// Conformité
GET  /api/gdpr/compliance-report       // Rapport de conformité PDF
GET  /api/gdpr/processing-registry     // Registre des traitements
GET  /api/gdpr/retention-policy        // Politique de rétention

// Droits des personnes
POST /api/gdpr/data-request            // Demande d'exercice de droit
GET  /api/gdpr/data-requests           // Liste des demandes
GET  /api/gdpr/data-requests/:id       // Détail d'une demande
PUT  /api/gdpr/data-requests/:id       // Traiter une demande

// Export de données
GET  /api/gdpr/export-my-data          // Export données utilisateur
GET  /api/gdpr/export-user-data/:id    // Export (admin)

// Consentements
GET  /api/gdpr/consents/:userId        // Historique des consentements
POST /api/gdpr/consents                // Enregistrer un consentement
PUT  /api/gdpr/consents/:id/withdraw   // Retirer un consentement
```

### 3. Frontend

#### `src/pages/GDPRCompliance.jsx`

**Sections** :
1. **Dashboard de conformité**
   - Indicateurs clés (nombre de demandes, consentements, etc.)
   - Bouton de génération de rapport

2. **Registre des activités de traitement**
   - Tableau des traitements
   - Recherche et filtres

3. **Demandes de droits**
   - Liste des demandes
   - Statut et historique
   - Traitement des demandes

4. **Politique de rétention**
   - Durées de conservation
   - Données à anonymiser/supprimer
   - Exécution manuelle de la politique

5. **Gestion des consentements**
   - Historique des consentements par utilisateur
   - Retraits de consentement

#### `src/components/GDPRDataRequestForm.jsx`

**Formulaire pour les utilisateurs** :
- Type de demande (accès, rectification, effacement, etc.)
- Email et nom
- Détails de la demande
- Validation et soumission

### 4. Génération de PDF

**Librairie** : `pdfkit` (déjà utilisé pour exports)

**Structure du rapport** :

```
┌─────────────────────────────────────┐
│   RAPPORT DE CONFORMITÉ RGPD        │
│   E-Voting Platform                 │
├─────────────────────────────────────┤
│                                     │
│ 1. Informations générales           │
│    - Date de génération             │
│    - Responsable du traitement      │
│    - DPO (si applicable)            │
│                                     │
│ 2. Registre des activités           │
│    - Liste des traitements          │
│    - Finalités                      │
│    - Bases légales                  │
│    - Durées de rétention            │
│                                     │
│ 3. Données traitées                 │
│    - Types de données               │
│    - Catégories de personnes        │
│    - Destinataires                  │
│                                     │
│ 4. Mesures de sécurité              │
│    - Chiffrement                    │
│    - Authentification               │
│    - Audit logs                     │
│    - Blockchain                     │
│                                     │
│ 5. Droits des personnes             │
│    - Procédures d'exercice          │
│    - Délais de traitement           │
│    - Statistiques                   │
│                                     │
│ 6. Violations (si applicable)       │
│    - Date                           │
│    - Nature                         │
│    - Mesures prises                 │
│                                     │
│ Signature électronique              │
└─────────────────────────────────────┘
```

---

## Plan d'implémentation

### Phase 1 : Préparation (Jour 1)

**Tâches** :
1. ✅ Créer ce document de planification
2. ⏳ Créer la migration de base de données
3. ⏳ Seed initial des catégories et activités

**Livrables** :
- `docs/gdpr-implementation-plan.md`
- `server/database/migrations/008-gdpr.sql`
- `server/scripts/migrate-gdpr.js`

### Phase 2 : Backend (Jours 1-2)

**Tâches** :
1. Créer `server/services/gdprService.js`
   - Fonctions de registre
   - Fonctions d'export de données
   - Fonctions de gestion des demandes
   - Politique de rétention

2. Créer `server/routes/gdpr.js`
   - Tous les endpoints listés ci-dessus
   - Authentification admin
   - Validation des données
   - Audit logging

**Livrables** :
- `server/services/gdprService.js` (~500 lignes)
- `server/routes/gdpr.js` (~400 lignes)

### Phase 3 : Frontend (Jours 2-3)

**Tâches** :
1. Créer `src/pages/GDPRCompliance.jsx`
   - Dashboard de conformité
   - Registre des activités
   - Gestion des demandes
   - Politique de rétention

2. Créer `src/components/GDPRDataRequestForm.jsx`
   - Formulaire public
   - Validation
   - Soumission

**Livrables** :
- `src/pages/GDPRCompliance.jsx` (~600 lignes)
- `src/components/GDPRDataRequestForm.jsx` (~300 lignes)

### Phase 4 : Génération PDF (Jour 3)

**Tâches** :
1. Implémenter `generateComplianceReport()` dans gdprService
2. Créer templates PDF
3. Signature électronique (hash)

**Livrables** :
- Fonction de génération complète
- PDF conforme et professionnel

### Phase 5 : Tests (Jour 4)

**Tâches** :
1. Tests backend (gdprService + routes)
2. Tests frontend (GDPRCompliance)
3. Tests end-to-end (demande de droit)

**Livrables** :
- `server/services/__tests__/gdprService.test.js` (~300 lignes)
- `server/routes/__tests__/gdpr.test.js` (~400 lignes)
- `src/pages/__tests__/GDPRCompliance.test.jsx` (~300 lignes)

### Phase 6 : Documentation (Jour 4)

**Tâches** :
1. Documentation technique (GDPR.md)
2. Procédures opérationnelles
3. Guide utilisateur

**Livrables** :
- `docs/GDPR.md` (~1,500 lignes)
- Procédures de traitement des demandes

---

## Checklist conformité

### Avant lancement

- [ ] Migration base de données exécutée
- [ ] Registre des activités complet
- [ ] Politique de rétention définie
- [ ] Procédures de droits documentées
- [ ] Tests passent à 100%
- [ ] Documentation complète

### Mise en conformité

- [ ] **Art. 13-14** : Mentions d'information affichées
- [ ] **Art. 15** : Procédure de droit d'accès fonctionnelle
- [ ] **Art. 16** : Procédure de rectification fonctionnelle
- [ ] **Art. 17** : Procédure d'effacement fonctionnelle
- [ ] **Art. 20** : Portabilité des données (export JSON/CSV)
- [ ] **Art. 30** : Registre des activités de traitement
- [ ] **Art. 32** : Mesures de sécurité documentées
- [ ] **Art. 33** : Procédure de notification de violation

### Tests de conformité

- [ ] Export de données utilisateur fonctionne
- [ ] Génération de rapport PDF fonctionne
- [ ] Demandes de droits traitées correctement
- [ ] Politique de rétention applicable
- [ ] Logs d'audit complets

---

## Estimation

### Temps de développement

| Phase | Tâches | Temps estimé |
|-------|--------|--------------|
| Phase 1 | Base de données | 2 heures |
| Phase 2 | Backend | 6 heures |
| Phase 3 | Frontend | 6 heures |
| Phase 4 | PDF | 3 heures |
| Phase 5 | Tests | 5 heures |
| Phase 6 | Documentation | 3 heures |
| **Total** | | **~25 heures** |

### Répartition sur 4 jours

- **Jour 1** : Phases 1 + début Phase 2 (8h)
- **Jour 2** : Fin Phase 2 + Phase 3 (8h)
- **Jour 3** : Phase 4 + début Phase 5 (6h)
- **Jour 4** : Fin Phase 5 + Phase 6 (3h)

---

## Priorités

### 🔴 Critiques (Obligatoire)

1. Registre des activités de traitement (Art. 30)
2. Politique de rétention des données (Art. 5)
3. Droit d'accès (Art. 15)
4. Droit à l'effacement (Art. 17)

### 🟡 Importantes (Recommandé)

5. Portabilité des données (Art. 20)
6. Génération de rapport PDF
7. Gestion des consentements
8. Interface de traitement des demandes

### 🟢 Optionnelles (Nice to have)

9. Analyse d'impact (DPIA) complète
10. Notification automatique de violations
11. Dashboard analytics GDPR

---

## Conclusion

Ce plan couvre tous les aspects essentiels de la conformité RGPD pour E-Voting Platform. L'implémentation sera progressive et testée à chaque étape.

**Prochaine action** : Créer la migration base de données GDPR.

---

**Auteur** : Claude (Assistant IA)
**Date** : 10 novembre 2025
**Révision** : v1.0
