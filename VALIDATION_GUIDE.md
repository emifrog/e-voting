# Validation Centralisée - Guide d'Utilisation

## Overview

La plateforme utilise **Joi** pour la validation centralisée de toutes les requêtes API. Cela garantit:
- ✅ Cohérence entre frontend et backend
- ✅ Messages d'erreur standardisés
- ✅ Validation côté serveur stricte
- ✅ Nettoyage des données (stripUnknown)

---

## Architecture de Validation

### Fichiers Clés

```
server/
├── utils/
│   └── validationSchemas.js     # Schémas Joi centralisés
└── middleware/
    └── validation.js             # Middleware de validation
```

### Hiérarchie des Validations

1. **Frontend** - Validation basique avec composants React
2. **Backend Middleware** - Validation Joi stricte
3. **Backend Route Handlers** - Logique métier supplémentaire

---

## Utilisation dans les Routes

### Exemple 1: Validation du Body

```javascript
import { validateBody } from '../middleware/validation.js';
import { authSchemas } from '../utils/validationSchemas.js';

router.post('/register',
  validateBody(authSchemas.register),
  async (req, res) => {
    // req.body est garanti valide ici
    const { email, password, name } = req.body;
    // ...
  }
);
```

### Exemple 2: Validation des Params

```javascript
import { validateParams } from '../middleware/validation.js';
import Joi from 'joi';

const getElectionSchema = Joi.object({
  id: Joi.string().uuid().required()
});

router.get('/:id',
  validateParams(getElectionSchema),
  async (req, res) => {
    const { id } = req.params;
    // ...
  }
);
```

### Exemple 3: Validation de la Query

```javascript
import { validateQuery } from '../middleware/validation.js';
import Joi from 'joi';

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  sort: Joi.string().default('created_at')
});

router.get('/',
  validateQuery(listSchema),
  async (req, res) => {
    const { page, limit, sort } = req.query;
    // ...
  }
);
```

---

## Schémas Disponibles

### Authentication (`authSchemas`)

```javascript
// Registration
authSchemas.register
// Fields: name, email, password

// Login
authSchemas.login
// Fields: email, password, twoFactorToken, rememberMe

// Refresh Token
authSchemas.refresh
// Fields: refreshToken

// 2FA Setup
authSchemas.twoFactorSetup
// Fields: password

// 2FA Verify
authSchemas.twoFactorVerify
// Fields: code, backupCode
```

### Elections (`electionSchemas`)

```javascript
// Create Election
electionSchemas.create
// Fields: title, description, votingType, isAnonymous,
//         allowWeightedVotes, startTime, endTime,
//         quorumType, quorumValue, options

// Update Election
electionSchemas.update
// Fields: title, description, status
```

### Voters (`voterSchemas`)

```javascript
// Add Single Voter
voterSchemas.addVoter
// Fields: email, name, weight, group

// Bulk Add Voters
voterSchemas.bulkAddVoters
// Fields: voters (array of voters)

// Update Voter
voterSchemas.updateVoter
// Fields: name, weight, group
```

### Voting (`votingSchemas`)

```javascript
// Cast Vote
votingSchemas.castVote
// Fields: choices, weight
```

### Observers (`observerSchemas`)

```javascript
// Create Observer
observerSchemas.create
// Fields: email, name, canSeeResults, canSeeTurnout, canComment
```

---

## Format des Erreurs

Quand la validation échoue, le serveur retourne:

```json
{
  "error": true,
  "code": "VALIDATION_ERROR",
  "message": "Le titre doit contenir au moins 5 caractères",
  "details": [
    {
      "field": "title",
      "message": "Le titre doit contenir au moins 5 caractères",
      "type": "string.min"
    },
    {
      "field": "email",
      "message": "L'email doit être une adresse email valide",
      "type": "string.email"
    }
  ]
}
```

### Gestion Frontend

```javascript
try {
  const response = await api.post('/auth/register', {
    name: 'Jean Dupont',
    email: 'invalid-email',
    password: 'weak'
  });
} catch (error) {
  if (error.response?.data?.code === 'VALIDATION_ERROR') {
    const details = error.response.data.details;
    details.forEach(error => {
      showFieldError(error.field, error.message);
    });
  }
}
```

---

## Création de Nouveaux Schémas

### Exemple: Ajouter un Schéma pour Commentaires

