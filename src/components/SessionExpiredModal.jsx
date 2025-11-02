import { useEffect, useState } from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Modal component to warn user about session expiration
 * Shows 5-minute warning before expiration
 */
export function SessionExpiredModal({ isNearExpiry, onLogout, onExtendSession }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNearExpiry) return;

    // Calculate time left
    const expiresIn = parseInt(localStorage.getItem('expiresIn')) || 0;
    const now = Date.now();
    const diff = expiresIn - now;

    if (diff <= 0) {
      handleExpired();
      return;
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setTimeLeft({ minutes, seconds });

    // Update every second
    const interval = setInterval(() => {
      const newDiff = expiresIn - Date.now();
      if (newDiff <= 0) {
        handleExpired();
        clearInterval(interval);
        return;
      }

      const m = Math.floor(newDiff / 60000);
      const s = Math.floor((newDiff % 60000) / 1000);
      setTimeLeft({ minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(interval);
  }, [isNearExpiry]);

  const handleExpired = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresIn');
    localStorage.removeItem('user');

    navigate('/login', {
      state: { message: 'Votre session a expiré. Veuillez vous reconnecter.' }
    });
  };

  if (!isNearExpiry || !timeLeft) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <AlertTriangle size={48} color="#f59e0b" style={{ animation: 'pulse 2s infinite' }} />
        </div>

        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '8px',
          color: '#1f2937'
        }}>
          Votre session expire bientôt
        </h2>

        <p style={{
          color: '#6b7280',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          Votre session expirera dans:
        </p>

        <div style={{
          fontSize: '36px',
          fontWeight: '700',
          color: '#dc2626',
          marginBottom: '24px',
          fontFamily: 'monospace'
        }}>
          {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>

        <p style={{
          color: '#6b7280',
          marginBottom: '24px',
          fontSize: '13px'
        }}>
          Cliquez sur "Prolonger la session" pour rester connecté.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onExtendSession}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Prolonger
          </button>

          <button
            onClick={onLogout}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#f3f4f6',
              color: '#dc2626',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    </div>
  );
}

export default SessionExpiredModal;
