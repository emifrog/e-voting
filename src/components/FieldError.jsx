import { AlertCircle } from 'lucide-react';

/**
 * FieldError Component
 *
 * Displays inline validation error messages with WCAG accessibility.
 * Animated appearance for better UX.
 *
 * @param {Object} props
 * @param {string} props.error - Error message to display
 * @param {string} props.id - HTML id for aria-describedby linkage
 * @param {string} props.className - Additional CSS classes
 */
function FieldError({ error, id, className = '' }) {
  if (!error) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`field-error ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '6px',
        padding: '8px 12px',
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        color: '#991b1b',
        fontSize: '14px',
        animation: 'slideDown 0.2s ease-out'
      }}
    >
      <AlertCircle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
      <span>{error}</span>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .field-error {
          will-change: opacity, transform;
        }
      `}</style>
    </div>
  );
}

export default FieldError;
