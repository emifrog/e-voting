import { AlertCircle, X, Info } from 'lucide-react';

/**
 * ErrorAlert Component
 * Displays detailed, contextual error messages with helpful information
 */
function ErrorAlert({ error, onDismiss, actionHint = null, details = null }) {
  if (!error) return null;

  // Extract error message
  let message = error;
  if (typeof error === 'object') {
    message = error.message || error.error || 'Une erreur est survenue';
  }

  // Determine error severity based on message
  const getSeverity = () => {
    if (message.includes('session') || message.includes('authentification')) {
      return 'warning';
    }
    if (message.includes('base de données') || message.includes('serveur')) {
      return 'critical';
    }
    return 'error';
  };

  const severity = getSeverity();
  const severityConfig = {
    error: { bg: '#fee2e2', border: '#fecaca', icon: '#dc2626', text: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#fcd34d', icon: '#d97706', text: '#92400e' },
    critical: { bg: '#fecaca', border: '#f87171', icon: '#b91c1c', text: '#7f1d1d' }
  };

  const config = severityConfig[severity];

  return (
    <div
      style={{
        background: config.bg,
        border: `2px solid ${config.border}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}
    >
      <AlertCircle
        size={20}
        style={{
          color: config.icon,
          flexShrink: 0,
          marginTop: '2px'
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: config.text,
            fontWeight: '600',
            marginBottom: '4px',
            wordBreak: 'break-word'
          }}
        >
          {message}
        </div>

        {/* Helpful hint */}
        {actionHint && (
          <div
            style={{
              fontSize: '13px',
              color: config.text,
              opacity: 0.8,
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Info size={14} />
            {actionHint}
          </div>
        )}

        {/* Additional details (for debugging) */}
        {details && (
          <div
            style={{
              fontSize: '12px',
              color: config.text,
              opacity: 0.7,
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: `1px solid ${config.border}`,
              fontFamily: 'monospace',
              maxHeight: '100px',
              overflowY: 'auto',
              wordBreak: 'break-all'
            }}
          >
            {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: config.icon,
            padding: '0',
            flexShrink: 0,
            display: 'flex'
          }}
          title="Fermer"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export default ErrorAlert;
