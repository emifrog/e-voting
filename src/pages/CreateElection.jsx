import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, Plus, Trash2, Video } from 'lucide-react';

function CreateElection() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    voting_type: 'simple',
    is_secret: true,
    is_weighted: false,
    allow_anonymity: false,
    scheduled_start: '',
    scheduled_end: '',
    deferred_counting: false,
    max_voters: 10000,
    quorum_type: 'none',
    quorum_value: 50,
    enable_meeting: false,
    meeting_platform: 'teams',
    meeting_url: '',
    meeting_password: ''
  });

  const [options, setOptions] = useState([
    { option_text: '', candidate_name: '', candidate_info: '' },
    { option_text: '', candidate_name: '', candidate_info: '' }
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, { option_text: '', candidate_name: '', candidate_info: '' }]);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    const validOptions = options.filter(opt => opt.option_text.trim());
    if (validOptions.length < 2) {
      setError('Au moins 2 options sont requises');
      return;
    }

    setLoading(true);

    try {
      // Préparer les données avec quorum et meeting dans settings
      const {
        quorum_type,
        quorum_value,
        enable_meeting,
        meeting_platform,
        meeting_url,
        meeting_password,
        ...baseFormData
      } = formData;

      const electionData = {
        ...baseFormData,
        options: validOptions,
        settings: {
          quorum: quorum_type !== 'none' ? {
            type: quorum_type,
            value: parseFloat(quorum_value)
          } : null,
          meeting: enable_meeting ? {
            platform: meeting_platform,
            url: meeting_url.trim() || null,
            password: meeting_password.trim() || null
          } : null
        }
      };

      const response = await api.post('/elections', electionData);

      navigate(`/elections/${response.data.electionId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-secondary"
          style={{ marginBottom: '20px' }}
        >
          <ArrowLeft size={18} />
          Retour
        </button>

        <div className="card">
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Créer une nouvelle élection</h1>
          <p style={{ color: '#6b7280', marginBottom: '30px' }}>
            Configurez votre vote en ligne sécurisé
          </p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Informations de base */}
            <h3 style={{ marginBottom: '16px' }}>Informations générales</h3>

            <div className="form-group">
              <label className="label">Titre de l'élection *</label>
              <input
                type="text"
                name="title"
                className="input"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Ex: Élection du délégué de classe"
              />
            </div>

            <div className="form-group">
              <label className="label">Description</label>
              <textarea
                name="description"
                className="input"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Décrivez l'objectif de ce vote..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="label">Type de scrutin *</label>
              <select
                name="voting_type"
                className="input"
                value={formData.voting_type}
                onChange={handleChange}
              >
                <option value="simple">Question simple (un seul choix)</option>
                <option value="approval">Vote par approbation (plusieurs choix)</option>
                <option value="preference">Vote par ordre de préférence (classement)</option>
                <option value="list">Scrutin de liste</option>
              </select>
            </div>

            {/* Paramètres */}
            <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>Paramètres</h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_secret"
                  checked={formData.is_secret}
                  onChange={handleChange}
                />
                <span>Vote secret (ultra-sécurisé, anonyme)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_weighted"
                  checked={formData.is_weighted}
                  onChange={handleChange}
                />
                <span>Vote pondéré (poids différents par électeur)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="deferred_counting"
                  checked={formData.deferred_counting}
                  onChange={handleChange}
                />
                <span>Dépouillement différé (résultats après clôture)</span>
              </label>
            </div>

            <div className="grid grid-2" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="label">Démarrage planifié</label>
                <input
                  type="datetime-local"
                  name="scheduled_start"
                  className="input"
                  value={formData.scheduled_start}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="label">Clôture planifiée</label>
                <input
                  type="datetime-local"
                  name="scheduled_end"
                  className="input"
                  value={formData.scheduled_end}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Nombre maximum d'électeurs</label>
              <input
                type="number"
                name="max_voters"
                className="input"
                value={formData.max_voters}
                onChange={handleChange}
                min="1"
                max="30000"
              />
            </div>

            {/* Quorum */}
            <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>📊 Quorum</h3>

            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px' }}>
                Le quorum est le nombre minimum de votants requis pour que le scrutin soit valide.
              </p>
            </div>

            <div className="form-group">
              <label className="label">Type de quorum</label>
              <select
                name="quorum_type"
                className="input"
                value={formData.quorum_type}
                onChange={handleChange}
              >
                <option value="none">Aucun quorum</option>
                <option value="percentage">Pourcentage de participation</option>
                <option value="absolute">Nombre absolu de votants</option>
                <option value="weighted">Quorum pondéré (selon poids)</option>
              </select>
            </div>

            {formData.quorum_type !== 'none' && (
              <div className="form-group">
                <label className="label">
                  {formData.quorum_type === 'percentage' ?
                    'Pourcentage requis (%)' :
                    formData.quorum_type === 'absolute' ?
                    'Nombre de votes requis' :
                    'Poids total requis'}
                </label>
                <input
                  type="number"
                  name="quorum_value"
                  className="input"
                  value={formData.quorum_value}
                  onChange={handleChange}
                  min={formData.quorum_type === 'percentage' ? 1 : 1}
                  max={formData.quorum_type === 'percentage' ? 100 : undefined}
                  step={formData.quorum_type === 'weighted' ? 0.1 : 1}
                  placeholder={
                    formData.quorum_type === 'percentage' ? '50' :
                    formData.quorum_type === 'absolute' ? '100' :
                    '50.0'
                  }
                />
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                  {formData.quorum_type === 'percentage' &&
                    `Le scrutin sera valide si au moins ${formData.quorum_value}% des électeurs votent`}
                  {formData.quorum_type === 'absolute' &&
                    `Le scrutin sera valide si au moins ${formData.quorum_value} personnes votent`}
                  {formData.quorum_type === 'weighted' &&
                    `Le scrutin sera valide si le poids total des votes atteint ${formData.quorum_value}`}
                </p>
              </div>
            )}

            {/* Intégration Visioconférence */}
            <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>
              <Video size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
              Visioconférence
            </h3>

            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px' }}>
                Associez un lien de réunion Teams ou Zoom pour permettre aux électeurs et observateurs de suivre le vote en direct.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="enable_meeting"
                  checked={formData.enable_meeting}
                  onChange={handleChange}
                />
                <span>Activer l'intégration visioconférence</span>
              </label>
            </div>

            {formData.enable_meeting && (
              <>
                <div className="form-group">
                  <label className="label">Plateforme</label>
                  <select
                    name="meeting_platform"
                    className="input"
                    value={formData.meeting_platform}
                    onChange={handleChange}
                  >
                    <option value="teams">Microsoft Teams</option>
                    <option value="zoom">Zoom</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Lien de la réunion</label>
                  <input
                    type="url"
                    name="meeting_url"
                    className="input"
                    value={formData.meeting_url}
                    onChange={handleChange}
                    placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  />
                  <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '8px' }}>
                    Ce lien sera visible par tous les électeurs et observateurs
                  </p>
                </div>

                <div className="form-group">
                  <label className="label">Mot de passe de la réunion (optionnel)</label>
                  <input
                    type="text"
                    name="meeting_password"
                    className="input"
                    value={formData.meeting_password}
                    onChange={handleChange}
                    placeholder="Code d'accès si requis"
                  />
                </div>
              </>
            )}

            {/* Options */}
            <h3 style={{ marginTop: '30px', marginBottom: '16px' }}>Options de vote</h3>

            {options.map((option, index) => (
              <div key={index} className="card" style={{ marginBottom: '12px', background: '#f9fafb' }}>
                <div className="flex-between" style={{ marginBottom: '12px' }}>
                  <strong>Option {index + 1}</strong>
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="input"
                    value={option.option_text}
                    onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                    placeholder="Texte de l'option *"
                    required
                  />
                </div>

                <div className="form-group">
                  <input
                    type="text"
                    className="input"
                    value={option.candidate_name}
                    onChange={(e) => handleOptionChange(index, 'candidate_name', e.target.value)}
                    placeholder="Nom du candidat (optionnel)"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <textarea
                    className="input"
                    value={option.candidate_info}
                    onChange={(e) => handleOptionChange(index, 'candidate_info', e.target.value)}
                    placeholder="Informations supplémentaires (optionnel)"
                    rows="2"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addOption}
              className="btn btn-secondary"
              style={{ marginBottom: '20px' }}
            >
              <Plus size={18} />
              Ajouter une option
            </button>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Création...' : 'Créer l\'élection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateElection;
