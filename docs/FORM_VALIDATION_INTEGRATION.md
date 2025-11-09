# Form Validation Integration Guide

**Date:** November 9, 2025
**Status:** Ready for Integration
**Files to Update:** 5

---

## Quick Integration Steps

### Step 1: Import Required Components

```javascript
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/FormField';
import { validateEmail, validatePassword, validateVoterName } from '@/utils/validators';
```

### Step 2: Replace Form State with Hook

**Before:**
```javascript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
```

**After:**
```javascript
const form = useFormValidation(
  { email: '', password: '' },
  {
    email: validateEmail,
    password: validatePassword
  }
);
const [error, setError] = useState(''); // Keep for API errors
```

### Step 3: Replace Input Elements with FormField

**Before:**
```javascript
<input
  type="email"
  className="input"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  placeholder="admin@example.com"
/>
```

**After:**
```javascript
<FormField
  name="email"
  label="Email"
  type="email"
  required
  {...form.getFieldProps('email')}
  error={form.errors.email}
  touched={form.touched.email}
  placeholder="admin@example.com"
/>
```

### Step 4: Update Form Submission

**Before:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Manual validation
  if (!email.trim()) {
    setError('Email requis');
    return;
  }

  // API call
  try {
    const response = await api.post('/auth/login', { email, password });
    // ...
  } catch (err) {
    setError(err.response?.data?.message);
  }
};
```

**After:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Validate form
  const isValid = await form.validate();
  if (!isValid) return;

  // API call
  try {
    const response = await api.post('/auth/login', form.getValues());
    // ...
  } catch (err) {
    setError(err.response?.data?.message); // API errors only
  }
};
```

### Step 5: Update Submit Button

**Before:**
```javascript
<button type="submit" className="btn btn-primary" disabled={loading}>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

**After:**
```javascript
<button
  type="submit"
  className="btn btn-primary"
  disabled={loading || !form.isSubmittable}
>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

---

## Forms to Update (Priority Order)

### 1. Login.jsx (CRITICAL)
**Current State:** Basic validation
**Integration Impact:** Improved UX, real-time feedback
**Time:** 20 minutes

**Changes:**
- Replace email/password inputs with FormField
- Add real-time validation feedback
- Keep 2FA form as-is (no email/password validation needed there)

### 2. Register.jsx (CRITICAL)
**Current State:** Basic validation
**Integration Impact:** Better password strength feedback
**Time:** 25 minutes

**Changes:**
- Replace all form fields with FormField
- Use validatePassword for password strength
- Update confirmPassword validation
- Add password match checking

### 3. CreateElection.jsx (IMPORTANT)
**Current State:** No validation
**Integration Impact:** Better form UX, prevent invalid submissions
**Time:** 30 minutes

**Changes:**
- Add validators for title, description, options
- Replace input with FormField
- Show validation status while typing
- Improve error messaging

### 4. ElectionDetails.jsx (MEDIUM)
**Current State:** Basic error handling
**Integration Impact:** Consistent validation across app
**Time:** 20 minutes

**Changes:**
- Standardize form patterns
- Add FormField for all inputs

### 5. Dashboard/Voter Management (MEDIUM)
**Current State:** Manual validation
**Integration Impact:** Better bulk operation handling
**Time:** 25 minutes

**Changes:**
- Add validation for voter names, emails
- Improve bulk import feedback

---

## Integration Examples

### Example 1: Login Form

```javascript
import { useState } from 'react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/FormField';
import { validateEmail, validatePassword } from '@/utils/validators';
import api from '@/utils/api';

function Login({ setIsAuthenticated }) {
  const form = useFormValidation(
    { email: '', password: '' },
    {
      email: validateEmail,
      password: validatePassword
    }
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form
    const isValid = await form.validate();
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await api.post('/auth/login', form.getValues());
      // Handle successful login...
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormField
        name="email"
        label="Email"
        type="email"
        required
        {...form.getFieldProps('email')}
        error={form.errors.email}
        touched={form.touched.email}
        placeholder="admin@example.com"
      />

      <FormField
        name="password"
        label="Password"
        type="password"
        required
        {...form.getFieldProps('password')}
        error={form.errors.password}
        touched={form.touched.password}
        placeholder="••••••••"
      />

      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !form.isSubmittable}
      >
        {loading ? 'Connecting...' : 'Login'}
      </button>
    </form>
  );
}
```

### Example 2: Register Form with Password Confirmation

