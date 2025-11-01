import { memo, useMemo, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import QRCode from 'react-qr-code';

function QRCodeModal({ voter, onClose }) {
  const votingUrl = useMemo(
    () => `${window.location.origin}/vote/${voter.token}`,
    [voter.token]
  );

  const downloadQRCode = useCallback(() => {
    // Créer un canvas temporaire pour générer l'image
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 300;
    canvas.height = 300;

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode-${voter.name || voter.email}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [voter.name, voter.email]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(votingUrl);
    alert('Lien copié dans le presse-papier !');
  }, [votingUrl]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>QR Code de Vote</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <QRCode
              id="qr-code-svg"
              value={votingUrl}
              size={256}
              level="H"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--gray-700)' }}>
              Informations de l'électeur
            </h3>
            <div style={{
              background: 'var(--gray-50)',
              padding: '16px',
              borderRadius: 'var(--radius)',
              fontSize: '14px'
            }}>
              <p style={{ marginBottom: '8px' }}>
                <strong>Nom :</strong> {voter.name || '-'}
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>Email :</strong> {voter.email}
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>Poids :</strong> {voter.weight}
              </p>
              <p style={{
                marginTop: '16px',
                padding: '12px',
                background: 'var(--info-light)',
                borderRadius: 'var(--radius-sm)',
                wordBreak: 'break-all',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <strong>Lien de vote :</strong><br />
                {votingUrl}
              </p>
            </div>
          </div>

          <div className="flex gap-2" style={{ justifyContent: 'center' }}>
            <button onClick={downloadQRCode} className="btn btn-primary">
              <Download size={18} />
              Télécharger PNG
            </button>
            <button onClick={copyToClipboard} className="btn btn-secondary">
              Copier le lien
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap avec React.memo pour éviter re-renders inutiles
export default memo(QRCodeModal);
