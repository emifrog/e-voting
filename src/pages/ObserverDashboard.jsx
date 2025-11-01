import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { Eye, Users, CheckCircle, Video, ExternalLink } from 'lucide-react';

function ObserverDashboard() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchObserverData();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchObserverData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchObserverData = async () => {
    try {
      const response = await api.get(`/observer/view/${token}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="card">
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <Eye size={48} color="#2563eb" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Tableau de bord observateur</h1>
            <p style={{ color: '#6b7280' }}>Suivi en temps réel</p>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '30px' }}>
            <strong>Élection:</strong> {data.election.title}<br />
            <strong>Observateur:</strong> {data.observer.name}<br />
            <strong>Statut:</strong> {data.election.status === 'active' ? 'En cours' : data.election.status}
          </div>

          {/* Lien de visioconférence */}
          {data.election.settings?.meeting && data.election.settings.meeting.url && (
            <div className="card" style={{ marginBottom: '30px', borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Video size={32} color="#2563eb" />
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                    Réunion en direct
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                    {data.election.settings.meeting.platform === 'teams' ? 'Microsoft Teams' :
                     data.election.settings.meeting.platform === 'zoom' ? 'Zoom' :
                     'Visioconférence'}
                  </p>
                  <a
                    href={data.election.settings.meeting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ExternalLink size={18} />
                    Rejoindre la réunion
                  </a>
                  {data.election.settings.meeting.password && (
                    <p style={{ fontSize: '13px', marginTop: '12px', color: '#6b7280' }}>
                      <strong>Mot de passe:</strong>{' '}
                      <code style={{
                        background: '#e5e7eb',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                      }}>
                        {data.election.settings.meeting.password}
                      </code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {data.observer.can_see_turnout && data.turnout && (
            <div>
              <h2 style={{ marginBottom: '16px', fontSize: '20px' }}>Taux de participation</h2>
              <div className="grid grid-2" style={{ marginBottom: '30px' }}>
                <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                  <Users size={32} color="#6b7280" style={{ marginBottom: '12px' }} />
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>Total électeurs</p>
                  <h3 style={{ fontSize: '28px' }}>{data.turnout.total_voters}</h3>
                </div>
                <div style={{ background: '#dcfce7', padding: '20px', borderRadius: '8px' }}>
                  <CheckCircle size={32} color="#166534" style={{ marginBottom: '12px' }} />
                  <p style={{ color: '#166534', fontSize: '14px' }}>Ont voté</p>
                  <h3 style={{ fontSize: '28px', color: '#166534' }}>
                    {data.turnout.voted_count}
                    <span style={{ fontSize: '16px', marginLeft: '8px' }}>
                      ({data.turnout.participation_rate}%)
                    </span>
                  </h3>
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '12px' }}>Progression</h3>
                <div style={{ background: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                      height: '100%',
                      width: `${data.turnout.participation_rate}%`,
                      transition: 'width 0.5s ease'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {!data.observer.can_see_turnout && (
            <div className="alert alert-warning">
              Vous n'avez pas accès aux statistiques de participation
            </div>
          )}

          <div style={{ marginTop: '30px', padding: '16px', background: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Cette page se rafraîchit automatiquement toutes les 30 secondes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ObserverDashboard;
