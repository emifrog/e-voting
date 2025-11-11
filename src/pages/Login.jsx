import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ErrorAlert from '../components/ErrorAlert';
import { getErrorHint } from '../utils/errorHandler';
import { LogIn, Shield } from 'lucide-react';
import { useFormValidation } from '../hooks/useFormValidation';
import { FormField } from '../components/FormField';
import { validateEmail, validatePassword } from '../utils/validators';

function Login({ setIsAuthenticated }) {
  const form = useFormValidation(
    { email: '', password: '' },
    {
      email: validateEmail,
      password: validatePassword
    }
  );

  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate form fields
    const isValid = await form.validate();
    if (!isValid) return;

    setLoading(true);

    try {
      const { email, password } = form.getValues();
      const response = await api.post('/auth/login', { email, password, rememberMe }, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

      // Vérifier si 2FA est requis
      if (response.data.require2FA) {
        setTwoFactorRequired(true);
        setTempEmail(email);
        setLoading(false);
        return;
      }

      // Login réussi sans 2FA
      saveTokensAndNavigate(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message ||
                      err.response?.data?.error ||
                      'Erreur de connexion';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { password } = form.getValues();
      const response = await api.post('/auth/login', {
        email: tempEmail,
        password,
        twoFactorToken: twoFactorCode,
        rememberMe
      }, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });

      saveTokensAndNavigate(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Code 2FA invalide');
    } finally {
      setLoading(false);
    }
  };

  const saveTokensAndNavigate = (data) => {
    // Save tokens - use 'token' comme clé principale pour cohérence avec api.js
    const authToken = data.accessToken || data.token;
    localStorage.setItem('token', authToken);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('expiresIn', data.expiresIn);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Update API default header
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  const handleBackToLogin = () => {
    setTwoFactorRequired(false);
    setTwoFactorCode('');
    setTempToken('');
    setError('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#1A1D21' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
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
          <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#EFEFEF' }}>E-Voting</h1>
          <p style={{ color: '#9CA3AF' }}>
            {twoFactorRequired ?
              'Authentification à deux facteurs' :
              'Connexion à votre espace administrateur'
            }
          </p>
        </div>

        {error && (
          <ErrorAlert
            error={error}
            actionHint={getErrorHint(error)}
            onDismiss={() => setError('')}
          />
        )}

        {!twoFactorRequired ? (
          // Formulaire de connexion classique
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
              autoFocus
            />

            <FormField
              name="password"
              label="Mot de passe"
              type="password"
              required
              {...form.getFieldProps('password')}
              error={form.errors.password}
              touched={form.touched.password}
              placeholder="••••••••"
            />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#74E2DE'
                }}
              />
              <label htmlFor="rememberMe" style={{
                fontSize: '14px',
                color: '#EFEFEF',
                cursor: 'pointer',
                margin: 0
              }}>
                Se souvenir de moi (30 jours)
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', background: '#74E2DE', color: '#1A1D21', fontWeight: '600', border: 'none' }}
              disabled={loading || !form.isSubmittable}
            >
              <LogIn size={18} />
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        ) : (
          // Formulaire 2FA
          <form onSubmit={handleTwoFactorSubmit}>
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Shield size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                    Vérification 2FA requise
                  </p>
                  <p style={{ fontSize: '14px' }}>
                    Entrez le code à 6 chiffres généré par votre application d'authentification
                  </p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Code 2FA</label>
              <input
                type="text"
                className="input"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                style={{
                  fontSize: '24px',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#EFEFEF',
                  border: '1px solid rgba(116, 226, 222, 0.3)'
                }}
              />
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
                Le code change toutes les 30 secondes
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '12px', background: '#74E2DE', color: '#1A1D21', fontWeight: '600', border: 'none' }}
              disabled={loading || twoFactorCode.length !== 6}
            >
              <Shield size={18} />
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="btn btn-secondary"
              style={{ width: '100%', background: 'transparent', color: '#EFEFEF', border: '1px solid rgba(116, 226, 222, 0.3)' }}
              disabled={loading}
            >
              Retour à la connexion
            </button>

            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(116, 226, 222, 0.1)', borderRadius: '8px', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
              <p style={{ fontSize: '13px', color: '#EFEFEF', marginBottom: '8px' }}>
                <strong>Vous avez perdu votre appareil ?</strong>
              </p>
              <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Utilisez un de vos codes de récupération à la place du code 2FA.
                Si vous n'avez plus accès à vos codes, contactez l'administrateur.
              </p>
            </div>
          </form>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', color: '#9CA3AF' }}>
          {!twoFactorRequired && (
            <>
              Pas encore de compte ?{' '}
              <Link to="/register" style={{ color: '#74E2DE', fontWeight: '600', textDecoration: 'none' }}>
                S'inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
