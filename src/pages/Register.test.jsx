import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';
import api from '../utils/api';

// Mock du module API
vi.mock('../utils/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock de useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper pour render avec Router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Register Component', () => {
  const mockSetIsAuthenticated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('devrait afficher le titre de l\'application', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);
      expect(screen.getByText(/E-Voting/i)).toBeInTheDocument();
    });

    it('devrait afficher "Créer un compte administrateur"', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);
      expect(screen.getByText(/Créer un compte administrateur/i)).toBeInTheDocument();
    });

    it('devrait afficher tous les champs du formulaire', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      expect(screen.getByLabelText(/Nom complet/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Mot de passe$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirmer le mot de passe/i)).toBeInTheDocument();
    });

    it('devrait afficher le bouton de soumission', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);
      expect(screen.getByRole('button', { name: /Créer mon compte/i })).toBeInTheDocument();
    });

    it('devrait afficher le lien vers la connexion', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      const loginLink = screen.getByRole('link', { name: /Se connecter/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Form Validation', () => {
    it('tous les champs devraient être requis', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      expect(screen.getByLabelText(/Nom complet/i)).toBeRequired();
      expect(screen.getByLabelText(/^Email$/i)).toBeRequired();
      expect(screen.getByLabelText(/^Mot de passe$/i)).toBeRequired();
      expect(screen.getByLabelText(/Confirmer le mot de passe/i)).toBeRequired();
    });

    it('le champ email devrait avoir le type email', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);
      const emailInput = screen.getByLabelText(/^Email$/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('les champs mot de passe devraient avoir le type password', () => {
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);
      const passwordInput = screen.getByLabelText(/^Mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirmer le mot de passe/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('User Interaction', () => {
    it('devrait permettre de saisir tous les champs', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      const nameInput = screen.getByLabelText(/Nom complet/i);
      const emailInput = screen.getByLabelText(/^Email$/i);
      const passwordInput = screen.getByLabelText(/^Mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirmer le mot de passe/i);

      await user.type(nameInput, 'Jean Dupont');
      await user.type(emailInput, 'jean@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      expect(nameInput).toHaveValue('Jean Dupont');
      expect(emailInput).toHaveValue('jean@example.com');
      expect(passwordInput).toHaveValue('password123');
      expect(confirmPasswordInput).toHaveValue('password123');
    });

    it('devrait afficher "Création..." pendant la soumission', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Création.../i)).toBeInTheDocument();
      });
    });

    it('le bouton devrait être désactivé pendant la soumission', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Client-Side Validation', () => {
    it('devrait afficher une erreur si les mots de passe ne correspondent pas', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'differentpassword');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Les mots de passe ne correspondent pas/i)).toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('devrait afficher une erreur si le mot de passe est trop court', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), '12345');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), '12345');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Le mot de passe doit contenir au moins 6 caractères/i)).toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalled();
    });

    it('ne devrait pas afficher d\'erreur avec un mot de passe de 6 caractères', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: { id: '1', email: 'jean@example.com', name: 'Jean Dupont' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), '123456');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), '123456');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalled();
      });
    });
  });

  describe('Successful Registration', () => {
    it('devrait envoyer les données correctes à l\'API', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: { id: '1', email: 'jean@example.com', name: 'Jean Dupont' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/register', {
          name: 'Jean Dupont',
          email: 'jean@example.com',
          password: 'password123',
        });
      });
    });

    it('ne devrait pas envoyer confirmPassword à l\'API', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: { id: '1', email: 'jean@example.com', name: 'Jean Dupont' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        const callArgs = api.post.mock.calls[0][1];
        expect(callArgs).not.toHaveProperty('confirmPassword');
      });
    });

    it('devrait stocker le token dans localStorage', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token-xyz',
          user: { id: '1', email: 'jean@example.com', name: 'Jean Dupont' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('fake-token-xyz');
      });
    });

    it('devrait stocker les données utilisateur dans localStorage', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'jean@example.com', name: 'Jean Dupont', role: 'admin' };
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: mockUser,
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
      });
    });

    it('devrait appeler setIsAuthenticated avec true', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: { id: '1', email: 'jean@example.com' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true);
      });
    });

    it('devrait rediriger vers /dashboard', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: { id: '1', email: 'jean@example.com' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Failed Registration', () => {
    it('devrait afficher un message d\'erreur en cas d\'échec', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Cet email est déjà utilisé',
          },
        },
      });

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Cet email est déjà utilisé/i)).toBeInTheDocument();
      });
    });

    it('devrait afficher un message d\'erreur générique si pas de détails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Erreur lors de l'inscription/i)).toBeInTheDocument();
      });
    });

    it('ne devrait pas stocker de token en cas d\'échec', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Email already exists' } },
      });

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
      });
    });

    it('ne devrait pas appeler setIsAuthenticated en cas d\'échec', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Error' } },
      });

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Error/i)).toBeInTheDocument();
      });

      expect(mockSetIsAuthenticated).not.toHaveBeenCalled();
    });

    it('le bouton devrait redevenir actif après une erreur', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Error' } },
      });

      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Clearing', () => {
    it('devrait effacer l\'erreur lors d\'une nouvelle soumission', async () => {
      const user = userEvent.setup();

      // Première tentative avec mots de passe différents
      renderWithRouter(<Register setIsAuthenticated={mockSetIsAuthenticated} />);

      await user.type(screen.getByLabelText(/Nom complet/i), 'Jean Dupont');
      await user.type(screen.getByLabelText(/^Email$/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^Mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/Confirmer le mot de passe/i), 'different');

      let submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Les mots de passe ne correspondent pas/i)).toBeInTheDocument();
      });

      // Deuxième tentative correcte
      const confirmPasswordInput = screen.getByLabelText(/Confirmer le mot de passe/i);
      await user.clear(confirmPasswordInput);
      await user.type(confirmPasswordInput, 'password123');

      api.post.mockResolvedValueOnce({
        data: { token: 'fake-token', user: { id: '1' } },
      });

      submitButton = screen.getByRole('button', { name: /Créer mon compte/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/Les mots de passe ne correspondent pas/i)).not.toBeInTheDocument();
      });
    });
  });
});
