import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Plus, LogOut, BarChart3, Users, Clock, CheckCircle, Shield, Trash2 } from 'lucide-react';

function Dashboard({ setIsAuthenticated }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
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

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div className="container">
        <div className="flex-between" style={{ marginBottom: '30px' }}>
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
          <div className="flex gap-2">
            <button onClick={() => navigate('/security')} className="btn btn-secondary">
              <Shield size={18} />
              Sécurité
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-2" style={{ marginBottom: '30px' }}>
          <div className="card">
            <div className="flex-between">
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                  Total des votes
                </p>
                <h3 style={{ fontSize: '28px', color: '#111827' }}>{stats.total}</h3>
              </div>
              <BarChart3 size={32} color="#2563eb" />
            </div>
          </div>

          <div className="card">
            <div className="flex-between">
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                  Votes actifs
                </p>
                <h3 style={{ fontSize: '28px', color: '#10b981' }}>{stats.active}</h3>
              </div>
              <Clock size={32} color="#10b981" />
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
              <Users size={32} color="#6b7280" />
            </div>
          </div>

          <div className="card">
            <div className="flex-between">
              <div>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>
                  Terminés
                </p>
                <h3 style={{ fontSize: '28px', color: '#ef4444' }}>{stats.closed}</h3>
              </div>
              <CheckCircle size={32} color="#ef4444" />
            </div>
          </div>
        </div>

        {/* Liste des élections */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', color: '#111827' }}>Mes élections</h2>
            <button
              onClick={() => navigate('/elections/new')}
              className="btn btn-primary"
            >
              <Plus size={18} />
              Nouvelle élection
            </button>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
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
                {elections.map((election) => (
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
      </div>
    </div>
  );
}

export default Dashboard;
