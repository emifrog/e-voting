import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../utils/api';

function AuditTrail() {
  const { id: electionId } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    search: '',
    limit: 100,
    offset: 0
  });

  // Blockchain verification
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // Statistics
  const [stats, setStats] = useState(null);

  // Expandable details
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  // Export loading states
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, [electionId, filters.action, filters.user_id, filters.limit, filters.offset]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.user_id) params.append('user_id', filters.user_id);
      params.append('limit', filters.limit);
      params.append('offset', filters.offset);

      const { data } = await api.get(`/elections/${electionId}/audit-logs?${params}`);

      // Filter by search term on client side
      let filteredLogs = data.logs;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredLogs = data.logs.filter(log =>
          log.action.toLowerCase().includes(searchLower) ||
          log.id.toLowerCase().includes(searchLower) ||
          (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
        );
      }

      setLogs(filteredLogs);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get(`/elections/${electionId}/audit-logs/stats`);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const verifyBlockchain = async () => {
    try {
      setVerifying(true);
      setError('');

      const { data } = await api.get(`/elections/${electionId}/audit-logs/verify-chain`);
      setVerificationResult(data.verification);

      if (data.verification.valid) {
        setSuccess('✅ La chaîne d\'audit est intègre et n\'a pas été altérée');
      } else {
        setError('⚠️ La chaîne d\'audit a été compromise');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la vérification');
    } finally {
      setVerifying(false);
    }
  };

  const exportLogs = async (format) => {
    try {
      if (format === 'json') {
        setExportingJSON(true);
      } else if (format === 'csv') {
        setExportingCSV(true);
      } else if (format === 'pdf') {
        setExportingPDF(true);
      }

      setError('');

      // Handle PDF export client-side
      if (format === 'pdf') {
        exportToPDF();
        setSuccess('✅ Export PDF téléchargé avec succès');
        return;
      }

      const response = await api.get(
        `/elections/${electionId}/audit-logs/export?format=${format}&includeSignatures=true`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-logs-${electionId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`✅ Export ${format.toUpperCase()} téléchargé avec succès`);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'export');
    } finally {
      setExportingJSON(false);
      setExportingCSV(false);
      setExportingPDF(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Primary color
    doc.text('Piste d\'Audit - Élection', pageWidth / 2, 20, { align: 'center' });

    // Election ID
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`ID: ${electionId}`, pageWidth / 2, 30, { align: 'center' });

    // Date and time
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, 38, { align: 'center' });

    // Statistics section
    if (stats) {
      let yPos = 48;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('📊 Statistiques', 14, yPos);

      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);

      // Total logs
      doc.text(`Total d'événements: ${stats.totalLogs || 0}`, 20, yPos);
      yPos += 6;

      // Unique users
      doc.text(`Utilisateurs uniques: ${stats.uniqueUsers || 0}`, 20, yPos);
      yPos += 6;

      // Date range
      if (stats.dateRange && stats.dateRange.earliest && stats.dateRange.latest) {
        const earliest = new Date(stats.dateRange.earliest).toLocaleDateString('fr-FR');
        const latest = new Date(stats.dateRange.latest).toLocaleDateString('fr-FR');
        doc.text(`Période: ${earliest} - ${latest}`, 20, yPos);
        yPos += 6;
      }

      // Actions breakdown
      if (stats.actionsByType && Object.keys(stats.actionsByType).length > 0) {
        doc.text('Répartition par type:', 20, yPos);
        yPos += 5;
        Object.entries(stats.actionsByType).forEach(([action, count]) => {
          doc.setFontSize(9);
          doc.text(`  • ${action}: ${count}`, 24, yPos);
          yPos += 4;
        });
      }
    }

    // Audit Logs Table
    const tableStartY = stats ? 110 : 50;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('📋 Événements', 14, tableStartY);

    // Prepare table data
    const tableData = logs.map(log => [
      new Date(log.timestamp).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      log.action,
      log.user_name || log.user_email || 'Système',
      log.current_hash ? `${log.current_hash.substring(0, 12)}...` : 'N/A'
    ]);

    // Generate table
    doc.autoTable({
      startY: tableStartY + 6,
      head: [['Date/Heure', 'Action', 'Utilisateur', 'Hash']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235], // Primary color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 38 },  // Date/Time
        1: { cellWidth: 45 },  // Action
        2: { cellWidth: 50 },  // User
        3: { cellWidth: 45 }   // Hash
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 10, left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer with page number
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Page ${currentPage} / ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );

        // Security notice
        doc.setFontSize(7);
        doc.text(
          '🔒 Document sécurisé - Vérification blockchain disponible',
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }
    });

    // Blockchain verification section (if verification was done)
    if (verificationResult) {
      const finalY = doc.lastAutoTable.finalY + 10;

      if (finalY + 30 < pageHeight - 20) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('🔐 Vérification Blockchain', 14, finalY);

        doc.setFontSize(10);
        const statusColor = verificationResult.valid ? [5, 150, 105] : [220, 38, 38];
        doc.setTextColor(...statusColor);
        doc.text(
          verificationResult.valid ? '✓ Chaîne de hachage valide' : '✗ Échec de vérification',
          20,
          finalY + 8
        );

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9);
        doc.text(`Total vérifié: ${verificationResult.verified}/${verificationResult.total}`, 20, finalY + 14);

        if (!verificationResult.valid) {
          doc.text(`Échecs: ${verificationResult.failed}`, 20, finalY + 20);
        }
      }
    }

    // Save the PDF
    doc.save(`audit-trail-${electionId}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const toggleLogDetails = (logId) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getActionIcon = (action) => {
    if (action.includes('create')) return <FileText size={18} className="text-primary-500" />;
    if (action.includes('vote')) return <CheckCircle2 size={18} className="text-success-600" />;
    if (action.includes('close') || action.includes('end')) return <AlertCircle size={18} className="text-danger-500" />;
    return <Clock size={18} className="text-gray-500" />;
  };

  const getActionColor = (action) => {
    if (action.includes('create')) return 'text-primary-600';
    if (action.includes('vote')) return 'text-success-600';
    if (action.includes('close') || action.includes('end')) return 'text-danger-600';
    return 'text-gray-600';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get unique actions for filter dropdown
  const uniqueActions = [...new Set(logs.map(log => log.action))];

  if (loading && logs.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 24px', maxWidth: '1400px', background: '#1A1D21', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Shield size={32} style={{ color: '#74E2DE' }} />
          <h1 style={{ fontSize: '32px', margin: 0, color: '#EFEFEF' }}>Piste d'Audit</h1>
        </div>
        <p style={{ color: '#9CA3AF', fontSize: '15px' }}>
          Journal immuable des événements avec vérification blockchain
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '24px', background: 'rgba(252, 73, 95, 0.1)', border: '1px solid rgba(252, 73, 95, 0.3)', color: '#FC495F' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '24px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-2" style={{ marginBottom: '32px' }}>
          <div className="stat-card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <FileText size={24} style={{ color: '#74E2DE' }} />
              <div>
                <h3 style={{ fontSize: '28px', margin: 0, color: '#EFEFEF' }}>{stats.totalEntries}</h3>
                <p style={{ color: '#9CA3AF', margin: 0, fontSize: '14px' }}>Entrées totales</p>
              </div>
            </div>
          </div>

          <div className="stat-card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Clock size={24} style={{ color: '#10b981' }} />
              <div>
                <h3 style={{ fontSize: '16px', margin: 0, color: '#EFEFEF' }}>
                  {stats.dateRange.earliest && formatTimestamp(stats.dateRange.earliest).split(' ')[0]}
                </h3>
                <p style={{ color: '#9CA3AF', margin: 0, fontSize: '14px' }}>Premier événement</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="card" style={{ marginBottom: '24px', background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF'
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Rechercher dans les logs..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ paddingLeft: '40px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(116, 226, 222, 0.3)', color: '#EFEFEF' }}
            />
          </div>

          {/* Filter Button */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filtres
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* Verify Chain */}
          <button
            className="btn btn-primary"
            onClick={verifyBlockchain}
            disabled={verifying}
          >
            {verifying ? (
              <>
                <RefreshCw size={18} className="spin" />
                Vérification...
              </>
            ) : (
              <>
                <LinkIcon size={18} />
                Vérifier la Chaîne
              </>
            )}
          </button>

          {/* Export Buttons */}
          <button
            className="btn btn-secondary"
            onClick={() => exportLogs('json')}
            disabled={exportingJSON}
            aria-label="Exporter en JSON"
          >
            <Download size={18} />
            {exportingJSON ? 'Export...' : 'JSON'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => exportLogs('csv')}
            disabled={exportingCSV}
            aria-label="Exporter en CSV"
          >
            <Download size={18} />
            {exportingCSV ? 'Export...' : 'CSV'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => exportLogs('pdf')}
            disabled={exportingPDF}
            aria-label="Exporter en PDF"
          >
            <Download size={18} />
            {exportingPDF ? 'Export...' : 'PDF'}
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '2px solid var(--gray-100)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label className="label">Type d'Action</label>
              <select
                className="input"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value, offset: 0 })}
              >
                <option value="">Toutes les actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Nombre d'entrées</label>
              <select
                className="input"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), offset: 0 })}
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setFilters({ action: '', user_id: '', search: '', limit: 100, offset: 0 });
                  fetchAuditLogs();
                }}
                style={{ flex: 1 }}
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Verification Result */}
      {verificationResult && (
        <div className={`card ${verificationResult.valid ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            {verificationResult.valid ? (
              <CheckCircle2 size={32} style={{ color: 'var(--success-600)', flexShrink: 0 }} />
            ) : (
              <AlertCircle size={32} style={{ color: 'var(--danger-600)', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
                {verificationResult.valid ? 'Chaîne Intègre ✓' : 'Chaîne Compromise ✗'}
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                {verificationResult.checked} entrées vérifiées
              </p>

              {verificationResult.errors.length > 0 && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}>
                  <strong>Erreurs détectées :</strong>
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    {verificationResult.errors.map((err, idx) => (
                      <li key={idx}>{err.message} (Index: {err.index})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '20px', color: '#EFEFEF' }}>
          Chronologie des Événements ({logs.length})
        </h2>

        {logs.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#9CA3AF'
          }}>
            <Shield size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>Aucun événement d'audit trouvé</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '20px',
              top: '12px',
              bottom: '12px',
              width: '2px',
              background: 'rgba(116, 226, 222, 0.2)'
            }} />

            {/* Timeline entries */}
            {logs.map((log, index) => (
              <div
                key={log.id}
                style={{
                  position: 'relative',
                  marginBottom: index < logs.length - 1 ? '24px' : '0',
                  paddingLeft: '56px'
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '12px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'white',
                  border: '3px solid var(--primary-500)',
                  zIndex: 1
                }} />

                {/* Log entry */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid rgba(116, 226, 222, 0.2)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleLogDetails(log.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {getActionIcon(log.action)}
                      <span className={getActionColor(log.action)} style={{ fontWeight: 600 }}>
                        {log.action}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '13px',
                      color: 'var(--gray-500)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Clock size={14} />
                      {formatTimestamp(log.created_at)}
                    </span>
                  </div>

                  {/* Basic Info */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    fontSize: '13px',
                    color: 'var(--gray-600)'
                  }}>
                    {log.user_id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} />
                        <span>User: {log.user_id}</span>
                      </div>
                    )}
                    {log.ip_address && (
                      <div>IP: {log.ip_address}</div>
                    )}
                  </div>

                  {/* Expandable Details */}
                  {expandedLogs.has(log.id) && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--gray-200)',
                      fontSize: '13px'
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}>
                        <strong style={{ display: 'block', marginBottom: '8px' }}>Hash de l'entrée:</strong>
                        <code style={{
                          fontSize: '12px',
                          wordBreak: 'break-all',
                          color: 'var(--primary-600)'
                        }}>
                          {log.entry_hash}
                        </code>
                      </div>

                      {log.prev_hash && (
                        <div style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '8px'
                        }}>
                          <strong style={{ display: 'block', marginBottom: '8px' }}>Hash précédent:</strong>
                          <code style={{
                            fontSize: '12px',
                            wordBreak: 'break-all',
                            color: 'var(--gray-600)'
                          }}>
                            {log.prev_hash}
                          </code>
                        </div>
                      )}

                      {log.details && (
                        <div style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: '8px'
                        }}>
                          <strong style={{ display: 'block', marginBottom: '8px' }}>Détails:</strong>
                          <pre style={{
                            fontSize: '12px',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: 'var(--gray-500)'
                      }}>
                        ID: {log.id}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {logs.length > 0 && (
          <div style={{
            marginTop: '32px',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
              disabled={filters.offset === 0}
            >
              Précédent
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
              disabled={logs.length < filters.limit}
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Spinning animation for refresh icon */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default AuditTrail;
