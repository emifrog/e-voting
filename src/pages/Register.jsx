import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { UserPlus } from 'lucide-react';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';

function Register({ setIsAuthenticated }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return;
    }

    if (!formData.email.trim()) {
      setError('L\'email est requis');
      return;
    }

    if (!formData.password) {
      setError('Le mot de passe est requis');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
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
              required
              placeholder="Jean Dupont"
            />
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              className="input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@example.com"
            />
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
              aria-invalid={
                formData.confirmPassword && formData.password !== formData.confirmPassword
              }
            />
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
                ✓ Les mots de passe correspondent
              </div>
            )}
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                ✗ Les mots de passe ne correspondent pas
              </div>
            )}
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
