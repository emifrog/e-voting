import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import api from '../utils/api';
import { CheckCircle, AlertCircle, Video, ExternalLink } from 'lucide-react';

function VotingPage() {
  const { token } = useParams();
  const [election, setElection] = useState(null);
  const [voter, setVoter] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedVote, setSelectedVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    fetchVotingInfo();
  }, [token]);

  const fetchVotingInfo = async () => {
    try {
      const response = await api.get(`/vote/${token}`);
      setElection(response.data.election);
      setVoter(response.data.voter);
      setOptions(response.data.options);

      // Initialiser le vote selon le type
      if (response.data.election.voting_type === 'approval') {
        setSelectedVote([]);
      } else if (response.data.election.voting_type === 'preference') {
        setSelectedVote([]);
      } else if (response.data.election.voting_type === 'list') {
        setSelectedVote({ listId: null, preferences: [] });
      } else {
        setSelectedVote(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedVote || (Array.isArray(selectedVote) && selectedVote.length === 0)) {
      setError('Veuillez faire un choix');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post(`/vote/${token}`, { vote: selectedVote });
      setSuccess(true);

      // Obtenir le reçu
      const receiptResponse = await api.get(`/vote/${token}/receipt`);
      setReceipt(receiptResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du vote');
    } finally {
      setSubmitting(false);
    }
  };

  const renderVotingInterface = () => {
    if (!election) return null;

    switch (election.voting_type) {
      case 'simple':
        return (
          <div>
            {options.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedVote(option.id)}
                style={{
                  padding: '16px',
                  border: `2px solid ${selectedVote === option.id ? '#74E2DE' : 'rgba(116, 226, 222, 0.2)'}`,
                  borderRadius: '8px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  background: selectedVote === option.id ? 'rgba(116, 226, 222, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="radio"
                    checked={selectedVote === option.id}
                    onChange={() => setSelectedVote(option.id)}
                    style={{ width: '20px', height: '20px', accentColor: '#74E2DE' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', marginBottom: '4px', color: '#EFEFEF' }}>
                      {option.option_text}
                    </strong>
                    {option.candidate_name && (
                      <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '4px' }}>
                        {option.candidate_name}
                      </p>
                    )}
                    {option.candidate_info && (
                      <p style={{ color: '#9CA3AF', fontSize: '13px' }}>
                        {option.candidate_info}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'approval':
        return (
          <div>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>
              Sélectionnez toutes les options que vous approuvez
            </p>
            {options.map((option) => (
              <div
                key={option.id}
                onClick={() => {
                  const newVote = selectedVote.includes(option.id)
                    ? selectedVote.filter(id => id !== option.id)
                    : [...selectedVote, option.id];
                  setSelectedVote(newVote);
                }}
                style={{
                  padding: '16px',
                  border: `2px solid ${selectedVote.includes(option.id) ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  background: selectedVote.includes(option.id) ? '#eff6ff' : 'white',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={selectedVote.includes(option.id)}
                    onChange={() => {}}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>{option.option_text}</strong>
                    {option.candidate_name && (
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        {option.candidate_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'preference':
        return (
          <div>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>
              Classez toutes les options par ordre de préférence (glissez-déposez ou cliquez)
            </p>
            {options.map((option, index) => {
              const position = selectedVote.indexOf(option.id);
              return (
                <div
                  key={option.id}
                  onClick={() => {
                    if (selectedVote.includes(option.id)) {
                      setSelectedVote(selectedVote.filter(id => id !== option.id));
                    } else {
                      setSelectedVote([...selectedVote, option.id]);
                    }
                  }}
                  style={{
                    padding: '16px',
                    border: `2px solid ${position >= 0 ? '#2563eb' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    marginBottom: '12px',
                    cursor: 'pointer',
                    background: position >= 0 ? '#eff6ff' : 'white',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {position >= 0 && (
                      <span style={{
                        background: '#2563eb',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>
                        {position + 1}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <strong>{option.option_text}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#1A1D21' }}>
        <div className="card" style={{ maxWidth: '600px', textAlign: 'center', background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
          <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 20px' }} />
          <h1 style={{ fontSize: '32px', marginBottom: '12px', color: '#EFEFEF' }}>
            Vote enregistré !
          </h1>
          <p style={{ color: '#9CA3AF', marginBottom: '30px' }}>
            {election.is_secret
              ? 'Votre vote a été enregistré de manière anonyme et sécurisée.'
              : 'Votre vote a été enregistré avec succès.'}
          </p>

          {receipt && (
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
              <h3 style={{ marginBottom: '12px', color: '#EFEFEF' }}>Reçu de vote</h3>
              <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                <strong>Élection:</strong> {receipt.election}<br />
                <strong>Votant:</strong> {receipt.voter_name}<br />
                <strong>Date:</strong> {new Date(receipt.voted_at).toLocaleString('fr-FR')}
              </p>
            </div>
          )}

          <div className="alert alert-info" style={{ background: 'rgba(116, 226, 222, 0.1)', border: '1px solid rgba(116, 226, 222, 0.3)', color: '#74E2DE' }}>
            Merci d'avoir participé à ce vote démocratique !
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#1A1D21' }}>
      <div className="container" style={{ maxWidth: '700px' }}>
        <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#EFEFEF' }}>
              🗳️ {election?.title}
            </h1>
            {election?.description && (
              <p style={{ color: '#9CA3AF' }}>{election.description}</p>
            )}
          </div>

          {/* Lien de visioconférence */}
          {election?.settings?.meeting && election.settings.meeting.url && (
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Video size={24} color="#2563eb" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    Réunion en direct disponible
                  </p>
                  <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                    Suivez le vote en visioconférence ({election.settings.meeting.platform === 'teams' ? 'Microsoft Teams' : election.settings.meeting.platform === 'zoom' ? 'Zoom' : 'Visioconférence'})
                  </p>
                  <a
                    href={election.settings.meeting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={16} />
                    Rejoindre la réunion
                  </a>
                  {election.settings.meeting.password && (
                    <p style={{ fontSize: '13px', marginTop: '8px', color: '#6b7280' }}>
                      <strong>Mot de passe:</strong> <code style={{ background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px' }}>{election.settings.meeting.password}</code>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px', background: 'rgba(252, 73, 95, 0.1)', border: '1px solid rgba(252, 73, 95, 0.3)', color: '#FC495F' }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {voter?.has_voted ? (
            <div className="alert alert-warning" style={{ background: 'rgba(229, 133, 85, 0.1)', border: '1px solid rgba(229, 133, 85, 0.3)', color: '#E58555' }}>
              Vous avez déjà voté à cette élection.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '30px' }}>
                <div className="alert alert-info" style={{ background: 'rgba(116, 226, 222, 0.1)', border: '1px solid rgba(116, 226, 222, 0.3)', color: '#74E2DE' }}>
                  <strong>Type de vote:</strong>{' '}
                  {election?.voting_type === 'simple' && 'Question simple'}
                  {election?.voting_type === 'approval' && 'Vote par approbation'}
                  {election?.voting_type === 'preference' && 'Vote par préférence'}
                  {election?.voting_type === 'list' && 'Scrutin de liste'}
                  <br />
                  <strong>Confidentialité:</strong>{' '}
                  {election?.is_secret ? 'Vote secret et anonyme' : 'Vote public'}
                </div>
              </div>

              {renderVotingInterface()}

              <button
                onClick={handleVoteSubmit}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '30px' }}
                disabled={submitting}
              >
                {submitting ? 'Envoi en cours...' : 'Confirmer mon vote'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VotingPage;
