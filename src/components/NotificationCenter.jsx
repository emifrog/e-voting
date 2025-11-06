import { useState } from 'react';
import { Bell, X, Check, AlertCircle, Info } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <Check size={20} color="#10b981" />;
      case 'error': return <AlertCircle size={20} color="#ef4444" />;
      case 'info': return <Info size={20} color="#3b82f6" />;
      case 'warning': return <AlertCircle size={20} color="#f59e0b" />;
      default: return <Bell size={20} color="#6366f1" />;
    }
  };

  const getStyle = (type) => {
    const styles = {
      success: {
        background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
        borderColor: '#10b981'
      },
      error: {
        background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
        borderColor: '#ef4444'
      },
      info: {
        background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
        borderColor: '#3b82f6'
      },
      warning: {
        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
        borderColor: '#f59e0b'
      },
      default: {
        background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
        borderColor: '#6366f1'
      }
    };
    return styles[type] || styles.default;
  };

  // Afficher les toasts (notifications locales)
  const toastNotifications = notifications.filter(n => n.isLocal && !n.is_read);

  return (
    <>
      {/* Bouton de notification */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-secondary"
          style={{
            position: 'relative',
            padding: '10px',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 12px rgba(239, 68, 68, 0.6), 0 0 0 3px white',
              animation: 'pulse 2s infinite',
              border: '2px solid white',
              zIndex: 10
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Panel de notifications */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '60px',
            right: '0',
            width: '400px',
            maxHeight: '500px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'slideDown 0.3s ease'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '2px solid var(--gray-100)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))'
            }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '600' }}>
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    title="Tout marquer comme lu"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--gray-500)'
                }}>
                  <Bell size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                  <p>Aucune notification</p>
                </div>
              ) : (
                notifications.filter(n => !n.isLocal).map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--gray-100)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      background: notif.is_read ? 'white' : 'var(--gray-50)',
                      ...(!notif.is_read && { borderLeft: '4px solid var(--primary)' })
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = notif.is_read ? 'white' : 'var(--gray-50)'}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                      {getIcon(notif.type)}
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                          {notif.title}
                        </strong>
                        <p style={{ fontSize: '13px', color: 'var(--gray-600)', margin: 0 }}>
                          {notif.message}
                        </p>
                        {notif.election_title && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            marginTop: '6px'
                          }}>
                            {notif.election_title}
                          </span>
                        )}
                        <span style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px', display: 'block' }}>
                          {new Date(notif.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notif.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--gray-400)',
                          padding: '4px'
                        }}
                        title="Supprimer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications (coin supérieur droit) */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {toastNotifications.map(notif => (
          <div
            key={notif.id}
            style={{
              ...getStyle(notif.type),
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              minWidth: '300px',
              maxWidth: '400px',
              borderLeft: `4px solid ${getStyle(notif.type).borderColor}`,
              animation: 'slideInRight 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
              {getIcon(notif.type)}
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                  {notif.title}
                </strong>
                <p style={{ fontSize: '13px', margin: 0 }}>
                  {notif.message}
                </p>
              </div>
              <button
                onClick={() => handleDelete(notif.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

export default NotificationCenter;
