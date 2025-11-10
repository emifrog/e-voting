# GDPR/RGPD Compliance Documentation

## Vue d'ensemble

Cette documentation décrit comment la plateforme E-Voting assure la conformité avec le **Règlement Général sur la Protection des Données (RGPD/GDPR)** - Règlement (UE) 2016/679.

## Table des matières

1. [Principes de conformité](#principes-de-conformité)
2. [Base légale](#base-légale)
3. [Droits des personnes concernées](#droits-des-personnes-concernées)
4. [Catégories de données](#catégories-de-données)
5. [Registre des activités de traitement](#registre-des-activités-de-traitement)
6. [Politique de rétention](#politique-de-rétention)
7. [Sécurité des données](#sécurité-des-données)
8. [Gestion des demandes](#gestion-des-demandes)
9. [Audit et reporting](#audit-et-reporting)

---

## Principes de conformité

La plateforme E-Voting respecte les 6 principes fondamentaux du GDPR (Art. 5):

### 1. Licéité, loyauté, transparence
- ✅ Bases légales clairement identifiées pour chaque traitement
- ✅ Informations transparentes fournies aux personnes concernées
- ✅ Politique de confidentialité accessible

### 2. Limitation des finalités
- ✅ Données collectées uniquement pour des finalités déterminées et explicites
- ✅ Pas de traitement ultérieur incompatible avec ces finalités

### 3. Minimisation des données
- ✅ Collecte limitée aux données strictement nécessaires
- ✅ Pas de collecte excessive ou non pertinente

### 4. Exactitude
- ✅ Mécanismes de mise à jour et rectification des données
- ✅ Suppression des données inexactes

### 5. Limitation de la conservation
- ✅ Politique de rétention définie pour chaque catégorie de données
- ✅ Anonymisation automatique des données expirées

### 6. Intégrité et confidentialité
- ✅ Chiffrement des données sensibles (AES-256)
- ✅ Contrôle d'accès strict (RBAC)
- ✅ Audit trail complet
- ✅ Sécurité renforcée (2FA, rate limiting, CSRF protection)

---

## Base légale

### Art. 6.1 - Bases juridiques utilisées

| Traitement | Base légale | Article |
|------------|-------------|---------|
| **Comptes administrateurs** | Contrat (Art. 6.1.b) | Nécessaire à l'exécution du contrat |
| **Listes électorales** | Intérêt public (Art. 6.1.e) | Mission d'intérêt public (vote électronique) |
| **Traitement des votes** | Intérêt public (Art. 6.1.e) | Mission d'intérêt public (vote électronique) |
| **Authentification 2FA** | Contrat (Art. 6.1.b) | Nécessaire à l'exécution du contrat |
| **Journaux d'audit** | Obligation légale (Art. 6.1.c) | Obligation de traçabilité |
| **Observateurs** | Intérêt public (Art. 6.1.e) | Transparence du processus électoral |

### Intérêt public (Art. 6.1.e)

Le vote électronique constitue une **mission d'intérêt public** car il permet:
- La participation démocratique
- L'accessibilité du vote
- La transparence du processus électoral
- Le respect du secret du vote

---

## Droits des personnes concernées

### Droits implémentés

| Droit | Article | Implémentation | Délai |
|-------|---------|----------------|-------|
| **Droit d'accès** | Art. 15 | ✅ API `/api/gdpr/export-my-data` | 1 mois |
| **Droit de rectification** | Art. 16 | ✅ API `/api/gdpr/data-request` (type: rectification) | 1 mois |
| **Droit à l'effacement** | Art. 17 | ✅ API `/api/gdpr/handle-erasure-request` | 1 mois |
| **Droit à la limitation** | Art. 18 | ✅ API `/api/gdpr/data-request` (type: restriction) | 1 mois |
| **Droit à la portabilité** | Art. 20 | ✅ Export JSON/CSV via API | 1 mois |
| **Droit d'opposition** | Art. 21 | ✅ API `/api/gdpr/data-request` (type: objection) | 1 mois |

### Procédure de demande

1. **Soumission**: Via interface GDPR ou email
2. **Vérification**: Identité de la personne concernée
3. **Traitement**: Max 30 jours (1 mois)
4. **Réponse**: Notification au demandeur
5. **Audit**: Traçabilité complète dans `gdpr_audit_log`

---

## Catégories de données

### user_identity (Administrateurs)
- **Description**: Données d'identification des administrateurs
- **Données**: Email, nom, mot de passe (hashé bcrypt)
- **Base légale**: Contrat (Art. 6.1.b)
- **Rétention**: Durée du compte + 1 an
- **Sensible**: ❌ Non

### voter_identity (Électeurs)
- **Description**: Données d'identification des électeurs
- **Données**: Email, nom, code unique UUID
- **Base légale**: Intérêt public (Art. 6.1.e)
- **Rétention**: Fin de l'élection + 1 an
- **Sensible**: ❌ Non

### vote_data (Votes)
- **Description**: Données de vote
- **Données**: Choix de vote (anonymisé), horodatage, hash blockchain
- **Base légale**: Intérêt public (Art. 6.1.e)
- **Rétention**: Fin de l'élection + 5 ans
- **Sensible**: ✅ Oui (opinion politique)

### authentication_data (Authentification)
- **Description**: Données d'authentification
- **Données**: Secrets 2FA, backup codes, sessions
- **Base légale**: Contrat (Art. 6.1.b)
- **Rétention**: Durée du compte
- **Sensible**: ✅ Oui (secrets cryptographiques)

### audit_logs (Journaux)
- **Description**: Journaux d'audit
- **Données**: Actions, IP, timestamps
- **Base légale**: Obligation légale (Art. 6.1.c)
- **Rétention**: 5 ans
- **Sensible**: ❌ Non

### observer_data (Observateurs)
- **Description**: Données des observateurs
- **Données**: Email, nom, token d'accès
- **Base légale**: Intérêt public (Art. 6.1.e)
- **Rétention**: Fin de l'élection + 6 mois
- **Sensible**: ❌ Non

---

## Registre des activités de traitement

### Art. 30 - Registre obligatoire

Le registre est accessible via l'interface GDPR: **Dashboard → GDPR → Onglet "Registre"**

#### Activité 1: Gestion des comptes administrateurs
- **Finalité**: Permettre aux administrateurs de créer et gérer des élections
- **Catégories de données**: user_identity, authentication_data, audit_logs
- **Personnes concernées**: Administrateurs de la plateforme
- **Base légale**: Contrat (Art. 6.1.b)
- **Destinataires**: Aucun transfert à des tiers
- **Transferts internationaux**: Non
- **Durée de conservation**: Durée du compte + 1 an
- **Mesures de sécurité**: 2FA, bcrypt, sessions sécurisées, audit complet

#### Activité 2: Gestion des listes électorales
- **Finalité**: Constituer et gérer les listes d'électeurs
- **Catégories de données**: voter_identity, audit_logs
- **Personnes concernées**: Électeurs inscrits
- **Base légale**: Intérêt public (Art. 6.1.e)
- **Destinataires**: Administrateurs d'élection, observateurs autorisés
- **Transferts internationaux**: Non
- **Durée de conservation**: Fin de l'élection + 1 an
- **Mesures de sécurité**: Codes UUID, accès restreint, logs d'accès

#### Activité 3: Traitement des votes
- **Finalité**: Enregistrer et comptabiliser les votes de manière sécurisée et anonyme
- **Catégories de données**: vote_data, audit_logs
- **Personnes concernées**: Électeurs ayant voté
- **Base légale**: Intérêt public (Art. 6.1.e)
- **Destinataires**: Aucun (secret du vote)
- **Transferts internationaux**: Non
- **Durée de conservation**: Fin de l'élection + 5 ans
- **Mesures de sécurité**: Anonymisation voter_id, blockchain Ethereum, chiffrement, hash vérifiable

---

## Politique de rétention

### Principe (Art. 5.1.e)

Les données ne sont conservées que pendant la durée nécessaire aux finalités pour lesquelles elles sont traitées.

### Durées de conservation

| Catégorie | Durée | Méthode |
|-----------|-------|---------|
| **Comptes administrateurs** | Compte + 1 an | Suppression ou anonymisation |
| **Électeurs** | Élection + 1 an | Anonymisation automatique |
| **Votes** | Élection + 5 ans | Conservation avec anonymisation voter_id |
| **Authentification 2FA** | Durée du compte | Suppression à la fermeture |
| **Journaux d'audit** | 5 ans | Conservation immuable |
| **Observateurs** | Élection + 6 mois | Suppression |

### Application de la politique

**Automatique**: La politique peut être appliquée automatiquement via:
```bash
POST /api/gdpr/enforce-retention
```

**Manuelle**: Via l'interface GDPR → Onglet "Rétention" → Bouton "Appliquer maintenant"

### Anonymisation vs Suppression

- **Anonymisation**: Remplacement des données par des valeurs anonymisées (ex: `deleted_<id>@anonymized.local`)
- **Suppression complète**: Effacement définitif des enregistrements (sur demande explicite)

---

## Sécurité des données

### Mesures techniques (Art. 32)

#### Chiffrement
- ✅ **AES-256** pour les données sensibles en base
- ✅ **bcrypt** (12 rounds) pour les mots de passe
- ✅ **HTTPS/TLS** pour les communications
- ✅ **Chiffrement des secrets 2FA**

#### Contrôle d'accès
- ✅ **Authentification JWT** avec expiration
- ✅ **2FA obligatoire** pour les administrateurs
- ✅ **RBAC** (Role-Based Access Control)
- ✅ **Tokens révocables** pour les électeurs et observateurs

#### Protection contre les attaques
- ✅ **Rate limiting** adaptatif
- ✅ **CSRF protection** (tokens double-submit)
- ✅ **Helmet.js** (headers de sécurité)
- ✅ **Input validation** et sanitization
- ✅ **SQL injection prevention** (prepared statements)

#### Monitoring
- ✅ **Audit trail complet** (qui, quoi, quand, où)
- ✅ **Sentry** pour la détection d'erreurs
- ✅ **Prometheus** pour les métriques
- ✅ **Alertes** en temps réel

### Mesures organisationnelles

- ✅ **Documentation** complète de la sécurité
- ✅ **Formation** des administrateurs aux bonnes pratiques
- ✅ **Procédures** de gestion des violations de données
- ✅ **Tests** de sécurité réguliers

---

## Gestion des demandes

### Workflow des demandes

```
1. Soumission → 2. Vérification → 3. Traitement → 4. Réponse → 5. Audit
```

### Types de demandes supportés

#### 1. Demande d'accès (Art. 15)
- Export de toutes les données personnelles au format JSON ou CSV
- Inclut: profil, élections créées, votes (anonymisés), journaux d'audit

#### 2. Demande de rectification (Art. 16)
- Correction des données inexactes
- Mise à jour du profil

#### 3. Demande d'effacement (Art. 17)
- **Option 1**: Anonymisation (par défaut)
- **Option 2**: Suppression complète (si compatible avec obligations légales)

#### 4. Demande de limitation (Art. 18)
- Marquage des données comme "limitées"
- Pas de traitement ultérieur sauf conservation

#### 5. Demande de portabilité (Art. 20)
- Export au format structuré (JSON/CSV)
- Transmission directe possible (si techniquement faisable)

#### 6. Demande d'opposition (Art. 21)
- Opposition au traitement pour raisons tenant à la situation particulière
- Évaluation au cas par cas

### Interface de gestion

**Accès**: Dashboard → GDPR → Onglet "Demandes"

**Fonctionnalités**:
- Liste de toutes les demandes
- Filtrage par type, statut, date
- Détails de chaque demande
- Actions: Accepter, Rejeter, Traiter
- Suivi des délais (30 jours max)

---

## Audit et reporting

### Journaux d'audit GDPR

Toutes les actions GDPR sont enregistrées dans la table `gdpr_audit_log`:

| Type d'action | Description |
|---------------|-------------|
| `data_request_created` | Nouvelle demande créée |
| `data_request_processed` | Demande traitée |
| `data_exported` | Données exportées |
| `data_deleted` | Données supprimées |
| `consent_granted` | Consentement accordé |
| `consent_withdrawn` | Consentement retiré |
| `breach_reported` | Violation de données signalée |
| `report_generated` | Rapport de conformité généré |
| `retention_applied` | Politique de rétention appliquée |

### Statistiques de conformité

**Accès**: Dashboard → GDPR → Onglet "Statistiques"

**Métriques disponibles**:
- Score de conformité global
- Nombre de demandes en attente
- Demandes par type (accès, effacement, etc.)
- Demandes par statut (pending, in_progress, completed, rejected)
- Temps de réponse moyen
- Nombre de catégories de données
- Activités de traitement actives

### Rapports de conformité

**Génération**: Dashboard → GDPR → Bouton "Rapport PDF"

**Contenu du rapport**:
- Score de conformité
- Registre des activités de traitement
- Statistiques des demandes
- Politique de rétention
- Mesures de sécurité
- Violations de données (si applicable)

**Format**: PDF (Art. 30 - Documentation requise)

---

## Violations de données (Art. 33-34)

### Procédure de notification

#### Délais
- **72 heures** pour notifier l'autorité de contrôle (CNIL en France)
- **Sans délai** pour notifier les personnes concernées (si risque élevé)

#### Enregistrement
Toutes les violations sont enregistrées dans la table `gdpr_data_breaches`:
- Type de violation (confidentialité, intégrité, disponibilité)
- Sévérité (faible, moyenne, élevée, critique)
- Date de découverte
- Données affectées
- Nombre de personnes concernées
- Conséquences probables
- Mesures prises et planifiées
- Référence de l'autorité

---

## Conformité continue

### Actions régulières

#### Hebdomadaire
- ✅ Revue des demandes en attente
- ✅ Vérification des délais de réponse

#### Mensuel
- ✅ Application de la politique de rétention
- ✅ Audit des accès aux données sensibles
- ✅ Mise à jour du registre des activités

#### Trimestriel
- ✅ Génération du rapport de conformité
- ✅ Revue des mesures de sécurité
- ✅ Formation des administrateurs

#### Annuel
- ✅ Audit GDPR complet
- ✅ Mise à jour de la politique de confidentialité
- ✅ Revue des bases légales

---

## Contacts

### Délégué à la Protection des Données (DPO)
- **Contact**: À définir selon l'organisation
- **Rôle**: Conseil, contrôle, point de contact avec l'autorité

### Autorité de contrôle
- **France**: CNIL (Commission Nationale de l'Informatique et des Libertés)
- **Site**: https://www.cnil.fr
- **Notification de violation**: https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles

---

## Références légales

- **GDPR**: Règlement (UE) 2016/679
- **Article 5**: Principes relatifs au traitement des données
- **Article 6**: Licéité du traitement
- **Article 7**: Conditions applicables au consentement
- **Article 15-22**: Droits des personnes concernées
- **Article 30**: Registre des activités de traitement
- **Article 32**: Sécurité du traitement
- **Article 33-34**: Notification des violations
- **Article 35**: Analyse d'impact (DPIA)

---

## Annexes

### A. Modèle de demande GDPR

```json
{
  "request_type": "access|rectification|erasure|restriction|portability|objection",
  "requester_email": "email@example.com",
  "requester_name": "Nom du demandeur",
  "details": "Description de la demande",
  "priority": "normal|high|urgent"
}
```

### B. Schéma de la base de données GDPR

Voir: `server/database/migrations/008-gdpr.sql`

### C. API Endpoints GDPR

Voir: `server/routes/gdpr.js`

---

**Dernière mise à jour**: 2025-11-10
**Version**: 1.0
**Statut**: ✅ Conformité implémentée
