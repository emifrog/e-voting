import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { UserPlus } from 'lucide-react';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import { useFormValidation } from '../hooks/useFormValidation';
import { required, minLength, email as emailValidator, password as passwordValidator, compose } from '../utils/validationRules';
import FieldError from '../components/FieldError';

function Register({ setIsAuthenticated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const navigate = useNavigate();

  // Validation setup
  const validation = useFormValidation(formData, {
    name: compose(
      required('Le nom est requis'),
      minLength(2, 'Le nom doit contenir au moins 2 caractères')
    ),
    email: compose(
      required('L\'email est requis'),
      emailValidator('Format d\'email invalide')
    ),
    password: compose(
      required('Le mot de passe est requis'),
      passwordValidator()
    ),
    confirmPassword: (value) => {
      if (!value) {
        return { isValid: false, message: 'La confirmation est requise' };
      }
      if (value !== formData.password) {
        return { isValid: false, message: 'Les mots de passe ne correspondent pas' };
      }
      return { isValid: true };
    }
  });

  // Récupérer le token CSRF au chargement du composant
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await api.get('/csrf-token');
        setCsrfToken(response.data.csrfToken);
      } catch (err) {
        console.error('Erreur lors de la récupération du CSRF token:', err);
      }
    };
    fetchCsrfToken();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value
    });

    // Trigger validation
    validation.setField(name, value);
    validation.validateField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all fields
    const isValid = await validation.validate();
    if (!isValid) {
      setError('Veuillez corriger les erreurs dans le formulaire');
      // Mark all fields as touched to show errors
      Object.keys(formData).forEach(key => validation.setFieldTouched(key));
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      }, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      const errorData = err.response?.data;
      setError(
        errorData?.message ||
        errorData?.error ||
        'Erreur lors de l\'inscription'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img
            src="/logo-removebg.png"
            alt="E-Voting Logo"
            style={{
              height: '80px',
              marginBottom: '16px',
              objectFit: 'contain'
            }}
          />
          <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#000' }}>E-Voting</h1>
          <p style={{ color: '#6b7280' }}>Créer un compte administrateur</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Nom complet</label>
            <input
              type="text"
              name="name"
              className="input"
              value={formData.name}
              onChange={handleChange}
              onBlur={validation.handleBlur}
              required
              placeholder="Jean Dupont"
              aria-invalid={validation.touched.name && validation.errors.name ? 'true' : 'false'}
              aria-describedby={validation.errors.name ? 'name-error' : undefined}
            />
            <FieldError error={validation.touched.name && validation.errors.name} id="name-error" />
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              className="input"
              value={formData.email}
              onChange={handleChange}
              onBlur={validation.handleBlur}
              required
              placeholder="admin@example.com"
              aria-invalid={validation.touched.email && validation.errors.email ? 'true' : 'false'}
              aria-describedby={validation.errors.email ? 'email-error' : undefined}
            />
            <FieldError error={validation.touched.email && validation.errors.email} id="email-error" />
          </div>

          {/* Password Strength Meter */}
          <PasswordStrengthMeter
            password={formData.password}
            onChange={(e) => handleChange(e)}
            name="password"
          />

          <div className="form-group">
            <label className="label" htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              className={`input ${
                formData.confirmPassword && formData.password === formData.confirmPassword
                  ? 'input-valid'
                  : formData.confirmPassword && formData.password !== formData.confirmPassword
                  ? 'input-invalid'
                  : ''
              }`}
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={validation.handleBlur}
              required
              placeholder="••••••••"
              style={{
                borderColor:
                  formData.confirmPassword && formData.password === formData.confirmPassword
                    ? '#22c55e'
                    : formData.confirmPassword && formData.password !== formData.confirmPassword
                    ? '#ef4444'
                    : '#d1d5db'
              }}
              aria-label="Confirmer le mot de passe"
              aria-invalid={validation.touched.confirmPassword && validation.errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={validation.errors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
                ✓ Les mots de passe correspondent
              </div>
            )}
            <FieldError error={validation.touched.confirmPassword && validation.errors.confirmPassword} id="confirmPassword-error" />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            <UserPlus size={18} />
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', color: '#6b7280' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
