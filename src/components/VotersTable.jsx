import { useState, useEffect, memo, useCallback } from 'react';
import { Search, Edit2, Trash2, CheckCircle, XCircle, Mail, Weight } from 'lucide-react';
import api from '../utils/api';
import PaginationControls from './PaginationControls';

function VotersTable({ electionId, isWeighted, refreshTrigger }) {
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Data state
  const [voters, setVoters] = useState([]);
  const [totalVoters, setTotalVoters] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // UI state
  const [editingVoter, setEditingVoter] = useState(null);
  const [editForm, setEditForm] = useState({ email: '', name: '', weight: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bulk operations state
  const [selectedVoterIds, setSelectedVoterIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkWeightModal, setShowBulkWeightModal] = useState(false);
  const [bulkWeight, setBulkWeight] = useState('1');

  // Fetch voters with pagination
  const fetchVoters = useCallback(async (pageNum = 1, limit = pageSize, search = '', sort = 'created_at', dir = 'desc') => {
    try {
      setLoading(true);
      const response = await api.get(`/elections/${electionId}/voters`, {
        params: {
          page: pageNum,
          limit,
          search: search.trim(),
          sort,
          direction: dir
        }
      });

      setVoters(response.data.voters || []);
      setTotalVoters(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.totalPages || 0);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de chargement des électeurs');
    } finally {
      setLoading(false);
    }
  }, [electionId, pageSize]);

  // Initial load and refresh trigger
  useEffect(() => {
    setPage(1);
    setSelectedVoterIds(new Set()); // Clear selection on refresh
    fetchVoters(1, pageSize, searchTerm, sortConfig.key, sortConfig.direction);
  }, [electionId, refreshTrigger]);

  // Handle search changes
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
    setSelectedVoterIds(new Set()); // Clear selection on search
    fetchVoters(1, pageSize, value, sortConfig.key, sortConfig.direction);
  }, [pageSize, sortConfig, fetchVoters]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
    setSelectedVoterIds(new Set()); // Clear selection on page change
    fetchVoters(newPage, pageSize, searchTerm, sortConfig.key, sortConfig.direction);
  }, [pageSize, searchTerm, sortConfig, fetchVoters]);

  // Handle page size change
  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
    setSelectedVoterIds(new Set()); // Clear selection on page size change
    fetchVoters(1, newSize, searchTerm, sortConfig.key, sortConfig.direction);
  }, [searchTerm, sortConfig, fetchVoters]);

  // Handle sort
  const handleSort = useCallback((key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newSort = { key, direction };
    setSortConfig(newSort);
    setPage(1); // Reset to first page on sort
    fetchVoters(1, pageSize, searchTerm, key, direction);
  }, [pageSize, searchTerm, sortConfig, fetchVoters]);

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

  // Bulk operations handlers
  const handleSelectVoter = (voterId) => {
    const newSelected = new Set(selectedVoterIds);
    if (newSelected.has(voterId)) {
      newSelected.delete(voterId);
    } else {
      newSelected.add(voterId);
    }
    setSelectedVoterIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedVoterIds.size === voters.length) {
      setSelectedVoterIds(new Set());
    } else {
      setSelectedVoterIds(new Set(voters.map(v => v.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVoterIds.size === 0) {
      setError('Sélectionnez au moins un électeur');
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedVoterIds.size} électeur(s) ?`)) {
      return;
    }

    try {
      setBulkLoading(true);
      await api.post(`/elections/${electionId}/voters/bulk-delete`, {
        voterIds: Array.from(selectedVoterIds)
      });
      setSelectedVoterIds(new Set());
      await fetchVoters();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression en masse');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUpdateWeight = async () => {
    if (selectedVoterIds.size === 0) {
      setError('Sélectionnez au least un électeur');
      return;
    }

    const weightNum = parseFloat(bulkWeight);
    if (isNaN(weightNum) || weightNum < 0) {
      setError('Poids doit être un nombre positif');
      return;
    }

    try {
      setBulkLoading(true);
      await api.put(`/elections/${electionId}/voters/bulk-update`, {
        voterIds: Array.from(selectedVoterIds),
        weight: weightNum
      });
      setSelectedVoterIds(new Set());
      setShowBulkWeightModal(false);
      setBulkWeight('1');
      await fetchVoters();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la mise à jour en masse');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkResend = async () => {
    if (selectedVoterIds.size === 0) {
      setError('Sélectionnez au least un électeur');
      return;
    }

    try {
      setBulkLoading(true);
      const response = await api.post(`/elections/${electionId}/voters/bulk-resend`, {
        voterIds: Array.from(selectedVoterIds)
      });
      alert(`${response.data.sentCount} invitation(s) renvoyée(s)`);
      setSelectedVoterIds(new Set());
      await fetchVoters();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du renvoi');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      const response = await api.post(
        `/elections/${electionId}/voters/bulk-export-csv`,
        {
          voterIds: selectedVoterIds.size > 0 ? Array.from(selectedVoterIds) : []
        },
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `electeurs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'export');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Variable utilisée pour afficher le statut dans les statistiques

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
          <h3 style={{ fontSize: '24px', color: '#111827' }}>{totalVoters}</h3>
        </div>
        <div style={{ background: '#dcfce7', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: '#166534', fontSize: '14px', marginBottom: '4px' }}>Ont voté</p>
          <h3 style={{ fontSize: '24px', color: '#166534' }}>{voters.filter(v => v.has_voted).length}</h3>
        </div>
        <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: '#92400e', fontSize: '14px', marginBottom: '4px' }}>N'ont pas voté</p>
          <h3 style={{ fontSize: '24px', color: '#92400e' }}>{voters.filter(v => !v.has_voted).length}</h3>
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
            onChange={(e) => handleSearch(e.target.value)}
            disabled={loading}
            className="input"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {selectedVoterIds.size > 0 && (
        <div style={{
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong>{selectedVoterIds.size} électeur(s) sélectionné(s)</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleBulkExport}
              className="btn btn-sm btn-secondary"
              disabled={bulkLoading}
              title="Exporter en CSV"
            >
              📥 Exporter
            </button>
            {isWeighted && (
              <button
                onClick={() => setShowBulkWeightModal(true)}
                className="btn btn-sm btn-primary"
                disabled={bulkLoading}
                title="Mettre à jour le poids"
              >
                ⚖️ Poids
              </button>
            )}
            <button
              onClick={handleBulkResend}
              className="btn btn-sm btn-primary"
              disabled={bulkLoading}
              title="Renvoyer les invitations"
            >
              ✉️ Renvoyer
            </button>
            <button
              onClick={handleBulkDelete}
              className="btn btn-sm btn-danger"
              disabled={bulkLoading}
              title="Supprimer"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Bulk weight update modal */}
      {showBulkWeightModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
          }}>
            <h3 style={{ marginTop: 0 }}>Mettre à jour le poids</h3>
            <p style={{ color: '#6b7280' }}>
              Appliquer le poids à {selectedVoterIds.size} électeur(s)
            </p>
            <input
              type="number"
              value={bulkWeight}
              onChange={(e) => setBulkWeight(e.target.value)}
              className="input"
              placeholder="Entrez le poids"
              min="0"
              step="0.1"
              style={{ marginBottom: '16px', width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowBulkWeightModal(false)}
                className="btn btn-sm btn-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleBulkUpdateWeight}
                className="btn btn-sm btn-success"
                disabled={bulkLoading}
              >
                {bulkLoading ? 'Mise à jour...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des électeurs */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', width: '50px' }}>
                <input
                  type="checkbox"
                  checked={selectedVoterIds.size === voters.length && voters.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  title="Sélectionner tout"
                />
              </th>
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
            {voters.length === 0 ? (
              <tr>
                <td
                  colSpan={isWeighted ? 6 : 5}
                  style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}
                >
                  {searchTerm ? 'Aucun électeur trouvé' : 'Aucun électeur'}
                </td>
              </tr>
            ) : (
              voters.map((voter) => (
                <tr
                  key={voter.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: selectedVoterIds.has(voter.id) ? '#dbeafe' : (voter.has_voted ? '#f0fdf4' : 'white')
                  }}
                >
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedVoterIds.has(voter.id)}
                      onChange={() => handleSelectVoter(voter.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </td>
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

      {/* Pagination controls */}
      <div style={{ marginTop: '16px' }}>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          total={totalVoters}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={loading}
        />
      </div>
    </div>
  );
}

export default memo(VotersTable);
