import { useState, useEffect, memo } from 'react';
import { Search, Edit2, Trash2, CheckCircle, XCircle, Mail, Weight } from 'lucide-react';
import api from '../utils/api';

function VotersTable({ electionId, isWeighted, refreshTrigger }) {
  const [voters, setVoters] = useState([]);
  const [filteredVoters, setFilteredVoters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'email', direction: 'asc' });
  const [editingVoter, setEditingVoter] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', name: '', weight: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVoters();
  }, [electionId, refreshTrigger]);

  useEffect(() => {
    // Filtrer les électeurs selon le terme de recherche
    const filtered = voters.filter(voter =>
      voter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voter.name && voter.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredVoters(filtered);
  }, [searchTerm, voters]);

  const fetchVoters = async () => {
    try {
      const response = await api.get(`/elections/${electionId}/voters`);
      setVoters(response.data.voters || []);
      setFilteredVoters(response.data.voters || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de chargement des électeurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sorted = [...filteredVoters].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      // Gérer les valeurs nulles
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      // Tri numérique pour weight et has_voted
      if (key === 'weight') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (key === 'has_voted') {
        return direction === 'asc' ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }

      // Tri alphabétique
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    setFilteredVoters(sorted);
  };

  const handleEdit = (voter) => {
    setEditingVoter(voter.id);
    setEditForm({
      email: voter.email,
      name: voter.name || '',
      weight: voter.weight || 1
    });
  };

  const handleCancelEdit = () => {
    setEditingVoter(null);
    setEditForm({ email: '', name: '', weight: 1 });
    setError('');
  };

  const handleSaveEdit = async (voterId) => {
    try {
      await api.put(`/elections/${electionId}/voters/${voterId}`, editForm);
      await fetchVoters();
      handleCancelEdit();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (voterId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet électeur ?')) {
      return;
    }

    try {
      await api.delete(`/elections/${electionId}/voters/${voterId}`);
      await fetchVoters();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  const handleResendInvite = async (voterId) => {
    try {
      await api.post(`/elections/${electionId}/voters/${voterId}/resend`);
      alert('Invitation renvoyée avec succès');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du renvoi');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const votedCount = voters.filter(v => v.has_voted).length;
  const notVotedCount = voters.length - votedCount;

  return (
    <div>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-3" style={{ marginBottom: '20px' }}>
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '4px' }}>Total électeurs</p>
          <h3 style={{ fontSize: '24px', color: '#111827' }}>{voters.length}</h3>
        </div>
        <div style={{ background: '#dcfce7', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: '#166534', fontSize: '14px', marginBottom: '4px' }}>Ont voté</p>
          <h3 style={{ fontSize: '24px', color: '#166534' }}>{votedCount}</h3>
        </div>
        <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: '#92400e', fontSize: '14px', marginBottom: '4px' }}>N'ont pas voté</p>
          <h3 style={{ fontSize: '24px', color: '#92400e' }}>{notVotedCount}</h3>
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6b7280'
            }}
          />
          <input
            type="text"
            placeholder="Rechercher par email ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Tableau des électeurs */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th
                onClick={() => handleSort('email')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: '600'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} />
                  Email
                  {sortConfig.key === 'email' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: '600'
                }}
              >
                Nom
                {sortConfig.key === 'name' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              {isWeighted && (
                <th
                  onClick={() => handleSort('weight')}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: '600'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Weight size={16} />
                    Poids
                    {sortConfig.key === 'weight' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              )}
              <th
                onClick={() => handleSort('has_voted')}
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: '600'
                }}
              >
                Statut
                {sortConfig.key === 'has_voted' && (
                  <span style={{ marginLeft: '6px' }}>
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredVoters.length === 0 ? (
              <tr>
                <td
                  colSpan={isWeighted ? 5 : 4}
                  style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}
                >
                  {searchTerm ? 'Aucun électeur trouvé' : 'Aucun électeur'}
                </td>
              </tr>
            ) : (
              filteredVoters.map((voter) => (
                <tr
                  key={voter.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: voter.has_voted ? '#f0fdf4' : 'white'
                  }}
                >
                  {editingVoter === voter.id ? (
                    <>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="input"
                          style={{ minWidth: '200px' }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="input"
                          style={{ minWidth: '150px' }}
                        />
                      </td>
                      {isWeighted && (
                        <td style={{ padding: '12px' }}>
                          <input
                            type="number"
                            value={editForm.weight}
                            onChange={(e) => setEditForm({ ...editForm, weight: parseFloat(e.target.value) })}
                            className="input"
                            min="0.1"
                            step="0.1"
                            style={{ width: '80px' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {voter.has_voted ? (
                          <CheckCircle size={20} color="#10b981" />
                        ) : (
                          <XCircle size={20} color="#ef4444" />
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleSaveEdit(voter.id)}
                            className="btn btn-sm btn-success"
                          >
                            Sauver
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn btn-sm btn-secondary"
                          >
                            Annuler
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={16} color="#6b7280" />
                          {voter.email}
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>
                        {voter.name || '-'}
                      </td>
                      {isWeighted && (
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            background: '#e5e7eb',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            {voter.weight}
                          </span>
                        </td>
                      )}
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {voter.has_voted ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#10b981' }}>
                            <CheckCircle size={20} />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>A voté</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#ef4444' }}>
                            <XCircle size={20} />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>En attente</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {!voter.has_voted && (
                            <>
                              <button
                                onClick={() => handleEdit(voter)}
                                className="btn btn-sm btn-secondary"
                                title="Éditer"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleResendInvite(voter.id)}
                                className="btn btn-sm btn-primary"
                                title="Renvoyer l'invitation"
                              >
                                <Mail size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(voter.id)}
                                className="btn btn-sm btn-danger"
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info footer */}
      <div style={{ marginTop: '16px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Affichage de {filteredVoters.length} électeur(s)
          {searchTerm && ` sur ${voters.length} au total`}
        </p>
      </div>
    </div>
  );
}

export default memo(VotersTable);
