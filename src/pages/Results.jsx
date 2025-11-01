import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  ArrowLeft,
  BarChart3,
  PieChart,
  Download,
  Users,
  TrendingUp,
  Award,
  FileText,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';

function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const [electionRes, resultsRes] = await Promise.all([
        api.get(`/elections/${id}`),
        api.get(`/elections/${id}/results`)
      ]);
      setElection(electionRes.data.election);
      setResults(resultsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExportLoading(true);
    try {
      const response = await api.get(`/elections/${id}/export/${format}`, {
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Définir le nom de fichier selon le format
      const extensions = {
        csv: 'csv',
        pdf: 'pdf',
        excel: 'xlsx',
        json: 'json'
      };
      link.setAttribute('download', `resultats-${election.title.replace(/\s+/g, '-')}.${extensions[format]}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'export');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  // Trouver le gagnant
  const winner = results.results.results.reduce((prev, current) =>
    (prev.votes || prev.approvals || 0) > (current.votes || current.approvals || 0) ? prev : current
  );

  // Calculer les statistiques
  const totalVotes = results.results.results.reduce((sum, r) => sum + (r.votes || r.approvals || 0), 0);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#004b89 ' }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        {/* Header */}
        <button
          onClick={() => navigate(`/elections/${id}`)}
          className="btn btn-secondary"
          style={{ marginBottom: '20px' }}
        >
          <ArrowLeft size={18} />
          Retour à l'élection
        </button>

        {/* Titre et statut */}
        <div className="card" style={{ marginBottom: '30px' }}>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>
                <BarChart3 size={32} style={{ display: 'inline', marginRight: '12px', verticalAlign: 'middle' }} />
                Résultats de l'élection
              </h1>
              <p style={{ fontSize: '18px', color: '#6b7280' }}>{election.title}</p>
            </div>
            <span className={`badge badge-${election.status}`} style={{ fontSize: '16px', padding: '8px 16px' }}>
              {election.status === 'closed' ? 'Clôturé' : 'En cours'}
            </span>
          </div>

          {/* Boutons d'export */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-secondary"
              disabled={exportLoading}
            >
              <FileSpreadsheet size={18} />
              Exporter CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="btn btn-secondary"
              disabled={exportLoading}
            >
              <FileSpreadsheet size={18} />
              Exporter Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="btn btn-secondary"
              disabled={exportLoading}
            >
              <FileText size={18} />
              Exporter PDF
            </button>
            <button
              onClick={() => handleExport('json')}
              className="btn btn-secondary"
              disabled={exportLoading}
            >
              <FileJson size={18} />
              Exporter JSON
            </button>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-3" style={{ marginBottom: '30px' }}>
          <div className="card" style={{ background: 'white' }}>
            <Users size={32} color="#6b7280" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Participation</p>
            <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>
              {results.stats.participation_rate}%
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {results.stats.voted_count} / {results.stats.total_voters} électeurs
            </p>
          </div>

          <div className="card" style={{ background: 'white' }}>
            <TrendingUp size={32} color="#2563eb" style={{ marginBottom: '12px' }} />
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Total votes</p>
            <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>
              {totalVotes}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              {results.results.results.length} option(s)
            </p>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: 'white' }}>
            <Award size={32} style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', marginBottom: '4px' }}>Gagnant</p>
            <h2 style={{ fontSize: '20px', marginBottom: '8px', fontWeight: 'bold' }}>
              {winner.option.option_text}
            </h2>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {winner.percentage}%
            </p>
          </div>
        </div>

        {/* Quorum Status */}
        {results.quorum && (
          <div className="card" style={{ marginBottom: '30px', borderLeft: `4px solid ${results.quorum.reached ? '#10b981' : '#ef4444'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: results.quorum.reached ? '#dcfce7' : '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {results.quorum.reached ? (
                  <span style={{ fontSize: '24px' }}>✅</span>
                ) : (
                  <span style={{ fontSize: '24px' }}>⏳</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>
                  Quorum: {results.quorum.reached ? 'Atteint' : 'Non atteint'}
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  {results.quorum.current} / {results.quorum.required} requis
                  ({results.quorum.type === 'percentage' ? 'Pourcentage' :
                    results.quorum.type === 'absolute' ? 'Absolu' :
                    results.quorum.type === 'weighted' ? 'Pondéré' : 'Non défini'})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Résultats détaillés */}
        <div className="card">
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>
            <PieChart size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Résultats détaillés
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
              <strong>Type de vote:</strong>{' '}
              {election.voting_type === 'simple' ? 'Question simple' :
               election.voting_type === 'approval' ? 'Vote par approbation' :
               election.voting_type === 'preference' ? 'Vote par préférence' :
               election.voting_type === 'list' ? 'Scrutin de liste' : election.voting_type}
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              <strong>Vote pondéré:</strong> {election.is_weighted ? 'Oui' : 'Non'}
            </p>
          </div>

          {results.results.results
            .sort((a, b) => (b.votes || b.approvals || 0) - (a.votes || a.approvals || 0))
            .map((result, index) => {
              const isWinner = result.option.id === winner.option.id;
              const voteCount = result.votes || result.approvals || 0;

              return (
                <div
                  key={result.option.id}
                  style={{
                    marginBottom: '20px',
                    padding: '20px',
                    background: isWinner ? '#fef3c7' : '#f9fafb',
                    borderRadius: '8px',
                    border: isWinner ? '2px solid #fbbf24' : '1px solid #e5e7eb',
                    position: 'relative'
                  }}
                >
                  {isWinner && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#fbbf24',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Award size={14} />
                      Gagnant
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>
                        #{index + 1} {result.option.option_text}
                      </h3>
                      {result.option.candidate_name && (
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                          {result.option.candidate_name}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>
                        {result.percentage}%
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {voteCount} vote{voteCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div style={{ background: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: isWinner ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #2563eb, #1e40af)',
                        height: '100%',
                        width: `${result.percentage}%`,
                        transition: 'width 0.5s ease'
                      }}
                    />
                  </div>

                  {/* Informations supplémentaires */}
                  {election.is_weighted && result.weight !== undefined && (
                    <div style={{ marginTop: '12px', padding: '8px', background: 'white', borderRadius: '4px' }}>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>
                        <strong>Poids total:</strong> {result.weight}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Informations supplémentaires */}
        <div className="card" style={{ marginTop: '30px', background: '#f0f9ff' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#1e40af' }}>
            Informations complémentaires
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Date de début</p>
              <p style={{ fontWeight: '500' }}>
                {election.scheduled_start ? new Date(election.scheduled_start).toLocaleString('fr-FR') : 'Non définie'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Date de fin</p>
              <p style={{ fontWeight: '500' }}>
                {election.scheduled_end ? new Date(election.scheduled_end).toLocaleString('fr-FR') : 'Non définie'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Vote secret</p>
              <p style={{ fontWeight: '500' }}>{election.is_secret ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Dépouillement différé</p>
              <p style={{ fontWeight: '500' }}>{election.deferred_counting ? 'Oui' : 'Non'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
