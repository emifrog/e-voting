import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, Mail, Play, StopCircle, BarChart3, Bell, UserPlus, QrCode, Shield, Webhook } from 'lucide-react';
import QuorumIndicator from '../components/QuorumIndicator';
import VotersTable from '../components/VotersTable';
import ElectionQRCode from '../components/ElectionQRCode';
import { useNotifications } from '../contexts/NotificationContext';

// Lazy load des modales pour optimiser les performances (-18 KB du bundle initial)
const AddVotersModal = lazy(() => import('../components/AddVotersModal'));
const QRCodeModal = lazy(() => import('../components/QRCodeModal'));

function ElectionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addLocalNotification, joinElection, leaveElection } = useNotifications();
  const [election, setElection] = useState(null);
  const [stats, setStats] = useState(null);
  const [voters, setVoters] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('voters');
  const [showAddVotersModal, setShowAddVotersModal] = useState(false);
  const [selectedVoterForQR, setSelectedVoterForQR] = useState(null);

  useEffect(() => {
    fetchElectionDetails();
    fetchVoters();

    // Rejoindre la room de l'élection pour les mises à jour temps réel
    joinElection(id);

    // Quitter la room à la déconnexion
    return () => {
      leaveElection(id);
    };
  }, [id, joinElection, leaveElection]);

  const fetchElectionDetails = async () => {
    try {
      const response = await api.get(`/elections/${id}`);
      setElection(response.data.election);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoters = async () => {
    try {
      const response = await api.get(`/elections/${id}/voters`);
      setVoters(response.data.voters);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await api.get(`/elections/${id}/results`);
      setResults(response.data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleStartElection = async () => {
    if (confirm('Démarrer cette élection ?')) {
      try {
        await api.post(`/elections/${id}/start`);
        fetchElectionDetails();
        addLocalNotification({
          type: 'success',
          title: 'Élection démarrée',
          message: `L'élection "${election.title}" a été démarrée avec succès`
        });
      } catch (error) {
        addLocalNotification({
          type: 'error',
          title: 'Erreur',
          message: error.response?.data?.error || 'Erreur lors du démarrage'
        });
      }
    }
  };

  const handleCloseElection = async () => {
    if (confirm('Clôturer cette élection ? Cette action est irréversible.')) {
      try {
        await api.post(`/elections/${id}/close`);
        fetchElectionDetails();
        addLocalNotification({
          type: 'info',
          title: 'Élection clôturée',
          message: `L'élection "${election.title}" a été clôturée`
        });
      } catch (error) {
        addLocalNotification({
          type: 'error',
          title: 'Erreur',
          message: error.response?.data?.error || 'Erreur lors de la clôture'
        });
      }
    }
  };

  const handleSendEmails = async () => {
    if (confirm(`Envoyer les emails de vote à ${voters.length} électeur(s) ?`)) {
      try {
        const response = await api.post(`/elections/${id}/voters/send-emails`);
        addLocalNotification({
          type: 'success',
          title: 'Emails envoyés',
          message: `${response.data.sentCount} email(s) d'invitation envoyé(s)`
        });
      } catch (error) {
        addLocalNotification({
          type: 'error',
          title: 'Erreur',
          message: 'Erreur lors de l\'envoi des emails'
        });
      }
    }
  };

  const handleSendReminders = async () => {
    const pendingVoters = voters.filter(v => !v.has_voted);
    if (confirm(`Envoyer un rappel à ${pendingVoters.length} électeur(s) ?`)) {
      try {
        const response = await api.post(`/elections/${id}/send-reminders`, {});
        addLocalNotification({
          type: 'success',
          title: 'Rappels envoyés',
          message: `${response.data.sentCount || response.data.message}`
        });
        // Rafraîchir les données après l'envoi
        fetchVoters();
        fetchElectionDetails();
      } catch (error) {
        console.error('Erreur envoi reminders:', error.response?.data || error.message);
        addLocalNotification({
          type: 'error',
          title: 'Erreur',
          message: error.response?.data?.error || 'Erreur lors de l\'envoi des rappels'
        });
      }
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div className="container">
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
          <ArrowLeft size={18} />
          Retour
        </button>

        <div className="card">
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>{election.title}</h1>
              <p style={{ color: '#6b7280' }}>{election.description}</p>
            </div>
            <span className={`badge badge-${election.status}`}>
              {election.status === 'draft' ? 'Brouillon' : election.status === 'active' ? 'En cours' : 'Terminé'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2" style={{ marginBottom: '30px', flexWrap: 'wrap' }}>
            {election.status === 'draft' && (
              <>
                <button onClick={() => setShowAddVotersModal(true)} className="btn btn-primary">
                  <UserPlus size={18} />
                  Ajouter des électeurs
                </button>
                <button onClick={handleStartElection} className="btn btn-success">
                  <Play size={18} />
                  Démarrer
                </button>
                <button onClick={handleSendEmails} className="btn btn-primary">
                  <Mail size={18} />
                  Envoyer les emails
                </button>
              </>
            )}
            {election.status === 'active' && (
              <>
                <button onClick={() => setActiveTab('qrcode')} className="btn btn-secondary">
                  <QrCode size={18} />
                  QR Code de Vote
                </button>
                <button onClick={handleCloseElection} className="btn btn-danger">
                  <StopCircle size={18} />
                  Clôturer
                </button>
                <button onClick={handleSendReminders} className="btn btn-secondary">
                  <Bell size={18} />
                  Envoyer rappels
                </button>
              </>
            )}
            {(election.status === 'active' || election.status === 'closed') && (
              <>
                <button onClick={() => { fetchResults(); setActiveTab('results'); }} className="btn btn-secondary">
                  <BarChart3 size={18} />
                  Aperçu résultats
                </button>
                <button onClick={() => navigate(`/elections/${id}/results`)} className="btn btn-primary">
                  <BarChart3 size={18} />
                  Résultats détaillés
                </button>
                <button onClick={() => navigate(`/elections/${id}/audit`)} className="btn btn-secondary">
                  <Shield size={18} />
                  Piste d'Audit
                </button>
                <button onClick={() => navigate(`/elections/${id}/webhooks`)} className="btn btn-secondary">
                  <Webhook size={18} />
                  Webhooks
                </button>
              </>
            )}
          </div>

          {/* Statistiques */}
          <div className="grid grid-2" style={{ marginBottom: '30px' }}>
            <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>Total électeurs</p>
              <h3 style={{ fontSize: '24px', color: '#111827' }}>{stats?.total_voters || 0}</h3>
            </div>
            <div style={{ background: '#dcfce7', padding: '16px', borderRadius: '8px' }}>
              <p style={{ color: '#166534', fontSize: '14px' }}>Ont voté</p>
              <h3 style={{ fontSize: '24px', color: '#166534' }}>
                {stats?.voted_count || 0}
                <span style={{ fontSize: '16px', marginLeft: '8px' }}>
                  ({stats?.total_voters > 0 ? Math.round((stats.voted_count / stats.total_voters) * 100) : 0}%)
                </span>
              </h3>
            </div>
          </div>

          {/* Indicateur de Quorum */}
          {election.settings?.quorum && election.settings.quorum.type !== 'none' && (
            <div style={{ marginBottom: '30px' }}>
              <QuorumIndicator
                electionId={id}
                refreshTrigger={stats?.voted_count}
              />
            </div>
          )}

          {/* Onglets - WCAG 2.1 Compliant Tabs */}
          <div
            role="tablist"
            aria-label="Navigation de l'élection"
            style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}
          >
            <button
              role="tab"
              id="tab-voters"
              aria-selected={activeTab === 'voters'}
              aria-controls="panel-voters"
              tabIndex={activeTab === 'voters' ? 0 : -1}
              onClick={() => setActiveTab('voters')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' && election.status === 'active') {
                  setActiveTab('qrcode');
                  setTimeout(() => document.getElementById('tab-qrcode')?.focus(), 0);
                } else if (e.key === 'ArrowRight' && (election.status === 'active' || election.status === 'closed')) {
                  setActiveTab('results');
                  setTimeout(() => document.getElementById('tab-results')?.focus(), 0);
                }
              }}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'voters' ? '2px solid #2563eb' : 'none',
                color: activeTab === 'voters' ? '#2563eb' : '#6b7280',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Électeurs
            </button>
            {election.status === 'active' && (
              <button
                role="tab"
                id="tab-qrcode"
                aria-selected={activeTab === 'qrcode'}
                aria-controls="panel-qrcode"
                tabIndex={activeTab === 'qrcode' ? 0 : -1}
                onClick={() => setActiveTab('qrcode')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    setActiveTab('voters');
                    setTimeout(() => document.getElementById('tab-voters')?.focus(), 0);
                  } else if (e.key === 'ArrowRight' && (election.status === 'active' || election.status === 'closed')) {
                    setActiveTab('results');
                    setTimeout(() => document.getElementById('tab-results')?.focus(), 0);
                  }
                }}
                style={{
                  padding: '12px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'qrcode' ? '2px solid #2563eb' : 'none',
                  color: activeTab === 'qrcode' ? '#2563eb' : '#6b7280',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                QR Code
              </button>
            )}
            {(election.status === 'active' || election.status === 'closed') && (
              <button
                role="tab"
                id="tab-results"
                aria-selected={activeTab === 'results'}
                aria-controls="panel-results"
                tabIndex={activeTab === 'results' ? 0 : -1}
                onClick={() => { fetchResults(); setActiveTab('results'); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    if (election.status === 'active') {
                      setActiveTab('qrcode');
                      setTimeout(() => document.getElementById('tab-qrcode')?.focus(), 0);
                    } else {
                      setActiveTab('voters');
                      setTimeout(() => document.getElementById('tab-voters')?.focus(), 0);
                    }
                  }
                }}
                style={{
                  padding: '12px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'results' ? '2px solid #2563eb' : 'none',
                  color: activeTab === 'results' ? '#2563eb' : '#6b7280',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Résultats
              </button>
            )}
          </div>

          {/* Contenu onglets - WCAG 2.1 Compliant Tab Panels */}
          <div
            role="tabpanel"
            id="panel-voters"
            aria-labelledby="tab-voters"
            hidden={activeTab !== 'voters'}
            style={{ display: activeTab === 'voters' ? 'block' : 'none' }}
          >
            {activeTab === 'voters' && (
              <VotersTable
                electionId={id}
                isWeighted={election.is_weighted}
                refreshTrigger={stats?.voted_count}
              />
            )}
          </div>

          {election.status === 'active' && (
            <div
              role="tabpanel"
              id="panel-qrcode"
              aria-labelledby="tab-qrcode"
              hidden={activeTab !== 'qrcode'}
              style={{ display: activeTab === 'qrcode' ? 'block' : 'none' }}
            >
              {activeTab === 'qrcode' && (
                <ElectionQRCode
                  electionId={id}
                  electionTitle={election.title}
                />
              )}
            </div>
          )}

          {(election.status === 'active' || election.status === 'closed') && (
            <div
              role="tabpanel"
              id="panel-results"
              aria-labelledby="tab-results"
              hidden={activeTab !== 'results'}
              style={{ display: activeTab === 'results' ? 'block' : 'none' }}
            >
              {activeTab === 'results' && results && (
            <div>
              <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                <strong>Participation:</strong> {results.stats.voted_count} / {results.stats.total_voters} électeurs ({results.stats.participation_rate}%)
              </div>

              <h3 style={{ marginBottom: '16px' }}>Résultats</h3>
              {results.results.results.map((result, index) => (
                <div key={index} style={{ marginBottom: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <strong>{result.option.option_text}</strong>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
                      {result.percentage}%
                    </span>
                  </div>
                  <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: '#2563eb',
                        height: '100%',
                        width: `${result.percentage}%`,
                        transition: 'width 0.5s ease'
                      }}
                    />
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                    {result.votes || result.approvals || 0} voix
                    {election.is_weighted && ` (poids: ${result.weight})`}
                  </p>
                </div>
              ))}
            </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedVoterForQR && (
        <Suspense fallback={<div className="loading"><div className="spinner"></div></div>}>
          <QRCodeModal
            voter={selectedVoterForQR}
            onClose={() => setSelectedVoterForQR(null)}
          />
        </Suspense>
      )}

      {showAddVotersModal && (
        <Suspense fallback={<div className="loading"><div className="spinner"></div></div>}>
          <AddVotersModal
            electionId={id}
            onClose={() => setShowAddVotersModal(false)}
            onSuccess={fetchVoters}
          />
        </Suspense>
      )}
    </div>
  );
}

export default ElectionDetails;
