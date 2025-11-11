import { useState, useEffect } from 'react';
import { Shield, Key, AlertTriangle, Download, Copy, Check } from 'lucide-react';
import api from '../utils/api';

function Security() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupStep, setSetupStep] = useState(null); // null, 'qr', 'verify', 'complete'

  // Setup flow
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  // Disable flow
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Regenerate backup codes flow
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const { data } = await api.get('/2fa/status');
      setTwoFactorEnabled(data.enabled);
    } catch (err) {
      setError('Erreur lors de la vérification du statut 2FA');
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    setError('');
    setSuccess('');

    try {
      const { data } = await api.post('/2fa/setup');
      setQrCodeUrl(data.qrCode);
      setSecret(data.secret);
      setSetupStep('qr');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la configuration 2FA');
    }
  };

  const verifyAndEnable = async (e) => {
    e.preventDefault();
    setError('');

    if (verificationCode.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    try {
      const { data } = await api.post('/2fa/verify', { code: verificationCode });
      setBackupCodes(data.backupCodes);
      setSetupStep('complete');
      setTwoFactorEnabled(true);
      setSuccess('Authentification à deux facteurs activée avec succès !');
    } catch (err) {
      setError(err.response?.data?.error || 'Code de vérification invalide');
    }
  };

  const disableTwoFactor = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/2fa/disable', {
        password: disablePassword,
        code: disableCode
      });

      setTwoFactorEnabled(false);
      setShowDisableForm(false);
      setDisablePassword('');
      setDisableCode('');
      setSuccess('Authentification à deux facteurs désactivée');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la désactivation');
    }
  };

  const regenerateBackupCodes = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await api.post('/2fa/regenerate-backup-codes', {
        password: regeneratePassword
      });

      setBackupCodes(data.backupCodes);
      setShowRegenerateForm(false);
      setRegeneratePassword('');
      setSetupStep('complete'); // Pour afficher les codes
      setSuccess('Nouveaux codes de récupération générés');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la régénération');
    }
  };

  const copyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadBackupCodes = () => {
    const content = `Codes de récupération E-Voting 2FA\n\nGénérés le: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\n⚠️ Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printBackupCodes = () => {
    const printWindow = window.open('', '', 'width=600,height=400');
    printWindow.document.write(`
      <html>
        <head>
          <title>Codes de Récupération 2FA</title>
          <style>
            body { font-family: monospace; padding: 40px; }
            h1 { font-size: 20px; margin-bottom: 20px; }
            .code { font-size: 18px; margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
            .warning { color: #d97706; margin-top: 30px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>🔐 Codes de Récupération E-Voting 2FA</h1>
          <p>Générés le: ${new Date().toLocaleString()}</p>
          ${backupCodes.map(code => `<div class="code">${code}</div>`).join('')}
          <div class="warning">⚠️ Conservez ces codes en lieu sûr. Chaque code ne peut être utilisé qu'une seule fois.</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const cancelSetup = () => {
    setSetupStep(null);
    setQrCodeUrl('');
    setSecret('');
    setVerificationCode('');
    setBackupCodes([]);
    setError('');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#1A1D21' }}>
      <div className="container">
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
          <ArrowLeft size={18} />
          Retour
        </button>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#EFEFEF' }}>
            🔒 Sécurité du Compte
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: '16px' }}>
            Gérez vos paramètres de sécurité et authentification
          </p>
        </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px', background: 'rgba(252, 73, 95, 0.1)', border: '1px solid rgba(252, 73, 95, 0.3)', color: '#FC495F' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
          {success}
        </div>
      )}

      {/* Statut 2FA */}
      <div className="card" style={{ marginBottom: '30px', background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1 }}>
            <div style={{
              background: twoFactorEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${twoFactorEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(116, 226, 222, 0.2)'}`
            }}>
              <Shield size={24} color={twoFactorEnabled ? '#10b981' : '#74E2DE'} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ marginBottom: '4px', color: '#EFEFEF', fontSize: '18px', fontWeight: '600' }}>Authentification à Deux Facteurs (2FA)</h2>
              <p style={{ fontSize: '14px', color: '#9CA3AF' }}>
                {twoFactorEnabled ?
                  'Votre compte est protégé par 2FA' :
                  'Ajoutez une couche de sécurité supplémentaire à votre compte'
                }
              </p>
            </div>
          </div>

          <div>
            {twoFactorEnabled ? (
              <span style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                ✅ Activée
              </span>
            ) : (
              <span style={{
                background: 'rgba(229, 133, 85, 0.1)',
                color: '#E58555',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(229, 133, 85, 0.3)'
              }}>
                ⏳ Désactivée
              </span>
            )}
          </div>
        </div>

        {!twoFactorEnabled && !setupStep && (
          <div>
            <div style={{
              background: 'rgba(116, 226, 222, 0.1)',
              border: '1px solid rgba(116, 226, 222, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <p style={{ marginBottom: '8px', fontWeight: '600', color: '#74E2DE', fontSize: '14px' }}>
                ℹ️ Qu'est-ce que la 2FA ?
              </p>
              <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: '1.6' }}>
                L'authentification à deux facteurs ajoute une étape supplémentaire lors de la connexion.
                Même si quelqu'un connaît votre mot de passe, il ne pourra pas accéder à votre compte
                sans le code généré par votre application d'authentification.
              </p>
            </div>

            <button onClick={startSetup} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Key size={18} />
              Configurer 2FA
            </button>
          </div>
        )}

        {twoFactorEnabled && !showDisableForm && !showRegenerateForm && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowRegenerateForm(true)}
              className="btn btn-secondary"
            >
              <Key size={18} />
              Régénérer les codes
            </button>

            <button
              onClick={() => setShowDisableForm(true)}
              className="btn btn-danger"
            >
              <AlertTriangle size={18} />
              Désactiver 2FA
            </button>
          </div>
        )}
      </div>

      {/* Configuration 2FA - Étape 1: QR Code */}
      {setupStep === 'qr' && (
        <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
          <h2 style={{ marginBottom: '24px', color: '#EFEFEF', fontSize: '20px' }}>Étape 1: Scanner le QR Code</h2>

          <div style={{
            background: 'rgba(116, 226, 222, 0.1)',
            border: '1px solid rgba(116, 226, 222, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ marginBottom: '8px', fontWeight: '600', color: '#74E2DE', fontSize: '14px' }}>
              📱 Applications recommandées:
            </p>
            <ul style={{ marginLeft: '20px', fontSize: '13px', color: '#9CA3AF', lineHeight: '1.6' }}>
              <li>Google Authenticator (iOS/Android)</li>
              <li>Microsoft Authenticator (iOS/Android)</li>
              <li>Authy (iOS/Android/Desktop)</li>
              <li>1Password (iOS/Android/Desktop)</li>
            </ul>
          </div>

          <div style={{
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '32px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '2px solid rgba(116, 226, 222, 0.2)'
          }}>
            <img
              src={qrCodeUrl}
              alt="QR Code 2FA"
              style={{ maxWidth: '280px', width: '100%', borderRadius: '8px' }}
            />
          </div>

          <div style={{
            background: 'rgba(229, 133, 85, 0.1)',
            border: '1px solid rgba(229, 133, 85, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ marginBottom: '8px', fontWeight: '600', color: '#E58555', fontSize: '14px' }}>
              🤔 Impossible de scanner le QR code ?
            </p>
            <p style={{ fontSize: '13px', marginBottom: '12px', color: '#9CA3AF' }}>
              Entrez manuellement cette clé dans votre application :
            </p>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '12px 14px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '14px',
              wordBreak: 'break-all',
              color: '#EFEFEF',
              border: '1px solid rgba(229, 133, 85, 0.3)',
              fontWeight: '600'
            }}>
              {secret}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={cancelSetup} className="btn btn-secondary">
              Annuler
            </button>
            <button onClick={() => setSetupStep('verify')} className="btn btn-primary">
              J'ai scanné le code
            </button>
          </div>
        </div>
      )}

      {/* Configuration 2FA - Étape 2: Vérification */}
      {setupStep === 'verify' && (
        <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
          <h2 style={{ marginBottom: '24px', color: '#EFEFEF', fontSize: '20px' }}>Étape 2: Vérification</h2>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: 0, color: '#10b981', fontSize: '14px', lineHeight: '1.6' }}>
              ✓ Entrez le code à 6 chiffres affiché dans votre application d'authentification
            </p>
          </div>

          <form onSubmit={verifyAndEnable}>
            <div className="form-group">
              <label className="label" style={{ color: '#EFEFEF', fontWeight: '500' }}>Code de vérification</label>
              <input
                type="text"
                className="input"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                style={{
                  fontSize: '28px',
                  letterSpacing: '10px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  color: '#EFEFEF',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(116, 226, 222, 0.3)'
                }}
              />
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
                Le code change toutes les 30 secondes
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSetupStep('qr')}
                className="btn btn-secondary"
              >
                Retour
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={verificationCode.length !== 6}
              >
                Vérifier et Activer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Configuration 2FA - Étape 3: Codes de récupération */}
      {setupStep === 'complete' && backupCodes.length > 0 && (
        <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
          <h2 style={{ marginBottom: '24px', color: '#EFEFEF', fontSize: '20px' }}>
            {twoFactorEnabled && !success.includes('Nouveaux') ?
              '✅ 2FA Activée !' :
              '🔑 Codes de Récupération'
            }
          </h2>

          <div style={{
            background: 'rgba(229, 133, 85, 0.1)',
            border: '1px solid rgba(229, 133, 85, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#E58555' }} />
              <div>
                <p style={{ marginBottom: '8px', fontWeight: '600', color: '#E58555', fontSize: '14px' }}>
                  ⚠️ Important - Conservez ces codes en lieu sûr
                </p>
                <ul style={{ marginLeft: '20px', fontSize: '13px', color: '#9CA3AF', lineHeight: '1.6' }}>
                  <li>Chaque code ne peut être utilisé qu'<strong>une seule fois</strong></li>
                  <li>Utilisez-les si vous perdez l'accès à votre application d'authentification</li>
                  <li>Ne les partagez avec personne</li>
                  <li>Imprimez-les ou sauvegardez-les dans un gestionnaire de mots de passe</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '24px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid rgba(116, 226, 222, 0.2)'
          }}>
            <p style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '500', color: '#9CA3AF' }}>
              {backupCodes.length} codes de récupération disponibles
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px'
            }}>
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  style={{
                    background: '#232730',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    border: '1px solid rgba(116, 226, 222, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#74E2DE'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(116, 226, 222, 0.2)'}
                >
                  <code style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'monospace', color: '#EFEFEF' }}>
                    {code}
                  </code>
                  <button
                    onClick={() => copyCode(code, index)}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '4px 8px', minHeight: 'auto', display: 'flex', alignItems: 'center' }}
                    title="Copier"
                  >
                    {copiedCode === index ? (
                      <Check size={14} color="#10b981" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={downloadBackupCodes} className="btn btn-secondary">
                <Download size={18} />
                Télécharger
              </button>
              <button onClick={printBackupCodes} className="btn btn-secondary">
                🖨️ Imprimer
              </button>
            </div>

            <button
              onClick={() => {
                setSetupStep(null);
                setBackupCodes([]);
              }}
              className="btn btn-primary"
            >
              J'ai sauvegardé mes codes
            </button>
          </div>
        </div>
      )}

      {/* Formulaire de désactivation */}
      {showDisableForm && (
        <div className="card" style={{ background: '#232730', border: '1px solid rgba(252, 73, 95, 0.3)' }}>
          <h2 style={{ marginBottom: '24px', color: '#FC495F', fontSize: '20px' }}>
            Désactiver 2FA
          </h2>

          <div style={{
            background: 'rgba(252, 73, 95, 0.1)',
            border: '1px solid rgba(252, 73, 95, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: 0, color: '#FC495F', fontSize: '14px', fontWeight: '500' }}>
              <strong>⚠️ Attention:</strong> Votre compte sera moins sécurisé si vous désactivez la 2FA.
            </p>
          </div>

          <form onSubmit={disableTwoFactor}>
            <div className="form-group">
              <label className="label" style={{ color: '#EFEFEF' }}>Mot de passe actuel</label>
              <input
                type="password"
                className="input"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(116, 226, 222, 0.3)', color: '#EFEFEF' }}
              />
            </div>

            <div className="form-group">
              <label className="label" style={{ color: '#EFEFEF' }}>Code 2FA actuel</label>
              <input
                type="text"
                className="input"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                style={{
                  fontSize: '20px',
                  letterSpacing: '6px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(116, 226, 222, 0.3)',
                  color: '#EFEFEF'
                }}
              />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDisableForm(false);
                  setDisablePassword('');
                  setDisableCode('');
                }}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-danger">
                Désactiver 2FA
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulaire de régénération des codes */}
      {showRegenerateForm && (
        <div className="card" style={{ background: '#232730', border: '1px solid rgba(116, 226, 222, 0.2)' }}>
          <h2 style={{ marginBottom: '24px', color: '#EFEFEF', fontSize: '20px' }}>
            Régénérer les Codes de Récupération
          </h2>

          <div style={{
            background: 'rgba(229, 133, 85, 0.1)',
            border: '1px solid rgba(229, 133, 85, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: 0, color: '#E58555', fontSize: '14px', fontWeight: '500' }}>
              <strong>⚠️ Attention:</strong> Les anciens codes de récupération seront invalidés.
            </p>
          </div>

          <form onSubmit={regenerateBackupCodes}>
            <div className="form-group">
              <label className="label" style={{ color: '#EFEFEF' }}>Mot de passe actuel</label>
              <input
                type="password"
                className="input"
                value={regeneratePassword}
                onChange={(e) => setRegeneratePassword(e.target.value)}
                required
                placeholder="Confirmez votre mot de passe"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(116, 226, 222, 0.3)', color: '#EFEFEF' }}
              />
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowRegenerateForm(false);
                  setRegeneratePassword('');
                }}
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Régénérer
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
}

export default Security;
