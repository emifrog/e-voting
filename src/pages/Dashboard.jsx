import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Plus, LogOut, BarChart3, Users, Clock, CheckCircle, Shield, Trash2, Search, X } from 'lucide-react';

function Dashboard({ setIsAuthenticated }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, draft, active, closed
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, title-asc, title-desc, participation-desc

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const response = await api.get('/elections');
      setElections(response.data.elections);
    } catch (error) {
      console.error('Erreur chargement élections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort elections
  const filteredElections = useMemo(() => {
    let filtered = elections;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(search) ||
        (e.description && e.description.toLowerCase().includes(search))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'title-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'participation-desc':
        sorted.sort((a, b) => {
          const aParticipation = a.total_voters > 0 ? (a.voted_count / a.total_voters) : 0;
          const bParticipation = b.total_voters > 0 ? (b.voted_count / b.total_voters) : 0;
          return bParticipation - aParticipation;
        });
        break;
      default:
        break;
    }

    return sorted;
  }, [elections, searchTerm, statusFilter, sortBy]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    // Dispatcher un événement pour synchroniser les onglets
    window.dispatchEvent(new Event('user-logout'));
    navigate('/login');
  };

  const handleDeleteElection = async (electionId, electionTitle) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer l'élection "${electionTitle}"?\n\nCette action est irréversible.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/elections/${electionId}`);
      // Mettre à jour la liste après suppression
      setElections(elections.filter(e => e.id !== electionId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'élection');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-draft',
      active: 'badge-active',
      closed: 'badge-closed'
    };
    const labels = {
      draft: 'Brouillon',
      active: 'En cours',
      closed: 'Terminé'
    };
    return <span className={`badge ${badges[status]}`}>{labels[status]}</span>;
  };

  const stats = {
    total: elections.length,
    active: elections.filter(e => e.status === 'active').length,
    draft: elections.filter(e => e.status === 'draft').length,
    closed: elections.filter(e => e.status === 'closed').length
  };

  const filteredStats = {
    total: filteredElections.length,
    active: filteredElections.filter(e => e.status === 'active').length,
    draft: filteredElections.filter(e => e.status === 'draft').length,
    closed: filteredElections.filter(e => e.status === 'closed').length
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div className="container">
        {/* Header with branding and navigation */}
        <header role="banner" style={{ marginBottom: '30px' }}>
          <div className="flex-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <img
                src="/logo-removebg.png"
                alt="E-Voting Logo"
                style={{
                  height: '60px',
                  objectFit: 'contain'
                }}
              />
              <div>
                <h1 style={{ fontSize: '32px', color: 'white', marginBottom: '8px' }}>
                  Tableau de bord
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Bienvenue, {user?.name}
                </p>
              </div>
            </div>
            <nav aria-label="Navigation principale" className="flex gap-2">
              <button onClick={() => navigate('/security')} className="btn btn-secondary" aria-label="Accéder à la sécurité">
                <Shield size={18} aria-hidden="true" />
              Sécurité
            </button>
            <button onClick={handleLogout} className="btn btn-secondary" aria-label="Se déconnecter">
              <LogOut size={18} aria-hidden="true" />
              Déconnexion
            </button>
            </nav>
          </div>
        </header>

        {/* Statistics section */}
        <section aria-labelledby="stats-heading" style={{ marginBottom: '30px' }}>
          <h2 id="stats-heading" className="sr-only">Statistiques des élections</h2>
          <div className="grid grid-2">
          <div className="card">
            <div className="flex-between">
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                  Total des votes
                </p>
                <h3 style={{ fontSize: '28px', color: '#111827' }}>{stats.total}</h3>
              </div>
              <BarChart3 size={32} color="var(--primary)" aria-hidden="true" />
            </div>
          </div>

          <div className="card">
            <div className="flex-between">
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                  Votes actifs
                </p>
                <h3 style={{ fontSize: '28px', color: 'var(--success-600)' }}>{stats.active}</h3>
              </div>
              <Clock size={32} color="var(--success-600)" aria-hidden="true" />
            </div>
          </div>

          <div className="card">
            <div className="flex-between">
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                  Brouillons
                </p>
                <h3 style={{ fontSize: '28px', color: '#6b7280' }}>{stats.draft}</h3>
              </div>
              <Users size={32} color="#6b7280" aria-hidden="true" />
            </div>
          </div>

          <div className="card">
            <div className="flex-between">
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                  Terminés
                </p>
                <h3 style={{ fontSize: '28px', color: 'var(--danger)' }}>{stats.closed}</h3>
              </div>
              <CheckCircle size={32} color="var(--danger)" aria-hidden="true" />
            </div>
          </div>
          </div>
        </section>

        {/* Elections list section */}
        <section aria-labelledby="elections-heading">
          <div className="card">
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h2 id="elections-heading" style={{ fontSize: '20px', color: '#111827' }}>Mes élections</h2>
            <button
              onClick={() => navigate('/elections/new')}
              className="btn btn-primary"
            >
              <Plus size={18} aria-hidden="true" />
              Nouvelle élection
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '16px',
            marginBottom: '20px',
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }}
              />
              <label htmlFor="search-elections" className="sr-only">
                Rechercher une élection
              </label>
              <input
                id="search-elections"
                type="text"
                placeholder="Rechercher par titre ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Rechercher une élection par titre ou description"
                className="input"
                style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Effacer la recherche"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillons</option>
                <option value="active">En cours</option>
                <option value="closed">Terminés</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="date-desc">Date (récent → ancien)</option>
                <option value="date-asc">Date (ancien → récent)</option>
                <option value="title-asc">Titre (A → Z)</option>
                <option value="title-desc">Titre (Z → A)</option>
                <option value="participation-desc">Participation (haute → basse)</option>
              </select>
            </div>
          </div>

          {/* Results count - Live region for search results */}
          {elections.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
              }}
            >
              {searchTerm || statusFilter !== 'all'
                ? `${filteredStats.total} résultat(s) trouvé(s) sur ${stats.total} élection(s)`
                : `${stats.total} élection(s) au total`}
            </div>
          )}

          {loading ? (
            <div className="loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <span className="sr-only">Chargement des élections en cours...</span>
            </div>
          ) : elections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>Aucune élection créée pour le moment</p>
              <button
                onClick={() => navigate('/elections/new')}
                className="btn btn-primary"
                style={{ marginTop: '20px' }}
              >
                <Plus size={18} />
                Créer ma première élection
              </button>
            </div>
          ) : filteredElections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>Aucune élection ne correspond à vos critères de recherche</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSortBy('date-desc');
                }}
                className="btn btn-secondary"
                style={{ marginTop: '20px' }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Électeurs</th>
                  <th>Participation</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredElections.map((election) => (
                  <tr key={election.id}>
                    <td>
                      <strong>{election.title}</strong>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {election.voting_type}
                    </td>
                    <td>{getStatusBadge(election.status)}</td>
                    <td>{election.total_voters || 0}</td>
                    <td>
                      {election.total_voters > 0
                        ? `${election.voted_count} / ${election.total_voters} (${Math.round((election.voted_count / election.total_voters) * 100)}%)`
                        : '-'}
                    </td>
                    <td style={{ fontSize: '13px', color: '#6b7280' }}>
                      {new Date(election.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => navigate(`/elections/${election.id}`)}
                          className="btn btn-sm btn-primary"
                        >
                          Gérer
                        </button>
                        {election.status === 'closed' && (
                          <button
                            onClick={() => handleDeleteElection(election.id, election.title)}
                            className="btn btn-sm btn-danger"
                            title="Supprimer cette élection"
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '14px'
                            }}
                          >
                            <Trash2 size={16} />
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
