# Guide de Démarrage - Implémentation des Améliorations

**Date:** Novembre 7, 2025
**Target:** Améliorations restantes (4 items)
**Durée estimée:** 46 heures (~1.5 mois)

---

## 🎯 Quick Start

### Préparation (30 min)
1. Lire ce guide
2. Vérifier `IMPLEMENTATION_PLAN_REMAINING.md`
3. Créer branche feature
4. Configurer environnement

### Development Cycle
```
1. Créer branche feature
2. Implémenter + Tests
3. Code review
4. Merge à main
5. Tag version
```

---

## 1️⃣ Real-time Form Validation

### Démarrage Rapide

**Créer branche:**
```bash
git checkout -b feature/form-validation
```

**Créer structure:**
```bash
mkdir src/components/Form
mkdir src/hooks/__tests__
mkdir src/utils/validators
```

**Files à créer:**
- `src/components/FormField.jsx` (150 lines)
- `src/hooks/useFormValidation.js` (200 lines)
- `src/utils/validators.js` (300 lines)
- `src/components/__tests__/FormField.test.jsx`

### Étape 1: FormField Component (2h)

```jsx
// src/components/FormField.jsx
import { useState, useCallback, useRef, useEffect } from 'react';

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  validator,
  onValidChange,
  suggestions = true,
  ...props
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounceTimer = useRef(null);

  // Validation avec debounce
  const validate = useCallback(async (val) => {
    if (!validator) return;

    // Clear timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce 300ms
    debounceTimer.current = setTimeout(async () => {
      const result = await validator(val);
      setError(result.message || null);
      setIsValid(result.isValid);
      onValidChange?.(result.isValid);
    }, 300);
  }, [validator, onValidChange]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    validate(newValue);
  };

  const handleBlur = () => {
    setTouched(true);
  };

  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-invalid={touched && error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`
          form-input
          ${isValid && touched ? 'valid' : ''}
          ${error && touched ? 'error' : ''}
        `}
        {...props}
      />

      {isValid && touched && (
        <span className="checkmark">✓</span>
      )}

      {error && touched && (
        <div id={`${name}-error`} className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Étape 2: useFormValidation Hook (2h)

```javascript
// src/hooks/useFormValidation.js
import { useState, useCallback } from 'react';

export function useFormValidation(initialValues, validators) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setField = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const validate = useCallback(async () => {
    const newErrors = {};

    for (const [field, validator] of Object.entries(validators)) {
      const result = await validator(values[field]);
      if (!result.isValid) {
        newErrors[field] = result.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validators]);

  const isSubmittable = Object.keys(errors).length === 0 &&
                         Object.keys(touched).length > 0;

  return {
    values,
    errors,
    touched,
    setField,
    setFieldError,
    setFieldTouched,
    validate,
    isSubmittable
  };
}
```

### Étape 3: Validators (2h)

```javascript
// src/utils/validators.js
import api from './api';

export const validators = {
  // Email validation
  email: async (value) => {
    if (!value) return { isValid: false, message: 'Email requis' };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, message: 'Email invalide' };
    }

    // Check availability
    try {
      const { data } = await api.get(`/validate/email/${value}`);
      if (data.taken) {
        return {
          isValid: false,
          message: `${value} existe déjà`,
          suggestions: data.suggestions
        };
      }
    } catch (error) {
      // Ignore if endpoint not available
    }

    return { isValid: true };
  },

  // Password strength
  password: (value) => {
    if (!value) return { isValid: false, message: 'Mot de passe requis' };

    const checks = {
      length: value.length >= 12,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*]/.test(value)
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const strength = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Très fort'][passed];

    if (passed < 3) {
      return {
        isValid: false,
        message: `${strength} - Ajouter: ${
          !checks.uppercase ? 'majuscule ' : ''
        }${!checks.lowercase ? 'minuscule ' : ''}${
          !checks.number ? 'chiffre ' : ''
        }${!checks.special ? 'caractère spécial' : ''}`.trim()
      };
    }

    return { isValid: true, strength };
  },

  // Username
  username: async (value) => {
    if (!value) return { isValid: false, message: 'Nom d\'utilisateur requis' };
    if (value.length < 3) return { isValid: false, message: 'Min 3 caractères' };
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return { isValid: false, message: 'Alphanumeric + underscore' };
    }

    // Check availability
    try {
      const { data } = await api.get(`/validate/username/${value}`);
      if (!data.available) {
        return { isValid: false, message: 'Déjà utilisé' };
      }
    } catch (error) {
      // Ignore
    }

    return { isValid: true };
  }
};
```

### Étape 4: Tests (2h)

```javascript
// src/components/__tests__/FormField.test.jsx
import { render, screen, userEvent, waitFor } from '@testing-library/react';
import { FormField } from '../FormField';

