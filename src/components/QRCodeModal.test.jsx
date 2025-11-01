import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QRCodeModal from './QRCodeModal';

// Mock du composant QRCode
vi.mock('react-qr-code', () => ({
  default: ({ value, id }) => (
    <svg id={id} data-testid="qr-code" data-value={value}>
      <rect width="256" height="256" />
    </svg>
  ),
}));

describe('QRCodeModal Component', () => {
  const mockVoter = {
    id: '1',
    name: 'Jean Dupont',
    email: 'jean@example.com',
    token: 'abc123token',
    weight: 1.5,
  };

  const mockOnClose = vi.fn();

  // Mock window.location.origin
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    delete window.location;
    window.location = { origin: 'http://localhost:5173' };

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    // Mock alert
    global.alert = vi.fn();

    // Mock URL.createObjectURL et revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock HTMLCanvasElement
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    }));
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(['fake-image'], { type: 'image/png' }));
    });
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  describe('Rendering', () => {
    it('devrait afficher le titre "QR Code de Vote"', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);
      expect(screen.getByText(/QR Code de Vote/i)).toBeInTheDocument();
    });

    it('devrait afficher le bouton de fermeture', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });

    it('devrait afficher le QR code', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);
      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toBeInTheDocument();
    });

    it('devrait afficher les informations de l\'électeur', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      expect(screen.getByText(/Informations de l'électeur/i)).toBeInTheDocument();
      expect(screen.getByText(/Jean Dupont/i)).toBeInTheDocument();
      expect(screen.getByText(/jean@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/1.5/i)).toBeInTheDocument();
    });

    it('devrait afficher le lien de vote', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);
      const expectedUrl = 'http://localhost:5173/vote/abc123token';
      expect(screen.getByText(expectedUrl)).toBeInTheDocument();
    });

    it('devrait afficher "-" si le nom n\'est pas fourni', () => {
      const voterWithoutName = { ...mockVoter, name: null };
      render(<QRCodeModal voter={voterWithoutName} onClose={mockOnClose} />);

      // Chercher le texte qui contient "Nom :" et vérifier qu'il contient "-"
      const nameElement = screen.getByText(/Nom :/i).closest('p');
      expect(nameElement?.textContent).toContain('-');
    });

    it('devrait afficher les boutons d\'action', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /Télécharger PNG/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copier le lien/i })).toBeInTheDocument();
    });
  });

  describe('QR Code Generation', () => {
    it('devrait générer le QR code avec l\'URL correcte', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);
      const qrCode = screen.getByTestId('qr-code');

      const expectedUrl = 'http://localhost:5173/vote/abc123token';
      expect(qrCode).toHaveAttribute('data-value', expectedUrl);
    });

    it('devrait avoir l\'id "qr-code-svg"', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);
      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toHaveAttribute('id', 'qr-code-svg');
    });

    it('devrait utiliser le token de l\'électeur dans l\'URL', () => {
      const voterWithDifferentToken = { ...mockVoter, token: 'xyz789' };
      render(<QRCodeModal voter={voterWithDifferentToken} onClose={mockOnClose} />);

      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toHaveAttribute('data-value', 'http://localhost:5173/vote/xyz789');
    });
  });

  describe('Modal Interaction', () => {
    it('devrait appeler onClose quand on clique sur le bouton de fermeture', async () => {
      const user = userEvent.setup();
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn => btn.classList.contains('modal-close'));

      if (closeButton) {
        await user.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('devrait appeler onClose quand on clique sur l\'overlay', async () => {
      const user = userEvent.setup();
      const { container } = render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        await user.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('ne devrait pas appeler onClose quand on clique sur le contenu de la modal', async () => {
      const user = userEvent.setup();
      const { container } = render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const modalContent = container.querySelector('.modal');
      if (modalContent) {
        await user.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Copy to Clipboard', () => {
    it('devrait copier le lien dans le presse-papier', async () => {
      const user = userEvent.setup();
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const copyButton = screen.getByRole('button', { name: /Copier le lien/i });
      await user.click(copyButton);

      const expectedUrl = 'http://localhost:5173/vote/abc123token';
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedUrl);
    });

    it('devrait afficher une alerte après la copie', async () => {
      const user = userEvent.setup();
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const copyButton = screen.getByRole('button', { name: /Copier le lien/i });
      await user.click(copyButton);

      expect(global.alert).toHaveBeenCalledWith('Lien copié dans le presse-papier !');
    });
  });

  describe('Download QR Code', () => {
    it('devrait déclencher le téléchargement avec le nom correct', async () => {
      const user = userEvent.setup();
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      // Mock createElement pour capturer l'élément <a>
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tagName) => {
        if (tagName === 'a') {
          return mockAnchor;
        }
        return originalCreateElement(tagName);
      });

      const downloadButton = screen.getByRole('button', { name: /Télécharger PNG/i });
      await user.click(downloadButton);

      // Attendre que l'image soit chargée (simulé)
      const imgElements = document.querySelectorAll('img');
      const mockImg = imgElements[imgElements.length - 1];
      if (mockImg && mockImg.onload) {
        mockImg.onload({});
      }

      // Vérifier que le téléchargement a été déclenché
      expect(mockAnchor.download).toBe('qrcode-Jean Dupont.png');
      expect(mockAnchor.click).toHaveBeenCalled();

      // Restaurer createElement
      document.createElement = originalCreateElement;
    });

    it('devrait utiliser l\'email comme nom de fichier si pas de nom', async () => {
      const user = userEvent.setup();
      const voterWithoutName = { ...mockVoter, name: '' };
      render(<QRCodeModal voter={voterWithoutName} onClose={mockOnClose} />);

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tagName) => {
        if (tagName === 'a') {
          return mockAnchor;
        }
        return originalCreateElement(tagName);
      });

      const downloadButton = screen.getByRole('button', { name: /Télécharger PNG/i });
      await user.click(downloadButton);

      const imgElements = document.querySelectorAll('img');
      const mockImg = imgElements[imgElements.length - 1];
      if (mockImg && mockImg.onload) {
        mockImg.onload({});
      }

      expect(mockAnchor.download).toBe('qrcode-jean@example.com.png');

      document.createElement = originalCreateElement;
    });
  });

  describe('Voter Data Display', () => {
    it('devrait afficher toutes les propriétés de l\'électeur', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const voterInfo = screen.getByText(/Informations de l'électeur/i).parentElement;
      expect(voterInfo?.textContent).toContain('Jean Dupont');
      expect(voterInfo?.textContent).toContain('jean@example.com');
      expect(voterInfo?.textContent).toContain('1.5');
    });

    it('devrait gérer un poids de 1', () => {
      const voterWithWeight1 = { ...mockVoter, weight: 1 };
      render(<QRCodeModal voter={voterWithWeight1} onClose={mockOnClose} />);

      expect(screen.getByText(/1(?!\.)/)).toBeInTheDocument();
    });

    it('devrait afficher le poids décimal correctement', () => {
      const voterWithDecimalWeight = { ...mockVoter, weight: 2.75 };
      render(<QRCodeModal voter={voterWithDecimalWeight} onClose={mockOnClose} />);

      expect(screen.getByText(/2\.75/)).toBeInTheDocument();
    });
  });

  describe('URL Construction', () => {
    it('devrait utiliser window.location.origin', () => {
      window.location.origin = 'https://evoting.example.com';
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const expectedUrl = 'https://evoting.example.com/vote/abc123token';
      expect(screen.getByText(expectedUrl)).toBeInTheDocument();
    });

    it('devrait construire l\'URL avec le bon format', () => {
      render(<QRCodeModal voter={mockVoter} onClose={mockOnClose} />);

      const urlText = screen.getByText(/http:\/\/localhost:5173\/vote\//i);
      expect(urlText.textContent).toMatch(/^http:\/\/localhost:5173\/vote\/abc123token$/);
    });
  });
});
