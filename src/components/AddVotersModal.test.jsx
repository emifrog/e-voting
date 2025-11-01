import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddVotersModal from './AddVotersModal';
import api from '../utils/api';

// Mock du module API
vi.mock('../utils/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('AddVotersModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockElectionId = 'election-123';

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
    global.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Rendering', () => {
    it('devrait afficher le titre "Ajouter des électeurs"', () => {
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/Ajouter des électeurs/i)).toBeInTheDocument();
    });

    it('devrait afficher les deux onglets', () => {
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText(/Ajout manuel/i)).toBeInTheDocument();
      expect(screen.getByText(/Import CSV/i)).toBeInTheDocument();
    });

    it('devrait afficher le mode manuel par défaut', () => {
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByPlaceholderText(/Email \*/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Nom \*/i)).toBeInTheDocument();
    });

    it('devrait afficher le bouton de fermeture', () => {
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = screen.getAllByRole('button').find(btn =>
        btn.classList.contains('modal-close')
      );
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('devrait passer au mode CSV quand on clique sur l\'onglet CSV', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      expect(screen.getByLabelText(/Fichier CSV/i)).toBeInTheDocument();
      expect(screen.getByText(/Format du fichier CSV/i)).toBeInTheDocument();
    });

    it('devrait revenir au mode manuel quand on clique sur l\'onglet manuel', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      const manualTab = screen.getByText(/Ajout manuel/i);
      await user.click(manualTab);

      expect(screen.getByPlaceholderText(/Email \*/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Nom \*/i)).toBeInTheDocument();
    });
  });

  describe('Manual Mode - Voter Management', () => {
    it('devrait afficher une ligne d\'électeur par défaut', () => {
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInputs = screen.getAllByPlaceholderText(/Email \*/i);
      expect(emailInputs).toHaveLength(1);
    });

    it('devrait ajouter une nouvelle ligne quand on clique sur "Ajouter une ligne"', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const addButton = screen.getByRole('button', { name: /Ajouter une ligne/i });
      await user.click(addButton);

      const emailInputs = screen.getAllByPlaceholderText(/Email \*/i);
      expect(emailInputs).toHaveLength(2);
    });

    it('devrait permettre d\'ajouter plusieurs lignes', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const addButton = screen.getByRole('button', { name: /Ajouter une ligne/i });
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);

      const emailInputs = screen.getAllByPlaceholderText(/Email \*/i);
      expect(emailInputs).toHaveLength(4);
    });

    it('devrait permettre de supprimer une ligne', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const addButton = screen.getByRole('button', { name: /Ajouter une ligne/i });
      await user.click(addButton);

      const deleteButtons = screen.getAllByRole('button').filter(btn =>
        btn.querySelector('svg')
      );
      const trashButton = deleteButtons.find(btn => btn.className.includes('btn-danger'));

      if (trashButton) {
        await user.click(trashButton);
      }

      const emailInputs = screen.getAllByPlaceholderText(/Email \*/i);
      expect(emailInputs).toHaveLength(1);
    });

    it('ne devrait pas afficher le bouton supprimer s\'il n\'y a qu\'une ligne', () => {
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const deleteButtons = screen.queryAllByRole('button').filter(btn =>
        btn.className.includes('btn-danger')
      );
      expect(deleteButtons).toHaveLength(0);
    });

    it('devrait permettre de saisir email et nom', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText(/Email \*/i);
      const nameInput = screen.getByPlaceholderText(/Nom \*/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(nameInput, 'Jean Dupont');

      expect(emailInput).toHaveValue('test@example.com');
      expect(nameInput).toHaveValue('Jean Dupont');
    });
  });

  describe('Manual Mode - Form Submission', () => {
    it('devrait afficher une erreur si aucun électeur valide', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Ajouter 0 électeur/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Veuillez ajouter au moins un électeur avec email et nom/i)).toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('devrait envoyer les électeurs à l\'API', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({
        data: { message: '2 électeurs ajoutés avec succès' },
      });

      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Ajouter premier électeur
      const emailInput = screen.getByPlaceholderText(/Email \*/i);
      const nameInput = screen.getByPlaceholderText(/Nom \*/i);
      await user.type(emailInput, 'voter1@example.com');
      await user.type(nameInput, 'Voter One');

      // Ajouter deuxième électeur
      const addButton = screen.getByRole('button', { name: /Ajouter une ligne/i });
      await user.click(addButton);

      const emailInputs = screen.getAllByPlaceholderText(/Email \*/i);
      const nameInputs = screen.getAllByPlaceholderText(/Nom \*/i);

      await user.type(emailInputs[1], 'voter2@example.com');
      await user.type(nameInputs[1], 'Voter Two');

      const submitButton = screen.getByRole('button', { name: /Ajouter 2 électeur/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(`/elections/${mockElectionId}/voters`, {
          voters: [
            { email: 'voter1@example.com', name: 'Voter One', weight: 1.0 },
            { email: 'voter2@example.com', name: 'Voter Two', weight: 1.0 },
          ],
        });
      });
    });

    it('devrait filtrer les lignes vides avant l\'envoi', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({
        data: { message: '1 électeur ajouté' },
      });

      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Ajouter électeur valide
      const emailInput = screen.getByPlaceholderText(/Email \*/i);
      const nameInput = screen.getByPlaceholderText(/Nom \*/i);
      await user.type(emailInput, 'voter1@example.com');
      await user.type(nameInput, 'Voter One');

      // Ajouter ligne vide
      const addButton = screen.getByRole('button', { name: /Ajouter une ligne/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /Ajouter 1 électeur/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(`/elections/${mockElectionId}/voters`, {
          voters: [{ email: 'voter1@example.com', name: 'Voter One', weight: 1.0 }],
        });
      });
    });

    it('devrait afficher un message de succès et fermer la modal', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({
        data: { message: 'Électeurs ajoutés avec succès' },
      });

      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText(/Email \*/i);
      const nameInput = screen.getByPlaceholderText(/Nom \*/i);
      await user.type(emailInput, 'voter@example.com');
      await user.type(nameInput, 'Voter');

      const submitButton = screen.getByRole('button', { name: /Ajouter 1 électeur/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Électeurs ajoutés avec succès');
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('devrait afficher une erreur en cas d\'échec', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: {
          data: { error: 'Email déjà utilisé' },
        },
      });

      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText(/Email \*/i);
      const nameInput = screen.getByPlaceholderText(/Nom \*/i);
      await user.type(emailInput, 'duplicate@example.com');
      await user.type(nameInput, 'Duplicate');

      const submitButton = screen.getByRole('button', { name: /Ajouter 1 électeur/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email déjà utilisé/i)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('devrait afficher "Ajout en cours..." pendant la soumission', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const emailInput = screen.getByPlaceholderText(/Email \*/i);
      const nameInput = screen.getByPlaceholderText(/Nom \*/i);
      await user.type(emailInput, 'voter@example.com');
      await user.type(nameInput, 'Voter');

      const submitButton = screen.getByRole('button', { name: /Ajouter 1 électeur/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Ajout en cours.../i)).toBeInTheDocument();
      });
    });
  });

  describe('CSV Mode', () => {
    it('devrait afficher le formulaire CSV quand on bascule', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      expect(screen.getByText(/Fichier CSV/i)).toBeInTheDocument();
      expect(screen.getByText(/Format du fichier CSV/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Importer/i })).toBeInTheDocument();
    });

    it('devrait afficher les instructions de format CSV', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      expect(screen.getByText(/email, name, weight/i)).toBeInTheDocument();
      expect(screen.getByText(/Première ligne : en-têtes/i)).toBeInTheDocument();
      expect(screen.getByText(/Encodage : UTF-8/i)).toBeInTheDocument();
    });

    it('devrait permettre de télécharger un modèle CSV', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

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

      const downloadButton = screen.getByRole('button', { name: /Télécharger un modèle/i });
      await user.click(downloadButton);

      expect(mockAnchor.download).toBe('modele_electeurs.csv');
      expect(mockAnchor.click).toHaveBeenCalled();

      document.createElement = originalCreateElement;
    });

    it('devrait afficher le nom du fichier sélectionné', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      const file = new File(['email,name,weight\ntest@test.com,Test,1.0'], 'voters.csv', {
        type: 'text/csv',
      });

      const fileInput = container.querySelector('input[type="file"]');
      await user.upload(fileInput, file);

      expect(screen.getByText(/Fichier sélectionné : voters.csv/i)).toBeInTheDocument();
    });

    it('devrait afficher une erreur si aucun fichier sélectionné', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      const submitButton = screen.getByRole('button', { name: /Importer/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Veuillez sélectionner un fichier CSV/i)).toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('devrait envoyer le fichier CSV à l\'API', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({
        data: { message: '5 électeurs importés' },
      });

      const { container } = render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      const file = new File(['email,name,weight\ntest@test.com,Test,1.0'], 'voters.csv', {
        type: 'text/csv',
      });

      const fileInput = container.querySelector('input[type="file"]');
      await user.upload(fileInput, file);

      const submitButton = screen.getByRole('button', { name: /Importer/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          `/elections/${mockElectionId}/voters/import`,
          expect.any(FormData),
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      });
    });

    it('devrait fermer la modal après un import réussi', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({
        data: { message: 'Import réussi' },
      });

      const { container } = render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const csvTab = screen.getByText(/Import CSV/i);
      await user.click(csvTab);

      const file = new File(['email,name,weight'], 'voters.csv', { type: 'text/csv' });
      const fileInput = container.querySelector('input[type="file"]');
      await user.upload(fileInput, file);

      const submitButton = screen.getByRole('button', { name: /Importer/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Interaction', () => {
    it('devrait fermer la modal quand on clique sur le bouton Annuler', async () => {
      const user = userEvent.setup();
      render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Annuler/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('devrait fermer la modal quand on clique sur l\'overlay', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        await user.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('ne devrait pas fermer quand on clique sur le contenu', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AddVotersModal
          electionId={mockElectionId}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const modalContent = container.querySelector('.modal');
      if (modalContent) {
        await user.click(modalContent);
        expect(mockOnClose).not.toHaveBeenCalled();
      }
    });
  });
});