```javascript
import { useState } from 'react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/FormField';
import { validateEmail, validatePassword, validateVoterName } from '@/utils/validators';
import { composeValidators } from '@/utils/validators';

function Register({ setIsAuthenticated }) {
  const form = useFormValidation(
    { name: '', email: '', password: '', confirmPassword: '' },
    {
      name: validateVoterName,
      email: validateEmail,
      password: validatePassword,
      confirmPassword: async (value) => {
        if (value !== form.values.password) {
          return {
            isValid: false,
            message: 'Passwords do not match',
            level: 'error'
          };
        }
        return { isValid: true, message: 'Passwords match', level: 'success' };
      }
    }
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const isValid = await form.validate();
    if (!isValid) return;

    setLoading(true);
    try {
      // API call...
    } catch (err) {
      setError(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormField
        name="name"
        label="Full Name"
        type="text"
        required
        {...form.getFieldProps('name')}
        error={form.errors.name}
        touched={form.touched.name}
      />

      <FormField
        name="email"
        label="Email"
        type="email"
        required
        {...form.getFieldProps('email')}
        error={form.errors.email}
        touched={form.touched.email}
      />

      <FormField
        name="password"
        label="Password"
        type="password"
        required
        {...form.getFieldProps('password')}
        error={form.errors.password}
        touched={form.touched.password}
        hint="Min 12 chars, uppercase, lowercase, number, special char"
      />

      <FormField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        required
        {...form.getFieldProps('confirmPassword')}
        error={form.errors.confirmPassword}
        touched={form.touched.confirmPassword}
      />

      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !form.isSubmittable}
      >
        {loading ? 'Creating...' : 'Create Account'}
      </button>
    </form>
  );
}
```

### Example 3: CreateElection with Validation

```javascript
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/FormField';
import { validateElectionTitle, validateDescription, validateRequired } from '@/utils/validators';

function CreateElection() {
  const form = useFormValidation(
    {
      title: '',
      description: '',
      voting_type: 'simple',
      scheduled_start: '',
      scheduled_end: ''
    },
    {
      title: validateElectionTitle,
      description: validateDescription,
      voting_type: (v) => ({
        isValid: !!v,
        message: v ? '' : 'Voting type required'
      }),
      scheduled_start: validateRequired
    }
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const isValid = await form.validate();
    if (!isValid) return;

    setLoading(true);
    try {
      const response = await api.post('/elections', form.getValues());
      // Navigate...
    } catch (err) {
      setError(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormField
        name="title"
        label="Election Title"
        type="text"
        required
        {...form.getFieldProps('title')}
        error={form.errors.title}
        touched={form.touched.title}
        hint="3-200 characters"
      />

      <FormField
        name="description"
        label="Description"
        type="textarea"
        required
        {...form.getFieldProps('description')}
        error={form.errors.description}
        touched={form.touched.description}
        hint="10-5000 characters"
      />

      {/* Rest of form... */}

      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !form.isSubmittable}
      >
        {loading ? 'Creating...' : 'Create Election'}
      </button>
    </form>
  );
}
```

---

## Styling Compatibility

The FormField component uses CSS classes that work with your existing styles:

- `.form-field` - Container
- `.form-field__label` - Label styling
- `.form-field__input` - Input styling
- `.form-field__error` - Error message styling
- `.form-field__hint` - Hint text styling
- `.form-field__status` - Validation status indicator

No CSS changes needed - FormField.css provides all required styling.

---

## Testing During Integration

### Manual Testing Checklist

For each form, verify:
- [ ] Real-time validation works while typing
- [ ] Error messages display correctly
- [ ] Status indicators (✓/✗) appear after 500ms
- [ ] Form submit button disables when invalid
- [ ] Tab navigation works properly
- [ ] Focus indicators visible
- [ ] Error messages announce to screen readers
- [ ] Mobile view displays correctly
- [ ] Dark mode styling applies
- [ ] API errors still display in error alert

### Run Tests

```bash
# Run all tests
npm test

# Run specific form tests
npm test -- src/components/__tests__/FormField.test.jsx
npm test -- src/hooks/__tests__/useFormValidation.test.jsx
npm test -- src/utils/__tests__/validators.test.js
```

---

## Migration Path

### Phase 1: Critical Forms (Today)
1. Login.jsx - Most used form
2. Register.jsx - User-facing form

### Phase 2: Important Forms (This Week)
3. CreateElection.jsx - Admin form
4. ElectionDetails.jsx - Admin form

### Phase 3: Supporting Forms (Next Week)
5. Voter management forms
6. Settings forms

---

## Troubleshooting

### Issue: FormField not accepting value prop
**Solution:** Use `getFieldProps()` helper which returns value, onChange, onBlur

### Issue: Validation not triggering
**Solution:** Make sure to call `form.validate()` on form submit

### Issue: Button not disabling when invalid
**Solution:** Add `disabled={!form.isSubmittable}` to submit button

### Issue: Async validators not working
**Solution:** Make sure to await `form.validate()` in async submit handlers

### Issue: Custom CSS not applying
**Solution:** Check that FormField.css is imported and CSS variables are set

---

## Next Steps

1. ✅ Review integration examples
2. ✅ Update Login.jsx first
3. ✅ Test with real API calls
4. ✅ Update Register.jsx
5. ✅ Update CreateElection.jsx
6. ✅ Update remaining forms
7. ✅ Run full test suite
8. ✅ Create PR for code review

---

**Status: READY FOR INTEGRATION**

