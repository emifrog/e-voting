import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Shield,
  ArrowLeft,
  FileText,
  Users,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Database,
  Lock,
  Eye,
  Calendar,
  BarChart3,
  RefreshCw
} from 'lucide-react';

function GDPRCompliance() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, requests, consents, registry, statistics

  // Data states
  const [statistics, setStatistics] = useState(null);
  const [dataRequests, setDataRequests] = useState([]);
  const [processingRegistry, setProcessingRegistry] = useState([]);
  const [dataCategories, setDataCategories] = useState([]);
  const [retentionPolicy, setRetentionPolicy] = useState([]);

  // UI states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);

  useEffect(() => {
    loadGDPRData();
  }, []);

  const loadGDPRData = async () => {
    setLoading(true);
    try {
      // Load all GDPR data in parallel
      const [statsRes, requestsRes, registryRes, categoriesRes, retentionRes] = await Promise.all([
        api.get('/gdpr/compliance-statistics'),
        api.get('/gdpr/data-requests'),
        api.get('/gdpr/processing-registry'),
        api.get('/gdpr/data-categories'),
        api.get('/gdpr/retention-policy')
      ]);

      setStatistics(statsRes.data);
      setDataRequests(requestsRes.data.requests || []);
      setProcessingRegistry(registryRes.data.activities || []);
      setDataCategories(categoriesRes.data.categories || []);
      setRetentionPolicy(retentionRes.data.policies || []);
    } catch (error) {
      console.error('Error loading GDPR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnforceRetention = async () => {
    if (!confirm('Êtes-vous sûr de vouloir appliquer la politique de rétention ? Cette action anonymisera les données expirées.')) {
      return;
    }

    try {
      const response = await api.post('/gdpr/enforce-retention');
      alert(`Politique de rétention appliquée avec succès!\n\n${response.data.summary.join('\n')}`);
      loadGDPRData();
    } catch (error) {
      console.error('Error enforcing retention:', error);
      alert('Erreur lors de l\'application de la politique de rétention');
    }
  };

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    };

    switch (status) {
      case 'pending':
        return { ...baseStyle, background: '#fef3c7', color: '#92400e' };
      case 'in_progress':
        return { ...baseStyle, background: '#dbeafe', color: '#1e40af' };
      case 'completed':
        return { ...baseStyle, background: '#d1fae5', color: '#065f46' };
      case 'rejected':
        return { ...baseStyle, background: '#fee2e2', color: '#991b1b' };
      default:
        return { ...baseStyle, background: '#f3f4f6', color: '#374151' };
    }
  };

  const getRequestTypeLabel = (type) => {
    const labels = {
      access: 'Accès (Art. 15)',
      rectification: 'Rectification (Art. 16)',
      erasure: 'Effacement (Art. 17)',
      restriction: 'Limitation (Art. 18)',
      portability: 'Portabilité (Art. 20)',
      objection: 'Opposition (Art. 21)'
    };
    return labels[type] || type;
  };

  const getLegalBasisLabel = (basis) => {
    const labels = {
      consent: 'Consentement (Art. 6.1.a)',
      contract: 'Contrat (Art. 6.1.b)',
      legal_obligation: 'Obligation légale (Art. 6.1.c)',
      vital_interests: 'Intérêts vitaux (Art. 6.1.d)',
      public_interest: 'Intérêt public (Art. 6.1.e)',
      legitimate_interests: 'Intérêts légitimes (Art. 6.1.f)'
    };
    return labels[basis] || basis;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement des données GDPR...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ background: '#1A1D21', minHeight: '100vh', padding: '40px 20px' }}>
      {/* Header */}
      <header role="banner" style={{
        background: 'linear-gradient(135deg, #74E2DE 0%, #E58555 100%)',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '30px',
        color: '#1A1D21'
      }}>
        <div className="flex-between" style={{ marginBottom: '20px' }}>
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'rgba(26, 29, 33, 0.3)',
                border: 'none',
                color: '#1A1D21',
                padding: '8px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginBottom: '16px',
                fontWeight: '600'
              }}
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Retour
            </button>
            <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '700' }}>
              <Shield size={32} style={{ verticalAlign: 'middle', marginRight: '12px' }} aria-hidden="true" />
              Conformité GDPR/RGPD
            </h1>
            <p style={{ color: 'rgba(26, 29, 33, 0.9)', fontWeight: '500' }}>
              Gestion de la conformité au Règlement Général sur la Protection des Données
            </p>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div role="tablist" aria-label="Navigation de conformité GDPR" style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '30px',
        borderBottom: '2px solid rgba(116, 226, 222, 0.2)',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
          { id: 'requests', label: 'Demandes', icon: FileText },
          { id: 'registry', label: 'Registre', icon: Database },
          { id: 'retention', label: 'Rétention', icon: Calendar },
          { id: 'statistics', label: 'Statistiques', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? '#74E2DE' : 'transparent',
              color: activeTab === tab.id ? '#1A1D21' : '#9CA3AF',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={18} aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
          <div className="grid grid-2" style={{ marginBottom: '30px' }}>
            {/* Compliance Score */}
            <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#EFEFEF' }}>
                <CheckCircle size={20} color="#10b981" aria-hidden="true" />
                Score de conformité
              </h3>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#10b981' }}>
                  {statistics?.compliance_score || 0}%
                </div>
                <p style={{ color: '#9CA3AF', marginTop: '8px' }}>
                  Conformité globale GDPR
                </p>
              </div>
            </div>

            {/* Pending Requests */}
            <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#EFEFEF' }}>
                <Clock size={20} color="#E58555" aria-hidden="true" />
                Demandes en attente
              </h3>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#E58555' }}>
                  {statistics?.pending_requests || 0}
                </div>
                <p style={{ color: '#9CA3AF', marginTop: '8px' }}>
                  À traiter sous 30 jours
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ marginBottom: '30px', background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#EFEFEF' }}>Actions rapides</h3>
            <div className="grid grid-3">
              <button
                onClick={handleEnforceRetention}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <RefreshCw size={18} aria-hidden="true" />
                Appliquer la rétention
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <FileText size={18} aria-hidden="true" />
                Voir les demandes
              </button>
              <button
                onClick={() => alert('Génération de rapport PDF - À implémenter')}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <Download size={18} aria-hidden="true" />
                Rapport PDF
              </button>
            </div>
          </div>

          {/* Data Categories Overview */}
          <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#EFEFEF' }}>Catégories de données</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dataCategories.slice(0, 5).map(category => (
                <div key={category.id} style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${category.is_sensitive ? '#FC495F' : '#74E2DE'}`
                }}>
                  <div className="flex-between">
                    <div>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EFEFEF' }}>
                        {category.is_sensitive && <Lock size={16} color="#FC495F" aria-hidden="true" />}
                        {category.category_name}
                      </strong>
                      <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>
                        {category.description}
                      </p>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      background: 'rgba(116, 226, 222, 0.1)',
                      border: '1px solid rgba(116, 226, 222, 0.3)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#74E2DE'
                    }}>
                      {category.retention_period}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data Requests Tab */}
      {activeTab === 'requests' && (
        <div role="tabpanel" id="panel-requests" aria-labelledby="tab-requests">
          <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#EFEFEF' }}>
              Demandes des personnes concernées (Art. 15-22 GDPR)
            </h3>

            {dataRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <FileText size={48} style={{ margin: '0 auto 16px' }} aria-hidden="true" />
                <p>Aucune demande pour le moment</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>N° de demande</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Demandeur</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Échéance</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Statut</th>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataRequests.map(request => (
                      <tr key={request.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px' }}>
                          <strong>{request.request_number}</strong>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            background: '#f3f4f6',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}>
                            {getRequestTypeLabel(request.request_type)}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {request.requester_email}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {new Date(request.requested_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {new Date(request.deadline_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={getStatusBadgeStyle(request.status)}>
                            {request.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRequestDetails(true);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '14px' }}
                          >
                            <Eye size={14} aria-hidden="true" style={{ marginRight: '4px' }} />
                            Voir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing Registry Tab */}
      {activeTab === 'registry' && (
        <div role="tabpanel" id="panel-registry" aria-labelledby="tab-registry">
          <div className="card">
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
              Registre des activités de traitement (Art. 30 GDPR)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {processingRegistry.map(activity => (
                <div key={activity.id} className="card" style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb'
                }}>
                  <h4 style={{ fontSize: '16px', marginBottom: '12px', color: '#111827' }}>
                    {activity.activity_name}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Finalité
                      </strong>
                      <p style={{ fontSize: '14px' }}>{activity.purpose}</p>
                    </div>

                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Base légale
                      </strong>
                      <p style={{ fontSize: '14px' }}>{getLegalBasisLabel(activity.legal_basis)}</p>
                    </div>

                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Personnes concernées
                      </strong>
                      <p style={{ fontSize: '14px' }}>{activity.data_subjects}</p>
                    </div>

                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Durée de conservation
                      </strong>
                      <p style={{ fontSize: '14px' }}>{activity.retention_period}</p>
                    </div>
                  </div>

                  {activity.data_categories && activity.data_categories.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                        Catégories de données
                      </strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activity.data_categories.map((cat, idx) => (
                          <span key={idx} style={{
                            padding: '4px 8px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '6px',
                            fontSize: '12px'
                          }}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Retention Policy Tab */}
      {activeTab === 'retention' && (
        <div role="tabpanel" id="panel-retention" aria-labelledby="tab-retention">
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px' }}>
                Politique de rétention des données
              </h3>
              <button
                onClick={handleEnforceRetention}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={18} aria-hidden="true" />
                Appliquer maintenant
              </button>
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#92400e" aria-hidden="true" />
                <p style={{ color: '#92400e', fontSize: '14px' }}>
                  L'application de la politique de rétention anonymisera les données expirées de manière irréversible.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Catégorie</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Base légale</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Durée de conservation</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Sensible</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionPolicy.map(policy => (
                    <tr key={policy.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px' }}>
                        <strong>{policy.category_name}</strong>
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                        {policy.description}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          {getLegalBasisLabel(policy.legal_basis)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {policy.retention_period}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {policy.is_sensitive ? (
                          <Lock size={16} color="#ef4444" aria-hidden="true" />
                        ) : (
                          <span style={{ color: '#d1d5db' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div role="tabpanel" id="panel-statistics" aria-labelledby="tab-statistics">
          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Demandes par type</h3>
              {statistics?.requests_by_type ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(statistics.requests_by_type).map(([type, count]) => (
                    <div key={type} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <span>{getRequestTypeLabel(type)}</span>
                      <strong style={{ fontSize: '18px', color: '#6366f1' }}>{count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  Aucune donnée disponible
                </p>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Demandes par statut</h3>
              {statistics?.requests_by_status ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(statistics.requests_by_status).map(([status, count]) => (
                    <div key={status} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={getStatusBadgeStyle(status)}>{status}</span>
                      </div>
                      <strong style={{ fontSize: '18px', color: '#6366f1' }}>{count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  Aucune donnée disponible
                </p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Métriques de conformité</h3>
            <div className="grid grid-3">
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                  {statistics?.total_requests || 0}
                </div>
                <p style={{ color: '#6b7280', marginTop: '8px' }}>Total demandes</p>
              </div>

              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>
                  {statistics?.avg_response_time || 0}j
                </div>
                <p style={{ color: '#6b7280', marginTop: '8px' }}>Temps de réponse moyen</p>
              </div>

              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6366f1' }}>
                  {dataCategories.length}
                </div>
                <p style={{ color: '#6b7280', marginTop: '8px' }}>Catégories de données</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Details Modal (simplified) */}
      {showRequestDetails && selectedRequest && (
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
          zIndex: 1000
        }} onClick={() => setShowRequestDetails(false)}>
          <div className="card" style={{
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px' }}>Détails de la demande</h3>
              <button
                onClick={() => setShowRequestDetails(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
                aria-label="Fermer"
              >
                <XCircle size={24} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                  Numéro
                </strong>
                <p>{selectedRequest.request_number}</p>
              </div>

              <div>
                <strong style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                  Type de demande
                </strong>
                <p>{getRequestTypeLabel(selectedRequest.request_type)}</p>
              </div>

              <div>
                <strong style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                  Demandeur
                </strong>
                <p>{selectedRequest.requester_email}</p>
              </div>

              <div>
                <strong style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                  Statut
                </strong>
                <span style={getStatusBadgeStyle(selectedRequest.status)}>
                  {selectedRequest.status}
                </span>
              </div>

              {selectedRequest.details && (
                <div>
                  <strong style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                    Détails
                  </strong>
                  <p style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                    {selectedRequest.details}
                  </p>
                </div>
              )}

              {selectedRequest.response && (
                <div>
                  <strong style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
                    Réponse
                  </strong>
                  <p style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                    {selectedRequest.response}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GDPRCompliance;
