import { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Password Strength Meter Component
 * Real-time password validation with visual feedback
 */
export function PasswordStrengthMeter({ password = '', onChange, name = 'password' }) {
  const [strength, setStrength] = useState({
    score: 0,
    level: 'Très faible',
    color: '#ef4444',
    errors: [],
    feedback: []
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        level: 'Très faible',
        color: '#ef4444',
        errors: [],
        feedback: []
      });
      return;
    }

    // Client-side validation
    const validation = validatePasswordClient(password);
    setStrength(validation);
  }, [password]);

  const validatePasswordClient = (pwd) => {
    const errors = [];
    const feedback = [];
    let score = 0;

    // Length check
    if (pwd.length < 12) {
      errors.push('Au moins 12 caractères');
    } else {
      score += 2;
      feedback.push('✓ Longueur suffisante');
    }

    // Uppercase
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Au moins une majuscule');
    } else {
      score += 1;
      feedback.push('✓ Majuscule');
    }

    // Lowercase
    if (!/[a-z]/.test(pwd)) {
      errors.push('Au moins une minuscule');
    } else {
      score += 1;
      feedback.push('✓ Minuscule');
    }

    // Numbers
    if (!/[0-9]/.test(pwd)) {
      errors.push('Au moins un chiffre');
    } else {
      score += 1;
      feedback.push('✓ Chiffre');
    }

    // Special characters
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      errors.push('Au moins un caractère spécial');
    } else {
      score += 1;
      feedback.push('✓ Caractère spécial');
    }

    // Get level
    let level, color;
    if (score < 3) {
      level = 'Très faible';
      color = '#ef4444';
    } else if (score < 5) {
      level = 'Faible';
      color = '#f97316';
    } else if (score < 7) {
      level = 'Moyen';
      color = '#eab308';
    } else if (score < 9) {
      level = 'Fort';
      color = '#84cc16';
    } else {
      level = 'Très fort';
      color = '#22c55e';
    }

    return {
      score: Math.min(10, Math.max(0, score)),
      level,
      color,
      errors,
      feedback
    };
  };

  const isValid = strength.errors.length === 0 && password.length > 0;

  return (
    <div className="password-strength-meter" style={{ marginBottom: '16px' }}>
      {/* Password Input with Toggle */}
      <div className="form-group">
        <label className="label" htmlFor={name}>
          Mot de passe
        </label>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <input
            id={name}
            type={showPassword ? 'text' : 'password'}
            name={name}
            className={`input ${isValid ? 'input-valid' : password ? 'input-invalid' : ''}`}
            value={password}
            onChange={onChange}
            placeholder="••••••••"
            required
            style={{
              paddingRight: '40px',
              borderColor: strength.color,
              backgroundColor: password ? 'rgba(255, 255, 255, 0.95)' : 'white'
            }}
            aria-label="Mot de passe"
            aria-describedby={password ? 'password-feedback' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="btn-icon"
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Strength Bar */}
      {password && (
        <>
          <div style={{ marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                Force du mot de passe
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: strength.color
              }}>
                {strength.level} ({strength.score}/10)
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  width: `${(strength.score / 10) * 100}%`,
                  height: '100%',
                  backgroundColor: strength.color,
                  transition: 'width 0.3s ease, background-color 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Feedback */}
          <div id="password-feedback" style={{ marginBottom: '12px' }}>
            {strength.feedback.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                {strength.feedback.map((item, idx) => (
                  <div key={idx} style={{
                    fontSize: '12px',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    <CheckCircle size={14} />
                    {item}
                  </div>
                ))}
              </div>
            )}

            {strength.errors.length > 0 && (
              <div>
                {strength.errors.map((error, idx) => (
                  <div key={idx} style={{
                    fontSize: '12px',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}>
                    <AlertCircle size={14} />
                    {error}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div style={{
            backgroundColor: '#f3f4f6',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#4b5563'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Exigences:</p>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Minimum 12 caractères</li>
              <li>Contient une majuscule (A-Z)</li>
              <li>Contient une minuscule (a-z)</li>
              <li>Contient un chiffre (0-9)</li>
              <li>Contient un caractère spécial (!@#$%^&*)</li>
            </ul>
          </div>
        </>
      )}

      {/* Inline Styles */}
      <style>{`
        input.input-valid {
          border-color: #22c55e !important;
          background-color: #f0fdf4 !important;
        }

        input.input-invalid {
          border-color: #ef4444 !important;
          background-color: #fef2f2 !important;
        }

        .btn-icon:hover {
          color: #374151 !important;
        }

        .password-strength-meter input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}

export default PasswordStrengthMeter;
