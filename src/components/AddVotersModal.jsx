import { useState, useCallback, useMemo, memo } from 'react';
import { X, UserPlus, Upload, Trash2 } from 'lucide-react';
import api from '../utils/api';

function AddVotersModal({ electionId, onClose, onSuccess }) {
  const [mode, setMode] = useState('manual'); // 'manual' ou 'csv'
  const [voters, setVoters] = useState([{ email: '', name: '', weight: 1.0 }]);
  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [duplicates, setDuplicates] = useState([]);
  const [invalid, setInvalid] = useState([]);

  const addVoterRow = useCallback(() => {
    setVoters(prev => [...prev, { email: '', name: '', weight: 1.0 }]);
  }, []);

  const removeVoterRow = useCallback((index) => {
    setVoters(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateVoter = useCallback((index, field, value) => {
    setVoters(prev => {
      const newVoters = [...prev];
      newVoters[index][field] = value;
      return newVoters;
    });
  }, []);

  const validVotersCount = useMemo(() => {
    return voters.filter(v => v.email && v.name).length;
  }, [voters]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setDuplicates([]);
    setInvalid([]);
    setLoading(true);

    try {
      // Filtrer les lignes vides
      const validVoters = voters.filter(v => v.email && v.name);

      if (validVoters.length === 0) {
        setError('Veuillez ajouter au moins un électeur avec email et nom');
        setLoading(false);
        return;
      }

      const response = await api.post(`/elections/${electionId}/voters`, {
        voters: validVoters
      });

      // Si au moins un électeur a été ajouté avec succès
      if (response.data.success) {
        setSuccessMessage(response.data.message);
        if (response.data.duplicates?.length > 0) {
          setDuplicates(response.data.duplicates);
        }

        // Attendre 2 secondes puis fermer et rafraîchir
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(response.data.message || 'Aucun électeur n\'a pu être ajouté');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'ajout des électeurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setDuplicates([]);
    setInvalid([]);
    setLoading(true);

    try {
      if (!csvFile) {
        setError('Veuillez sélectionner un fichier CSV');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await api.post(`/elections/${electionId}/voters/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Si au moins un électeur a été importé avec succès
      if (response.data.success) {
        setSuccessMessage(response.data.message);
        if (response.data.duplicates?.length > 0) {
          setDuplicates(response.data.duplicates);
        }
        if (response.data.invalid?.length > 0) {
          setInvalid(response.data.invalid);
        }

        // Attendre 2 secondes puis fermer et rafraîchir
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(response.data.message || 'Aucun électeur n\'a pu être importé');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const template = 'email,name,weight\nelecteur1@example.com,Jean Dupont,1.0\nelecteur2@example.com,Marie Martin,1.5';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_electeurs.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Ajouter des électeurs</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid var(--gray-200)' }}>
          <button
            onClick={() => setMode('manual')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              color: mode === 'manual' ? 'var(--primary)' : 'var(--gray-600)',
              borderBottom: mode === 'manual' ? '3px solid var(--primary)' : 'none',
              marginBottom: '-2px'
            }}
          >
            <UserPlus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Ajout manuel
          </button>
          <button
            onClick={() => setMode('csv')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              color: mode === 'csv' ? 'var(--primary)' : 'var(--gray-600)',
              borderBottom: mode === 'csv' ? '3px solid var(--primary)' : 'none',
              marginBottom: '-2px'
            }}
          >
            <Upload size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Import CSV
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <strong>Succès!</strong>
            <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{successMessage}</p>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            <strong>⚠️ Électeurs ignorés (doublons)</strong>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              {duplicates.join(', ')}
            </p>
          </div>
        )}

        {invalid.length > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            <strong>⚠️ Lignes invalides</strong>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              {invalid.length} ligne(s) ont été ignorées (email manquant)
            </p>
          </div>
        )}

        {/* Mode Manuel */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit}>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {voters.map((voter, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-start' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <input
                      type="email"
                      className="input"
                      placeholder="Email *"
                      value={voter.email}
                      onChange={(e) => updateVoter(index, 'email', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Nom *"
                      value={voter.name}
                      onChange={(e) => updateVoter(index, 'name', e.target.value)}
                      required
                    />
                  </div>
                  {voters.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVoterRow(index)}
                      className="btn btn-danger btn-sm"
                      style={{ marginTop: '0' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addVoterRow}
              className="btn btn-secondary"
              style={{ marginBottom: '20px', width: '100%' }}
            >
              <UserPlus size={18} />
              Ajouter une ligne
            </button>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Ajout en cours...' : `Ajouter ${validVotersCount} électeur(s)`}
              </button>
            </div>
          </form>
        )}

        {/* Mode CSV */}
        {mode === 'csv' && (
          <form onSubmit={handleCsvSubmit}>
            <div className="alert alert-info" style={{ marginBottom: '20px' }}>
              <div>
                <strong>Format du fichier CSV :</strong>
                <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                  <li>Colonnes : email, name, weight (optionnel)</li>
                  <li>Première ligne : en-têtes</li>
                  <li>Encodage : UTF-8</li>
                </ul>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="btn btn-sm btn-secondary"
                  style={{ marginTop: '10px' }}
                >
                  Télécharger un modèle
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Fichier CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="input"
                required
              />
              {csvFile && (
                <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--gray-600)' }}>
                  Fichier sélectionné : {csvFile.name}
                </p>
              )}
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Import en cours...' : 'Importer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Wrap avec React.memo pour éviter re-renders inutiles
export default memo(AddVotersModal);
