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
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#1A1D21' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <Eye size={48} color="#74E2DE" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#EFEFEF' }}>Tableau de bord observateur</h1>
            <p style={{ color: '#9CA3AF' }}>Suivi en temps réel</p>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '30px', background: 'rgba(116, 226, 222, 0.1)', border: '1px solid rgba(116, 226, 222, 0.3)', color: '#74E2DE' }}>
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
              <h2 style={{ marginBottom: '16px', fontSize: '20px', color: '#EFEFEF' }}>Taux de participation</h2>
              <div className="grid grid-2" style={{ marginBottom: '30px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
                  <Users size={32} color="#9CA3AF" style={{ marginBottom: '12px' }} />
                  <p style={{ color: '#9CA3AF', fontSize: '14px' }}>Total électeurs</p>
                  <h3 style={{ fontSize: '28px', color: '#EFEFEF' }}>{data.turnout.total_voters}</h3>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <CheckCircle size={32} color="#10b981" style={{ marginBottom: '12px' }} />
                  <p style={{ color: '#10b981', fontSize: '14px' }}>Ont voté</p>
                  <h3 style={{ fontSize: '28px', color: '#10b981' }}>
                    {data.turnout.voted_count}
                    <span style={{ fontSize: '16px', marginLeft: '8px' }}>
                      ({data.turnout.participation_rate}%)
                    </span>
                  </h3>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
                <h3 style={{ marginBottom: '12px', color: '#EFEFEF' }}>Progression</h3>
                <div style={{ background: 'rgba(255, 255, 255, 0.1)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: 'linear-gradient(90deg, #10b981, #74E2DE)',
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
            <div className="alert alert-warning" style={{ background: 'rgba(229, 133, 85, 0.1)', border: '1px solid rgba(229, 133, 85, 0.3)', color: '#E58555' }}>
              Vous n'avez pas accès aux statistiques de participation
            </div>
          )}

          <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', textAlign: 'center', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
            <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
              Cette page se rafraîchit automatiquement toutes les 30 secondes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ObserverDashboard;
