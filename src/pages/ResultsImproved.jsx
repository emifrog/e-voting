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
  FileJson,
  CheckCircle,
  Clock,
  Trophy,
  Target,
  Sparkles
} from 'lucide-react';
import './ResultsImproved.css';

function ResultsImproved() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [id]);

  useEffect(() => {
    if (results) {
      // Trigger animations after data loads
      setTimeout(() => setAnimateIn(true), 100);
    }
  }, [results]);

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

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

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
      <div className="results-loading">
        <div className="results-loader">
          <div className="loader-circle"></div>
          <div className="loader-circle"></div>
          <div className="loader-circle"></div>
        </div>
        <p>Chargement des résultats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Erreur</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn-back">
            Retour
          </button>
        </div>
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
    <div className="results-container">
      {/* Background Gradient */}
      <div className="results-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className={`results-content ${animateIn ? 'animate-in' : ''}`}>
        {/* Header avec glassmorphism */}
        <div className="results-header">
          <button onClick={() => navigate(`/elections/${id}`)} className="btn-glass">
            <ArrowLeft size={20} />
            Retour
          </button>

          <div className="header-title">
            <div className="title-icon">
              <Trophy size={40} />
            </div>
            <div>
              <h1 className="main-title">Résultats de l'élection</h1>
              <p className="sub-title">{election.title}</p>
            </div>
          </div>

          <span className={`status-badge status-${election.status}`}>
            {election.status === 'closed' ? (
              <>
                <CheckCircle size={16} />
                Clôturé
              </>
            ) : (
              <>
                <Clock size={16} />
                En cours
              </>
            )}
          </span>
        </div>

        {/* Winner Podium */}
        <div className="winner-podium">
          <div className="podium-content">
            <div className="podium-trophy">
              <div className="trophy-glow"></div>
              <Trophy size={60} className="trophy-icon" />
            </div>
            <div className="podium-text">
              <p className="podium-label">Vainqueur</p>
              <h2 className="podium-winner">{winner.option.option_text}</h2>
              <div className="podium-stats">
                <span className="podium-percentage">{winner.percentage}%</span>
                <span className="podium-separator">•</span>
                <span className="podium-votes">{winner.votes || winner.approvals} votes</span>
              </div>
            </div>
            <div className="confetti-container">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="confetti" style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">
              <Users size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Participation</p>
              <h3 className="stat-value">{results.stats.participation_rate}%</h3>
              <p className="stat-detail">
                {results.stats.voted_count} / {results.stats.total_voters} électeurs
              </p>
              <div className="stat-bar">
                <div
                  className="stat-bar-fill stat-bar-primary"
                  style={{ width: `${results.stats.participation_rate}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-secondary">
            <div className="stat-icon">
              <TrendingUp size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total des votes</p>
              <h3 className="stat-value">{totalVotes}</h3>
              <p className="stat-detail">{results.results.results.length} options</p>
            </div>
          </div>

          <div className="stat-card stat-card-accent">
            <div className="stat-icon">
              <Target size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Taux de victoire</p>
              <h3 className="stat-value">{winner.percentage}%</h3>
              <p className="stat-detail">Option gagnante</p>
            </div>
          </div>
        </div>

        {/* Quorum Status */}
        {results.quorum && (
          <div className={`quorum-card ${results.quorum.reached ? 'quorum-reached' : 'quorum-pending'}`}>
            <div className="quorum-icon">
              {results.quorum.reached ? (
                <CheckCircle size={32} />
              ) : (
                <Clock size={32} />
              )}
            </div>
            <div className="quorum-content">
              <h3 className="quorum-title">
                Quorum {results.quorum.reached ? 'atteint' : 'non atteint'}
              </h3>
              <p className="quorum-detail">
                {results.quorum.current} / {results.quorum.required} requis
                <span className="quorum-type">
                  ({results.quorum.type === 'percentage' ? 'Pourcentage' :
                    results.quorum.type === 'absolute' ? 'Absolu' :
                    results.quorum.type === 'weighted' ? 'Pondéré' : 'Non défini'})
                </span>
              </p>
            </div>
            <div className="quorum-progress">
              <div
                className="quorum-progress-fill"
                style={{ width: `${(results.quorum.current / results.quorum.required) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="export-section">
          <div className="export-header">
            <Download size={24} />
            <h2>Exporter les résultats</h2>
          </div>
          <div className="export-buttons">
            <button
              onClick={() => handleExport('csv')}
              className="export-btn export-csv"
              disabled={exportLoading}
            >
              <FileSpreadsheet size={20} />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="export-btn export-excel"
              disabled={exportLoading}
            >
              <FileSpreadsheet size={20} />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="export-btn export-pdf"
              disabled={exportLoading}
            >
              <FileText size={20} />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="export-btn export-json"
              disabled={exportLoading}
            >
              <FileJson size={20} />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="detailed-results">
          <div className="section-header">
            <BarChart3 size={28} />
            <h2>Résultats détaillés</h2>
          </div>

          <div className="results-list">
            {results.results.results
              .sort((a, b) => (b.votes || b.approvals || 0) - (a.votes || a.approvals || 0))
              .map((result, index) => {
                const isWinner = result.option.id === winner.option.id;
                const voteCount = result.votes || result.approvals || 0;

                return (
                  <div
                    key={result.option.id}
                    className={`result-item ${isWinner ? 'result-winner' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="result-rank">
                      {index === 0 && <Trophy size={24} className="rank-trophy" />}
                      <span className="rank-number">#{index + 1}</span>
                    </div>

                    <div className="result-content">
                      <div className="result-header">
                        <div className="result-info">
                          <h3 className="result-title">{result.option.option_text}</h3>
                          {result.option.candidate_name && (
                            <p className="result-candidate">{result.option.candidate_name}</p>
                          )}
                        </div>
                        <div className="result-stats">
                          <div className="result-percentage">{result.percentage}%</div>
                          <div className="result-votes">{voteCount} vote{voteCount > 1 ? 's' : ''}</div>
                        </div>
                      </div>

                      <div className="result-progress-container">
                        <div className="result-progress-bg">
                          <div
                            className={`result-progress-bar ${isWinner ? 'progress-winner' : 'progress-default'}`}
                            style={{ width: `${result.percentage}%` }}
                          >
                            <div className="progress-shine"></div>
                          </div>
                        </div>
                      </div>

                      {election.is_weighted && result.weight !== undefined && (
                        <div className="result-weight">
                          <Sparkles size={14} />
                          <span>Poids total: {result.weight}</span>
                        </div>
                      )}
                    </div>

                    {isWinner && (
                      <div className="winner-badge">
                        <Award size={18} />
                        <span>Gagnant</span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Additional Information */}
        <div className="info-section">
          <h3 className="info-title">Informations complémentaires</h3>
          <div className="info-grid">
            <div className="info-item">
              <p className="info-label">Type de vote</p>
              <p className="info-value">
                {election.voting_type === 'simple' ? 'Question simple' :
                 election.voting_type === 'approval' ? 'Vote par approbation' :
                 election.voting_type === 'preference' ? 'Vote par préférence' :
                 election.voting_type === 'list' ? 'Scrutin de liste' : election.voting_type}
              </p>
            </div>
            <div className="info-item">
              <p className="info-label">Vote pondéré</p>
              <p className="info-value">{election.is_weighted ? 'Oui' : 'Non'}</p>
            </div>
            <div className="info-item">
              <p className="info-label">Vote secret</p>
              <p className="info-value">{election.is_secret ? 'Oui' : 'Non'}</p>
            </div>
            <div className="info-item">
              <p className="info-label">Dépouillement différé</p>
              <p className="info-value">{election.deferred_counting ? 'Oui' : 'Non'}</p>
            </div>
            <div className="info-item">
              <p className="info-label">Date de début</p>
              <p className="info-value">
                {election.scheduled_start ? new Date(election.scheduled_start).toLocaleString('fr-FR') : 'Non définie'}
              </p>
            </div>
            <div className="info-item">
              <p className="info-label">Date de fin</p>
              <p className="info-value">
                {election.scheduled_end ? new Date(election.scheduled_end).toLocaleString('fr-FR') : 'Non définie'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsImproved;
