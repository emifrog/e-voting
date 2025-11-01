import { useEffect, useRef, useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

function ElectionQRCode({ electionId, electionTitle }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (electionId && canvasRef.current) {
      // Générer l'URL de vote basée sur l'ID de l'élection
      const voteUrl = `${window.location.origin}/vote/${electionId}`;

      // Générer le QR code
      QRCode.toCanvas(
        canvasRef.current,
        voteUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) {
            console.error('Erreur génération QR code:', error);
          }
        }
      );
    }
  }, [electionId]);

  const downloadQRCode = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `qrcode-${electionTitle}-${electionId}.png`;
      link.click();
    }
  };

  const copyQRCodeUrl = () => {
    const voteUrl = `${window.location.origin}/vote/${electionId}`;
    navigator.clipboard.writeText(voteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      padding: '30px',
      textAlign: 'center',
      color: 'white'
    }}>
      <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>
        📱 QR Code de Vote
      </h3>
      <p style={{ marginBottom: '20px', opacity: 0.9 }}>
        Affiche ce QR code aux participants pour qu'ils puissent voter en scannant
      </p>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        display: 'inline-block',
        marginBottom: '20px'
      }}>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '300px',
            height: 'auto'
          }}
        />
      </div>

      <div style={{
        marginTop: '20px',
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={downloadQRCode}
          style={{
            background: 'white',
            color: '#667eea',
            padding: '10px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          title="Télécharger le QR code"
        >
          <Download size={18} />
          Télécharger
        </button>

        <button
          onClick={copyQRCodeUrl}
          style={{
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            padding: '10px 16px',
            borderRadius: '6px',
            border: '2px solid white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          title="Copier le lien de vote"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copié!' : 'Copier le lien'}
        </button>
      </div>

      <div style={{
        marginTop: '16px',
        fontSize: '12px',
        opacity: 0.8,
        background: 'rgba(0,0,0,0.2)',
        padding: '12px',
        borderRadius: '6px'
      }}>
        <p style={{ margin: 0, marginBottom: '8px' }}>
          <strong>URL de vote directe:</strong>
        </p>
        <code style={{
          wordBreak: 'break-all',
          fontSize: '11px',
          background: 'rgba(0,0,0,0.3)',
          padding: '8px',
          borderRadius: '4px',
          display: 'block'
        }}>
          {window.location.origin}/vote/{electionId}
        </code>
      </div>
    </div>
  );
}

export default ElectionQRCode;
