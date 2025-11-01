import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { LogIn, Shield } from 'lucide-react';

function Login({ setIsAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      // Vérifier si 2FA est requis
      if (response.data.requires2FA) {
        setTwoFactorRequired(true);
        setTempToken(response.data.tempToken);
        setLoading(false);
        return;
      }

      // Login réussi sans 2FA
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/2fa/validate', {
        tempToken,
        code: twoFactorCode,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Code 2FA invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setTwoFactorRequired(false);
    setTwoFactorCode('');
    setTempToken('');
    setError('');
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
          <p style={{ color: '#6b7280' }}>
            {twoFactorRequired ?
              'Authentification à deux facteurs' :
              'Connexion à votre espace administrateur'
            }
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {!twoFactorRequired ? (
          // Formulaire de connexion classique
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label">Mot de passe</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
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
                  fontFamily: 'monospace'
                }}
              />
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                Le code change toutes les 30 secondes
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
              disabled={loading || twoFactorCode.length !== 6}
            >
              <Shield size={18} />
              {loading ? 'Vérification...' : 'Vérifier le code'}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="btn btn-secondary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              Retour à la connexion
            </button>

            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--gray-50)', borderRadius: '8px' }}>
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                <strong>Vous avez perdu votre appareil ?</strong>
              </p>
              <p style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                Utilisez un de vos codes de récupération à la place du code 2FA.
                Si vous n'avez plus accès à vos codes, contactez l'administrateur.
              </p>
            </div>
          </form>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', color: '#6b7280' }}>
          {!twoFactorRequired && (
            <>
              Pas encore de compte ?{' '}
              <Link to="/register" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}>
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