```javascript
// Dans server/utils/validationSchemas.js

export const commentSchemas = {
  create: Joi.object({
    electionId: Joi.string().uuid().required(),

    text: Joi.string()
      .trim()
      .min(3)
      .max(1000)
      .required()
      .messages({
        'string.empty': 'Le commentaire est requis',
        'string.min': 'Le commentaire doit contenir au moins 3 caractères',
        'string.max': 'Le commentaire ne doit pas dépasser 1000 caractères'
      }),

    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .optional()
  }).unknown(false)
};
```

### Puis l'utiliser dans une route:

```javascript
import { commentSchemas } from '../utils/validationSchemas.js';
import { validateBody } from '../middleware/validation.js';

router.post('/:electionId/comments',
  validateBody(commentSchemas.create),
  async (req, res) => {
    // req.body.electionId, req.body.text, req.body.rating sont validés
    // ...
  }
);
```

---

## Bonnes Pratiques

### ✅ À Faire

1. **Toujours valider les inputs utilisateur**
   ```javascript
   router.post('/create',
     validateBody(electionSchemas.create),
     handler
   );
   ```

2. **Fournir des messages d'erreur clairs**
   ```javascript
   Joi.string().required().messages({
     'string.empty': 'Le titre est requis'
   })
   ```

3. **Synchroniser frontend et backend**
   - Les limites doivent être identiques
   - Les formats doivent correspondre

4. **Utiliser `stripUnknown: true`**
   - Rejette les champs inconnus
   - Prévient les injections

### ❌ À Éviter

1. **Valider manuellement quand on a Joi**
   ```javascript
   // ❌ Mauvais
   if (!email.includes('@')) { ... }

   // ✅ Bon
   Joi.string().email().required()
   ```

2. **Oublier de valider les params/query**
   ```javascript
   // ❌ Mauvais
   router.get('/:id', async (req, res) => {
     const id = req.params.id; // Could be anything!
   });

   // ✅ Bon
   router.get('/:id',
     validateParams(Joi.object({ id: Joi.string().uuid() })),
     handler
   );
   ```

3. **Accepter les champs inconnus**
   ```javascript
   // ❌ Mauvais - accepte n'importe quoi
   Joi.object().unknown(true)

   // ✅ Bon - rejette les champs inconnus
   Joi.object().unknown(false)
   ```

---

## Types Joi Courants

```javascript
// Strings
Joi.string().min(3).max(100).required()
Joi.string().email()
Joi.string().uri()
Joi.string().regex(/^\d+$/)

// Numbers
Joi.number().integer().min(0).max(100)

// Booleans
Joi.boolean().default(false)

// Dates
Joi.date().iso()

// Arrays
Joi.array().items(Joi.string()).min(1).max(10)

// Enums
Joi.string().valid('draft', 'published', 'archived')

// Conditionals
Joi.when('field', {
  is: Joi.string().valid('special'),
  then: Joi.string().required(),
  otherwise: Joi.string().optional()
})

// Alternatives
Joi.alternatives().try(
  Joi.string(),
  Joi.number(),
  Joi.object()
)
```

---

## Validation Asynchrone (Avancé)

Pour les validations qui nécessitent la base de données:

```javascript
const emailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .external(async (value) => {
      const exists = await checkEmailExists(value);
      if (exists) {
        throw new Error('Email already registered');
      }
    })
});
```

---

## Debugging

### Afficher les erreurs de validation

```javascript
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      // Debug
      console.log('Validation errors:', error.details);
      console.log('Received data:', req.body);
    }

    // ...
  };
};
```

### Tester un schéma

```javascript
// Dans une page de test
const { error, value } = authSchemas.register.validate({
  name: 'Jean',
  email: 'jean@example.com',
  password: 'MyP@ssw0rd123'
});

console.log('Valid:', !error);
console.log('Value:', value);
console.log('Errors:', error?.details);
```

---

## Migrer vers Validation Centralisée

### Avant (Validation Manuelle)

```javascript
router.post('/elections', (req, res) => {
  const { title, description } = req.body;

  if (!title || title.length < 5) {
    return res.status(400).json({ error: 'Invalid title' });
  }

  if (description && description.length > 5000) {
    return res.status(400).json({ error: 'Description too long' });
  }

  // ...
});
```

### Après (Validation Centralisée)

```javascript
router.post('/elections',
  validateBody(electionSchemas.create),
  (req, res) => {
    const { title, description } = req.body;
    // Garanti valide ici!
    // ...
  }
);
```

---

## Conclusion

La validation centralisée avec Joi:
- ✅ Réduit la duplication de code
- ✅ Normalise les messages d'erreur
- ✅ Facilite la maintenance
- ✅ Augmente la sécurité

Pour toute question, voir `server/utils/validationSchemas.js`.

