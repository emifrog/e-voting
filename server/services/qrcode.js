import QRCode from 'qrcode';

/**
 * Génère un QR code en Data URL pour un lien de vote
 */
export const generateVotingQRCode = async (votingUrl) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(votingUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error('Erreur génération QR code:', error);
    throw error;
  }
};

/**
 * Génère un QR code pour affichage (SVG string)
 */
export const generateQRCodeSVG = async (votingUrl) => {
  try {
    const qrCodeSVG = await QRCode.toString(votingUrl, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeSVG;
  } catch (error) {
    console.error('Erreur génération QR code SVG:', error);
    throw error;
  }
};

export default { generateVotingQRCode, generateQRCodeSVG };
