/**
 * Composant de chargement pour les pages lazy-loadées
 * Utilisé comme fallback dans les Suspense boundaries
 */
function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      {/* Spinner principal */}
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid white',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }} />

      {/* Texte de chargement */}
      <p style={{
        fontSize: '18px',
        fontWeight: '500',
        margin: '0 0 8px 0',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}>
        Chargement...
      </p>

      {/* Sous-texte */}
      <p style={{
        fontSize: '14px',
        opacity: 0.8,
        margin: 0
      }}>
        Préparation de l'interface
      </p>

      {/* Barre de progression animée */}
      <div style={{
        width: '200px',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '2px',
        marginTop: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          background: 'white',
          width: '40%',
          animation: 'progress 1.5s ease-in-out infinite'
        }} />
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

export default PageLoader;