describe('FormField', () => {
  const mockValidator = async (value) => ({
    isValid: value.includes('@'),
    message: 'Email invalide'
  });

  it('should validate on change', async () => {
    const user = userEvent.setup();
    render(
      <FormField
        name="email"
        label="Email"
        validator={mockValidator}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'test@example.com');

    await waitFor(() => {
      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  it('should show error message', async () => {
    const user = userEvent.setup();
    render(
      <FormField
        name="email"
        label="Email"
        validator={mockValidator}
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'invalid');
    await user.click(document.body); // blur

    await waitFor(() => {
      expect(screen.getByText('Email invalide')).toBeInTheDocument();
    });
  });
});
```

### Integration dans CreateElection (2h)

```jsx
// src/pages/CreateElection.jsx
import { useFormValidation } from '../hooks/useFormValidation';
import { FormField } from '../components/FormField';
import { validators } from '../utils/validators';

export function CreateElection() {
  const form = useFormValidation(
    {
      title: '',
      description: '',
      email: ''
    },
    {
      title: (v) => ({ isValid: v.length >= 3, message: 'Min 3 caractères' }),
      email: validators.email
    }
  );

  return (
    <form onSubmit={handleSubmit}>
      <FormField
        name="title"
        label="Titre"
        value={form.values.title}
        onChange={(e) => form.setField('title', e.target.value)}
        onBlur={() => form.setFieldTouched('title')}
        validator={validators.title}
      />

      <FormField
        name="email"
        label="Email"
        type="email"
        value={form.values.email}
        onChange={(e) => form.setField('email', e.target.value)}
        validator={validators.email}
      />

      <button
        type="submit"
        disabled={!form.isSubmittable}
      >
        Créer l'élection
      </button>
    </form>
  );
}
```

### Commit & Push
```bash
git add .
git commit -m "feat: Add real-time form validation

- FormField component with debounced validation
- useFormValidation hook
- Email, password, username validators
- Async availability checking
- Visual feedback (✓/✗)
- Tests for all validators"

git push -u origin feature/form-validation
```

---

## 2️⃣ WCAG 2.1 AA Accessibility

### Installation Dependencies
```bash
npm install --save-dev axe-core @axe-core/react jest-axe
```

### Audit Initial (1h)
```bash
npx axe https://localhost:5173
# Génère rapport d'erreurs
```

### Corrections Systématiques

**Buttons (1h):**
```jsx
// ❌ Avant
<button onClick={delete}>🗑️</button>

// ✅ Après
<button
  onClick={delete}
  aria-label="Supprimer l'électeur"
  className="btn-icon"
  title="Supprimer"
>
  <TrashIcon aria-hidden="true" />
</button>
```

**Forms (2h):**
```jsx
// ✅ Correct
<div className="form-group">
  <label htmlFor="email-input">Email *</label>
  <input
    id="email-input"
    type="email"
    aria-required="true"
    aria-describedby="email-error"
  />
  {error && (
    <span id="email-error" role="alert" className="error">
      {error}
    </span>
  )}
</div>
```

**Colors (3h):**
- Text: 4.5:1 ratio minimum
- Large text: 3:1 ratio
- Use WebAIM Contrast Checker

**Structure (2h):**
```jsx
// ✅ Correct
<header>
  <nav role="navigation">
    <a href="/" aria-current="page">Home</a>
  </nav>
</header>

<main>
  <h1>Page Title</h1>
  <h2>Section</h2>
  <p>Content</p>
</main>
```

### Testing (2h)
```bash
npm run test:a11y
# Automated accessibility tests
```

---

## 📚 Documentation Links

- [IMPLEMENTATION_PLAN_REMAINING.md](./IMPLEMENTATION_PLAN_REMAINING.md) - Detailed plan
- [ACCESSIBILITY_IMPLEMENTATION.md](./ACCESSIBILITY_IMPLEMENTATION.md) - A11y guide
- [FORM_VALIDATION.md](./FORM_VALIDATION.md) - Validation details

---

## 🔄 Development Workflow

### Before Starting
```bash
# Update main
git fetch origin
git checkout main
git pull

# Create feature branch
git checkout -b feature/[feature-name]
```

### During Development
```bash
# Regular commits
git add .
git commit -m "feat: [description]"

# Run tests
npm test

# Check code quality
npm run lint
```

### Before Pushing
```bash
# Rebase if needed
git rebase main

# Push to remote
git push -u origin feature/[feature-name]
```

### After Merge
```bash
# Update local
git checkout main
git pull

# Delete branch
git branch -d feature/[feature-name]
```

---

## ⚠️ Common Issues

### Issue: Debounce not working
**Solution:** Increase debounce timeout (300ms → 500ms)

### Issue: Tests failing
**Solution:** Check mock validators return correct format

### Issue: Performance slow
**Solution:** Use memoization for expensive calculations

---

## 📞 Support

For questions:
1. Check documentation files
2. Review test examples
3. Look at commit history for similar features

---

**Ready to start? Pick feature #18 (Form Validation) and begin! 🚀**
