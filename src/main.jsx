import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry, ErrorBoundary } from './config/sentry';

// Initialiser Sentry
initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={({ error, componentStack, resetError }) => (
        <div style={{
          padding: '2rem',
          maxWidth: '800px',
          margin: '2rem auto',
          backgroundColor: '#fee',
          borderRadius: '8px',
          border: '2px solid #c00'
        }}>
          <h1 style={{ color: '#c00' }}>Une erreur s'est produite</h1>
          <p>Nous nous excusons pour le désagrément. L'erreur a été automatiquement signalée à notre équipe.</p>
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Détails techniques</summary>
            <pre style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fff',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {error?.toString()}
              {componentStack}
            </pre>
          </details>
          <button
            onClick={resetError}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
        </div>
      )}
      showDialog
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
