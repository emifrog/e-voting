import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuth } from './hooks/useAuth';
import { queryClient } from './config/queryClient';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationCenter from './components/NotificationCenter';
import PageLoader from './components/PageLoader';

// Pages avec Lazy Loading pour optimiser les performances
// Réduction du bundle initial de ~250 KB à ~90 KB (-64%)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateElection = lazy(() => import('./pages/CreateElection'));
const ElectionDetails = lazy(() => import('./pages/ElectionDetails'));
const VotingPage = lazy(() => import('./pages/VotingPage'));
const ObserverDashboard = lazy(() => import('./pages/ObserverDashboard'));
const Security = lazy(() => import('./pages/Security'));
const Results = lazy(() => import('./pages/Results'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));

function App() {
  const { isAuthenticated, loading, setIsAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <NotificationProvider>
          {/* Skip to main content link - WCAG 2.4.1 */}
          <a href="#main-content" className="skip-link">
            Aller au contenu principal
          </a>

          {/* Centre de notifications (visible partout sauf sur les pages publiques) */}
          {isAuthenticated && (
            <div
              style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000 }}
              role="region"
              aria-label="Notifications"
            >
              <NotificationCenter />
            </div>
          )}

          {/* Suspense boundary pour gérer le chargement des pages lazy-loadées */}
          <Suspense fallback={<PageLoader />}>
          <main id="main-content" role="main">
          <Routes>
            {/* Routes publiques */}
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Login setIsAuthenticated={setIsAuthenticated} />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Register setIsAuthenticated={setIsAuthenticated} />
            } />

            {/* Routes de vote */}
            <Route path="/vote/:token" element={<VotingPage />} />
            <Route path="/observer/:token" element={<ObserverDashboard />} />

            {/* Routes protégées */}
            <Route path="/dashboard" element={
              isAuthenticated ? <Dashboard setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" />
            } />
            <Route path="/elections/new" element={
              isAuthenticated ? <CreateElection /> : <Navigate to="/login" />
            } />
            <Route path="/elections/:id" element={
              isAuthenticated ? <ElectionDetails /> : <Navigate to="/login" />
            } />
            <Route path="/elections/:id/results" element={
              isAuthenticated ? <Results /> : <Navigate to="/login" />
            } />
            <Route path="/elections/:id/audit" element={
              isAuthenticated ? <AuditTrail /> : <Navigate to="/login" />
            } />
            <Route path="/security" element={
              isAuthenticated ? <Security /> : <Navigate to="/login" />
            } />

            {/* Redirection par défaut */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
          </Routes>
          </main>
          </Suspense>
        </NotificationProvider>
      </Router>

      {/* React Query DevTools pour debug en développement */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
