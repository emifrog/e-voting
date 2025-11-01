import { useEffect, useState, memo } from 'react';
import { TrendingUp, CheckCircle, AlertCircle, Users } from 'lucide-react';
import api from '../utils/api';

function QuorumIndicator({ electionId, refreshTrigger }) {
  const [quorum, setQuorum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuorumStatus();

    // Refresh toutes les 10 secondes si l'élection est active
    const interval = setInterval(fetchQuorumStatus, 10000);
    return () => clearInterval(interval);
  }, [electionId, refreshTrigger]);

  const fetchQuorumStatus = async () => {
    try {
      const { data } = await api.get(`/quorum/${electionId}/status`);
      setQuorum(data);
      setError(null);
    } catch (err) {
      // Si le quorum n'est pas configuré, on n'affiche pas d'erreur
      if (err.response?.status === 404) {
        setQuorum(null);
      } else {
        setError('Erreur lors du chargement du quorum');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p style={{ color: 'var(--gray-500)' }}>Chargement du quorum...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        {error}
      </div>
    );
  }

  // Pas de quorum configuré
  if (!quorum || quorum.type === 'none') {
    return null;
  }

  const percentage = quorum.required > 0 ? (quorum.current / quorum.required) * 100 : 0;
  const isReached = quorum.reached;
  const remaining = Math.max(0, quorum.required - quorum.current);

  const getQuorumTypeLabel = (type) => {
    switch (type) {
      case 'percentage':
        return 'Pourcentage';
      case 'absolute':
        return 'Nombre absolu';
      case 'weighted':
        return 'Pondéré';
      default:
        return type;
    }
  };

  return (
    <div className={`card ${isReached ? 'border-success' : ''}`} style={{
      borderLeft: isReached ? '4px solid #10b981' : '4px solid #f59e0b'
    }}>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
          <Users size={24} color={isReached ? '#10b981' : '#f59e0b'} />
          <div>
            <h3 style={{ marginBottom: '4px' }}>
              Quorum {getQuorumTypeLabel(quorum.type)}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
              Seuil minimum de participation
            </p>
          </div>
        </div>

        {isReached ? (
          <CheckCircle size={32} color="#10b981" />
        ) : (
          <AlertCircle size={32} color="#f59e0b" />
        )}
      </div>

      {/* Barre de progression */}
      <div style={{
        background: 'var(--gray-200)',
        height: '32px',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: '12px'
      }}>
        <div style={{
          background: isReached ?
            'linear-gradient(90deg, #10b981, #059669)' :
            'linear-gradient(90deg, #f59e0b, #d97706)',
          height: '100%',
          width: `${Math.min(percentage, 100)}%`,
          transition: 'width 0.5s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
        <div style={{
          background: 'var(--gray-50)',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '4px' }}>
            Actuel
          </p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
            {quorum.type === 'percentage' ? `${quorum.current}%` : quorum.current}
          </p>
        </div>

        <div style={{
          background: 'var(--gray-50)',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '4px' }}>
            Requis
          </p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
            {quorum.type === 'percentage' ? `${quorum.required}%` : quorum.required}
          </p>
        </div>
      </div>

      {/* Statut */}
      {isReached ? (
        <div className="alert alert-success" style={{ marginBottom: 0 }}>
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <CheckCircle size={20} />
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                ✅ Quorum atteint !
              </p>
              <p style={{ fontSize: '13px' }}>
                Le scrutin est valide avec {quorum.current} {quorum.type === 'percentage' ? 'pourcent' : quorum.type === 'weighted' ? 'points de poids' : 'votes'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning" style={{ marginBottom: 0 }}>
          <div className="flex gap-2" style={{ alignItems: 'center' }}>
            <TrendingUp size={20} />
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                ⏳ Quorum non atteint
              </p>
              <p style={{ fontSize: '13px' }}>
                {remaining} {quorum.type === 'percentage' ? 'points de pourcentage' : quorum.type === 'weighted' ? 'points de poids' : 'votes'} manquant{remaining > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(QuorumIndicator);
