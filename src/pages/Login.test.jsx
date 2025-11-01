import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
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

describe('Login Component', () => {
  const mockSetIsAuthenticated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('devrait afficher le titre de l\'application', () => {
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);
      expect(screen.getByText(/E-Voting/i)).toBeInTheDocument();
    });

    it('devrait afficher le formulaire de connexion', () => {
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mot de passe/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument();
    });

    it('devrait afficher le lien vers l\'inscription', () => {
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const registerLink = screen.getByRole('link', { name: /S'inscrire/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('devrait avoir les placeholders corrects', () => {
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      expect(screen.getByPlaceholderText(/admin@example.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('les champs email et password devraient être requis', () => {
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    it('le champ email devrait avoir le type email', () => {
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('le champ password devrait avoir le type password', () => {
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('User Interaction', () => {
    it('devrait permettre de saisir un email', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('devrait permettre de saisir un mot de passe', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('devrait afficher "Connexion..." pendant la soumission', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Connexion.../i)).toBeInTheDocument();
      });
    });

    it('le bouton devrait être désactivé pendant la soumission', async () => {
      const user = userEvent.setup();
      api.post.mockImplementation(() => new Promise(() => {}));

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Successful Login', () => {
    it('devrait envoyer les données correctes à l\'API', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('devrait stocker le token dans localStorage', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          token: 'fake-token-12345',
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('fake-token-12345');
      });
    });

    it('devrait stocker les données utilisateur dans localStorage', async () => {
      const user = userEvent.setup();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', role: 'admin' };
      const mockResponse = {
        data: {
          token: 'fake-token',
          user: mockUser,
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
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
          user: { id: '1', email: 'test@example.com' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
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
          user: { id: '1', email: 'test@example.com' },
        },
      };
      api.post.mockResolvedValueOnce(mockResponse);

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Failed Login', () => {
    it('devrait afficher un message d\'erreur en cas d\'échec', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Email ou mot de passe incorrect',
          },
        },
      });

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Email ou mot de passe incorrect/i)).toBeInTheDocument();
      });
    });

    it('devrait afficher un message d\'erreur générique si pas de détails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Erreur de connexion/i)).toBeInTheDocument();
      });
    });

    it('ne devrait pas stocker de token en cas d\'échec', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
      });

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeNull();
      });
    });

    it('ne devrait pas appeler setIsAuthenticated en cas d\'échec', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
      });

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });

      expect(mockSetIsAuthenticated).not.toHaveBeenCalled();
    });

    it('le bouton devrait redevenir actif après une erreur', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Error' } },
      });

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Clearing', () => {
    it('devrait effacer l\'erreur lors d\'une nouvelle soumission', async () => {
      const user = userEvent.setup();

      // Première tentative échouée
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Première erreur' } },
      });

      renderWithRouter(<Login setIsAuthenticated={mockSetIsAuthenticated} />);

      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /Se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrong');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Première erreur/i)).toBeInTheDocument();
      });

      // Deuxième tentative - l'erreur devrait disparaître
      api.post.mockResolvedValueOnce({
        data: { token: 'fake-token', user: { id: '1' } },
      });

      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/Première erreur/i)).not.toBeInTheDocument();
      });
    });
  });
});
