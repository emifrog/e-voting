import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Plus, LogOut, BarChart3, Users, Clock, CheckCircle, Shield, Trash2, Search, X, FileText, TrendingUp, Activity, Calendar, Home, Settings, Bell, HelpCircle, Menu } from 'lucide-react';

function Dashboard({ setIsAuthenticated }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, draft, active, closed
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, title-asc, title-desc, participation-desc

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchElections();
  }, []);

  const fetchElections = async () => {
    try {
      const response = await api.get('/elections');
      setElections(response.data.elections);
    } catch (error) {
      console.error('Erreur chargement élections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort elections
  const filteredElections = useMemo(() => {
    let filtered = elections;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(search) ||
        (e.description && e.description.toLowerCase().includes(search))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'date-asc':
        sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'title-asc':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'participation-desc':
        sorted.sort((a, b) => {
          const aParticipation = a.total_voters > 0 ? (a.voted_count / a.total_voters) : 0;
          const bParticipation = b.total_voters > 0 ? (b.voted_count / b.total_voters) : 0;
          return bParticipation - aParticipation;
        });
        break;
      default:
        break;
    }

    return sorted;
  }, [elections, searchTerm, statusFilter, sortBy]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    // Dispatcher un événement pour synchroniser les onglets
    window.dispatchEvent(new Event('user-logout'));
    navigate('/login');
  };

  const handleDeleteElection = async (electionId, electionTitle) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer l'élection "${electionTitle}"?\n\nCette action est irréversible.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/elections/${electionId}`);
      // Mettre à jour la liste après suppression
      setElections(elections.filter(e => e.id !== electionId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'élection');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: {
        background: 'rgba(252, 73, 95, 0.15)',
        color: '#FC495F',
        border: '1px solid rgba(252, 73, 95, 0.3)'
      },
      active: {
        background: 'rgba(116, 226, 222, 0.15)',
        color: '#74E2DE',
        border: '1px solid rgba(116, 226, 222, 0.3)'
      },
      closed: {
        background: 'rgba(229, 133, 85, 0.15)',
        color: '#E58555',
        border: '1px solid rgba(229, 133, 85, 0.3)'
      }
    };
    const labels = {
      draft: 'Brouillon',
      active: 'En cours',
      closed: 'Terminé'
    };
    return (
      <span style={{
        ...styles[status],
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'inline-block'
      }}>
        {labels[status]}
      </span>
    );
  };

  const stats = {
    total: elections.length,
    active: elections.filter(e => e.status === 'active').length,
    draft: elections.filter(e => e.status === 'draft').length,
    closed: elections.filter(e => e.status === 'closed').length
  };

  const filteredStats = {
    total: filteredElections.length,
    active: filteredElections.filter(e => e.status === 'active').length,
    draft: filteredElections.filter(e => e.status === 'draft').length,
    closed: filteredElections.filter(e => e.status === 'closed').length
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1A1D21',
      display: 'flex'
    }}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 998,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: isMobile ? (sidebarOpen ? '280px' : '0') : (sidebarOpen ? '280px' : '80px'),
          background: '#232730',
          backdropFilter: 'blur(10px)',
          boxShadow: '2px 0 30px rgba(0,0,0,0.5)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: isMobile ? (sidebarOpen ? 0 : '-280px') : 0,
          height: '100vh',
          overflow: 'hidden',
          zIndex: 999
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/logo-removebg.png"
                alt="E-Voting"
                style={{ height: '40px', objectFit: 'contain' }}
              />
              <span style={{ fontWeight: '600', fontSize: '18px', color: '#EFEFEF', letterSpacing: '-0.02em' }}>
                E-Voting
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              transition: 'background 0.2s ease',
              color: '#74E2DE'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(116, 226, 222, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            aria-label={sidebarOpen ? 'Réduire la sidebar' : 'Étendre la sidebar'}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '20px 16px', overflowY: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#74E2DE',
                  color: '#1A1D21',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '15px',
                  transition: 'all 0.3s ease'
                }}
              >
                <Home size={20} />
                {sidebarOpen && <span>Dashboard</span>}
              </button>
            </li>

            <li style={{ marginBottom: '8px' }}>
              <button
                onClick={() => navigate('/elections/new')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'transparent',
                  color: '#EFEFEF',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '15px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(116, 226, 222, 0.1)';
                  e.currentTarget.style.color = '#74E2DE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#EFEFEF';
                }}
              >
                <Plus size={20} />
                {sidebarOpen && <span>Nouvelle élection</span>}
              </button>
            </li>

            <li style={{ marginBottom: '8px' }}>
              <button
                onClick={() => navigate('/security')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'transparent',
                  color: '#EFEFEF',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '15px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(116, 226, 222, 0.1)';
                  e.currentTarget.style.color = '#74E2DE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#EFEFEF';
                }}
              >
                <Shield size={20} />
                {sidebarOpen && <span>Sécurité</span>}
              </button>
            </li>

            <li style={{ marginBottom: '8px' }}>
              <button
                onClick={() => navigate('/gdpr')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: 'transparent',
                  color: '#EFEFEF',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '15px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(116, 226, 222, 0.1)';
                  e.currentTarget.style.color = '#74E2DE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#EFEFEF';
                }}
              >
                <FileText size={20} />
                {sidebarOpen && <span>GDPR</span>}
              </button>
            </li>

            {sidebarOpen && (
              <li style={{
                marginTop: '24px',
                marginBottom: '12px',
                paddingLeft: '16px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Statistiques
              </li>
            )}

            <li style={{ marginBottom: '8px' }}>
              <div style={{
                padding: '12px 16px',
                background: 'rgba(116, 226, 222, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid rgba(116, 226, 222, 0.2)'
              }}>
                <div style={{
                  background: '#74E2DE',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BarChart3 size={16} color="#1A1D21" />
                </div>
                {sidebarOpen && (
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#EFEFEF' }}>
                      {stats.total}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '400' }}>
                      Total élections
                    </div>
                  </div>
                )}
              </div>
            </li>

            <li style={{ marginBottom: '8px' }}>
              <div style={{
                padding: '12px 16px',
                background: 'rgba(229, 133, 85, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid rgba(229, 133, 85, 0.2)'
              }}>
                <div style={{
                  background: '#E58555',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={16} color="#1A1D21" />
                </div>
                {sidebarOpen && (
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#EFEFEF' }}>
                      {stats.active}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '400' }}>
                      En cours
                    </div>
                  </div>
                )}
              </div>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: '#FC495F',
              color: '#EFEFEF',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(252, 73, 95, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: isMobile ? '20px' : '40px',
        overflowY: 'auto',
        width: '100%',
        minWidth: 0
      }}>
      <div className="container" style={{ maxWidth: '100%', padding: 0 }}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              top: '20px',
              left: '20px',
              zIndex: 997,
              background: '#232730',
              border: '1px solid rgba(116, 226, 222, 0.3)',
              borderRadius: '12px',
              padding: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              color: '#74E2DE'
            }}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
        )}

        {/* Header */}
        <header role="banner" style={{ marginBottom: isMobile ? '24px' : '40px' }}>
          <div style={{
            background: '#232730',
            backdropFilter: 'blur(10px)',
            padding: isMobile ? '24px' : '28px 36px',
            borderRadius: isMobile ? '16px' : '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '16px' : '0',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <div>
              <h1 style={{
                fontSize: isMobile ? '24px' : '32px',
                color: '#EFEFEF',
                marginBottom: '8px',
                fontWeight: '600',
                letterSpacing: '-0.02em'
              }}>
                Tableau de bord
              </h1>
              <p style={{
                color: '#9CA3AF',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '400',
                margin: 0
              }}>
                Bienvenue, {user?.name} 👋
              </p>
            </div>
            {!isMobile && (
              <div style={{
                background: '#74E2DE',
                padding: '12px 24px',
                borderRadius: '12px',
                color: '#1A1D21',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </header>

        {/* Statistics section */}
        <section aria-labelledby="stats-heading" style={{ marginBottom: isMobile ? '24px' : '40px' }}>
          <h2 id="stats-heading" className="sr-only">Statistiques des élections</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: isMobile ? '16px' : '24px'
          }}>
            {/* Card 1: Total */}
            <div
              className="card"
              style={{
                background: '#232730',
                color: '#EFEFEF',
                border: '1px solid rgba(116, 226, 222, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(116, 226, 222, 0.4)';
                e.currentTarget.style.borderColor = '#74E2DE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                e.currentTarget.style.borderColor = 'rgba(116, 226, 222, 0.3)';
              }}
            >
              <div className="flex-between">
                <div>
                  <p style={{ color: '#74E2DE', fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>
                    Total des élections
                  </p>
                  <h3 style={{ fontSize: '36px', fontWeight: '700', margin: 0, color: '#EFEFEF' }}>{stats.total}</h3>
                </div>
                <div style={{
                  background: '#74E2DE',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BarChart3 size={32} color="#1A1D21" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Card 2: Active */}
            <div
              className="card"
              style={{
                background: '#232730',
                color: '#EFEFEF',
                border: '1px solid rgba(229, 133, 85, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(229, 133, 85, 0.4)';
                e.currentTarget.style.borderColor = '#E58555';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                e.currentTarget.style.borderColor = 'rgba(229, 133, 85, 0.3)';
              }}
            >
              <div className="flex-between">
                <div>
                  <p style={{ color: '#E58555', fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>
                    Votes actifs
                  </p>
                  <h3 style={{ fontSize: '36px', fontWeight: '700', margin: 0, color: '#EFEFEF' }}>{stats.active}</h3>
                </div>
                <div style={{
                  background: '#E58555',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Activity size={32} color="#1A1D21" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Card 3: Brouillons */}
            <div
              className="card"
              style={{
                background: '#232730',
                color: '#EFEFEF',
                border: '1px solid rgba(252, 73, 95, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(252, 73, 95, 0.4)';
                e.currentTarget.style.borderColor = '#FC495F';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                e.currentTarget.style.borderColor = 'rgba(252, 73, 95, 0.3)';
              }}
            >
              <div className="flex-between">
                <div>
                  <p style={{ color: '#FC495F', fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>
                    Brouillons
                  </p>
                  <h3 style={{ fontSize: '36px', fontWeight: '700', margin: 0, color: '#EFEFEF' }}>{stats.draft}</h3>
                </div>
                <div style={{
                  background: '#FC495F',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={32} color="#EFEFEF" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Card 4: Terminés */}
            <div
              className="card"
              style={{
                background: '#232730',
                color: '#EFEFEF',
                border: '1px solid rgba(116, 226, 222, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(116, 226, 222, 0.4)';
                e.currentTarget.style.borderColor = '#74E2DE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
                e.currentTarget.style.borderColor = 'rgba(116, 226, 222, 0.3)';
              }}
            >
              <div className="flex-between">
                <div>
                  <p style={{ color: '#74E2DE', fontSize: '14px', marginBottom: '12px', fontWeight: '600' }}>
                    Terminés
                  </p>
                  <h3 style={{ fontSize: '36px', fontWeight: '700', margin: 0, color: '#EFEFEF' }}>{stats.closed}</h3>
                </div>
                <div style={{
                  background: '#74E2DE',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle size={32} color="#1A1D21" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Elections list section */}
        <section aria-labelledby="elections-heading">
          <div className="card" style={{
            background: '#232730',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
          <div className="flex-between" style={{
            marginBottom: '24px',
            padding: '8px 0',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 id="elections-heading" style={{
              fontSize: '24px',
              color: '#EFEFEF',
              fontWeight: '600',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              Mes élections
            </h2>
            <button
              onClick={() => navigate('/elections/new')}
              className="btn btn-primary"
              style={{
                background: '#74E2DE',
                color: '#1A1D21',
                border: 'none',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(116, 226, 222, 0.4)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(116, 226, 222, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(116, 226, 222, 0.4)';
              }}
            >
              <Plus size={18} aria-hidden="true" />
              Nouvelle élection
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? '12px' : '16px',
            marginBottom: isMobile ? '16px' : '24px',
            padding: isMobile ? '16px' : '20px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: isMobile ? '12px' : '16px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#74E2DE'
                }}
              />
              <label htmlFor="search-elections" className="sr-only">
                Rechercher une élection
              </label>
              <input
                id="search-elections"
                type="text"
                placeholder="Rechercher par titre ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Rechercher une élection par titre ou description"
                className="input"
                style={{
                  paddingLeft: '40px',
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid rgba(116, 226, 222, 0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#EFEFEF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#74E2DE';
                  e.target.style.boxShadow = '0 0 0 3px rgba(116, 226, 222, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(116, 226, 222, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Effacer la recherche"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#74E2DE'
                  }}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid rgba(116, 226, 222, 0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#EFEFEF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#74E2DE';
                  e.target.style.boxShadow = '0 0 0 3px rgba(116, 226, 222, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(116, 226, 222, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="all" style={{background: '#232730', color: '#EFEFEF'}}>Tous les statuts</option>
                <option value="draft" style={{background: '#232730', color: '#EFEFEF'}}>Brouillons</option>
                <option value="active" style={{background: '#232730', color: '#EFEFEF'}}>En cours</option>
                <option value="closed" style={{background: '#232730', color: '#EFEFEF'}}>Terminés</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1px solid rgba(116, 226, 222, 0.2)',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#EFEFEF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#74E2DE';
                  e.target.style.boxShadow = '0 0 0 3px rgba(116, 226, 222, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(116, 226, 222, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="date-desc" style={{background: '#232730', color: '#EFEFEF'}}>Date (récent → ancien)</option>
                <option value="date-asc" style={{background: '#232730', color: '#EFEFEF'}}>Date (ancien → récent)</option>
                <option value="title-asc" style={{background: '#232730', color: '#EFEFEF'}}>Titre (A → Z)</option>
                <option value="title-desc" style={{background: '#232730', color: '#EFEFEF'}}>Titre (Z → A)</option>
                <option value="participation-desc" style={{background: '#232730', color: '#EFEFEF'}}>Participation (haute → basse)</option>
              </select>
            </div>
          </div>

          {/* Results count - Live region for search results */}
          {elections.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{
                fontSize: '13px',
                color: '#9CA3AF',
                marginBottom: '16px',
                paddingBottom: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {searchTerm || statusFilter !== 'all'
                ? `${filteredStats.total} résultat(s) trouvé(s) sur ${stats.total} élection(s)`
                : `${stats.total} élection(s) au total`}
            </div>
          )}

          {loading ? (
            <div className="loading" role="status" aria-live="polite">
              <div className="spinner" aria-hidden="true"></div>
              <span className="sr-only">Chargement des élections en cours...</span>
            </div>
          ) : elections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>Aucune élection créée pour le moment</p>
              <button
                onClick={() => navigate('/elections/new')}
                className="btn btn-primary"
                style={{ marginTop: '20px' }}
              >
                <Plus size={18} />
                Créer ma première élection
              </button>
            </div>
          ) : filteredElections.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: isMobile ? '40px 20px' : '60px 40px',
              color: '#9CA3AF',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <p style={{ fontSize: isMobile ? '14px' : '16px', marginBottom: '20px' }}>Aucune élection ne correspond à vos critères de recherche</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSortBy('date-desc');
                }}
                className="btn btn-secondary"
                style={{
                  marginTop: '20px',
                  background: '#74E2DE',
                  color: '#1A1D21',
                  border: 'none',
                  fontWeight: '600'
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : isMobile ? (
            // Mobile Card View
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredElections.map((election) => (
                <div
                  key={election.id}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    transition: 'all 0.3s ease',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#EFEFEF', margin: 0, flex: 1 }}>
                      {election.title}
                    </h3>
                    {getStatusBadge(election.status)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#9CA3AF' }}>Type:</span>
                      <span style={{ color: '#EFEFEF', fontWeight: '500', textTransform: 'capitalize' }}>{election.voting_type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#9CA3AF' }}>Électeurs:</span>
                      <span style={{ color: '#EFEFEF', fontWeight: '500' }}>{election.total_voters || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#9CA3AF' }}>Participation:</span>
                      {election.total_voters > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#EFEFEF', fontWeight: '500' }}>{election.voted_count} / {election.total_voters}</span>
                          <span style={{
                            background: Math.round((election.voted_count / election.total_voters) * 100) >= 50 ? 'rgba(229, 133, 85, 0.2)' : 'rgba(252, 73, 95, 0.2)',
                            color: Math.round((election.voted_count / election.total_voters) * 100) >= 50 ? '#E58555' : '#FC495F',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {Math.round((election.voted_count / election.total_voters) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#9CA3AF' }}>-</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span style={{ color: '#9CA3AF' }}>Date:</span>
                      <span style={{ color: '#9CA3AF', fontSize: '13px' }}>
                        {new Date(election.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/elections/${election.id}`)}
                      className="btn btn-sm btn-primary"
                      style={{
                        flex: 1,
                        background: '#74E2DE',
                        color: '#1A1D21',
                        border: 'none',
                        fontWeight: '600',
                        padding: '10px 16px',
                        borderRadius: '8px'
                      }}
                    >
                      Gérer
                    </button>
                    {election.status === 'closed' && (
                      <button
                        onClick={() => handleDeleteElection(election.id, election.title)}
                        className="btn btn-sm btn-danger"
                        title="Supprimer cette élection"
                        style={{
                          background: '#FC495F',
                          color: '#EFEFEF',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: '600'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop Table View
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: '0'
              }}>
                <thead>
                  <tr style={{
                    background: 'transparent',
                    borderBottom: '2px solid rgba(116, 226, 222, 0.2)'
                  }}>
                    <th style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '16px',
                      textAlign: 'left'
                    }}>Titre</th>
                    <th style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '16px',
                      textAlign: 'left'
                    }}>Type</th>
                    <th style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '16px',
                      textAlign: 'left'
                    }}>Statut</th>
                    <th style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '16px',
                      textAlign: 'center'
                    }}>Électeurs</th>
                    <th style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '16px',
                      textAlign: 'left'
                    }}>Participation</th>
                    <th style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '16px',
                      textAlign: 'left'
                    }}>Date</th>
                    <th style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '16px',
                      textAlign: 'right'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{
                  border: '1px solid rgba(116, 226, 222, 0.2)',
                  borderRadius: '12px'
                }}>
                  {filteredElections.map((election, index) => (
                    <tr
                      key={election.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(116, 226, 222, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td style={{ padding: '20px 16px' }}>
                        <div style={{ color: '#EFEFEF', fontSize: '14px', fontWeight: '500' }}>{election.title}</div>
                      </td>
                      <td style={{ padding: '20px 16px', textTransform: 'capitalize', color: '#9CA3AF', fontSize: '14px' }}>
                        {election.voting_type}
                      </td>
                      <td style={{ padding: '20px 16px' }}>{getStatusBadge(election.status)}</td>
                      <td style={{ padding: '20px 16px', color: '#EFEFEF', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
                        {election.total_voters || 0}
                      </td>
                      <td style={{ padding: '20px 16px', color: '#9CA3AF', fontSize: '14px' }}>
                        {election.total_voters > 0
                          ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                flex: 1,
                                height: '6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                                maxWidth: '100px'
                              }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.round((election.voted_count / election.total_voters) * 100)}%`,
                                  background: Math.round((election.voted_count / election.total_voters) * 100) >= 50 ? '#74E2DE' : '#FC495F',
                                  transition: 'width 0.3s ease'
                                }}></div>
                              </div>
                              <span style={{
                                color: '#EFEFEF',
                                fontSize: '13px',
                                fontWeight: '600',
                                minWidth: '45px'
                              }}>
                                {Math.round((election.voted_count / election.total_voters) * 100)}%
                              </span>
                            </div>
                          )
                          : <span style={{color: '#6B7280'}}>-</span>}
                      </td>
                      <td style={{ padding: '20px 16px', fontSize: '13px', color: '#9CA3AF' }}>
                        {new Date(election.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '20px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => navigate(`/elections/${election.id}`)}
                            style={{
                              background: 'transparent',
                              color: '#74E2DE',
                              border: '1px solid rgba(116, 226, 222, 0.3)',
                              fontWeight: '500',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                              fontSize: '13px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(116, 226, 222, 0.1)';
                              e.currentTarget.style.borderColor = '#74E2DE';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'rgba(116, 226, 222, 0.3)';
                            }}
                          >
                            Gérer
                          </button>
                          {election.status === 'closed' && (
                            <button
                              onClick={() => handleDeleteElection(election.id, election.title)}
                              title="Supprimer cette élection"
                              style={{
                                background: 'transparent',
                                color: '#FC495F',
                                border: '1px solid rgba(252, 73, 95, 0.3)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(252, 73, 95, 0.1)';
                                e.currentTarget.style.borderColor = '#FC495F';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'rgba(252, 73, 95, 0.3)';
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

export default Dashboard;
