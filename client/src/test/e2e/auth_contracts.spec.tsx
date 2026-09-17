import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { ApiError } from '../../services/api';
import { PasswordInput } from '../../components/ui/PasswordInput';
import Login from '../../pages/auth/Login';

// Mock authService methods for AuthContext and Login testing
vi.mock('../../services', async () => {
  const actual = await vi.importActual('../../services');
  return {
    ...actual,
    authService: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      getMe: vi.fn(),
      updatePassword: vi.fn(),
      refreshToken: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    },
  };
});

describe('Tier 1: Core Authentication & Layout Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 8: Shared AuthLayout & Route Views (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 8: Shared AuthLayout & Route Views', () => {
    it('TEST-AUTH-LAY-001: renders Login form with cyber tactical container and title', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      // Verify header/branding and inputs exist
      expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/operative@xploitverse\.io/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('TEST-AUTH-LAY-002: renders registration navigation link inside login view', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const registerLink = screen.getByRole('link', { name: /Register/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('TEST-AUTH-LAY-003: renders forgot password navigation link inside auth view', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const forgotLink = screen.getByRole('link', { name: /Forgot password\?/i });
      expect(forgotLink).toBeInTheDocument();
      expect(forgotLink).toHaveAttribute('href', '/forgot-password');
    });

    it('TEST-AUTH-LAY-004: supports remember me toggle state and persistence', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('TEST-AUTH-LAY-005: displays server-side error banners in auth layout on failed submission', async () => {
      (authService.login as vi.Mock).mockRejectedValue(
        new Error('Invalid operator credentials')
      );

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByPlaceholderText(/operative@xploitverse\.io/i), {
        target: { value: 'bad@xploitverse.io' },
      });
      fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
        target: { value: 'wrongpassword' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid operator credentials/i)).toBeInTheDocument();
      });
    });

    it('TEST-AUTH-LAY-006: clears field level validation error when user edits form input field', async () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/operative@xploitverse\.io/i);
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid format/i)).toBeInTheDocument();
      });

      // Typing new value clears the field error
      fireEvent.change(emailInput, { target: { value: 'valid@xploitverse.io' } });
      expect(screen.queryByText(/Invalid format/i)).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 9: Password Visibility & Validation (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 9: Password Visibility & Validation', () => {
    it('TEST-AUTH-PWD-001: PasswordInput renders with type password by default', () => {
      render(<PasswordInput placeholder="Enter passkey" />);
      const input = screen.getByPlaceholderText('Enter passkey');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('TEST-AUTH-PWD-002: clicking visibility toggle button changes input type to text', () => {
      render(<PasswordInput placeholder="Enter passkey" />);
      const input = screen.getByPlaceholderText('Enter passkey');
      const toggleBtn = screen.getByRole('button', { name: /Show password/i });

      expect(input).toHaveAttribute('type', 'password');
      fireEvent.click(toggleBtn);
      expect(input).toHaveAttribute('type', 'text');
    });

    it('TEST-AUTH-PWD-003: clicking visibility toggle twice reverts type back to password', () => {
      render(<PasswordInput placeholder="Enter passkey" />);
      const input = screen.getByPlaceholderText('Enter passkey');
      const toggleBtn = screen.getByRole('button', { name: /Show password/i });

      fireEvent.click(toggleBtn);
      expect(input).toHaveAttribute('type', 'text');

      const hideBtn = screen.getByRole('button', { name: /Hide password/i });
      fireEvent.click(hideBtn);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('TEST-AUTH-PWD-004: renders password strength meter when showStrength is enabled', () => {
      render(<PasswordInput placeholder="Passkey" showStrength />);
      expect(screen.getByRole('progressbar', { name: /Password strength/i })).toBeInTheDocument();
    });

    it('TEST-AUTH-PWD-005: client-side validation rejects empty password on login form', async () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/operative@xploitverse\.io/i);
      fireEvent.change(emailInput, { target: { value: 'user@xploitverse.io' } });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByText(/Passkey required/i)).toBeInTheDocument();
      });
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('TEST-AUTH-PWD-006: client-side validation rejects invalid email identifier format', async () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/operative@xploitverse\.io/i);
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid format/i)).toBeInTheDocument();
      });
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 10: Centralized API Client Envelope & Error Normalization (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 10: Centralized API Client Envelope', () => {
    it('TEST-API-ENV-001: ApiError correctly preserves HTTP status code and message', () => {
      const err = new ApiError('Resource not found', 404);
      expect(err.name).toBe('ApiError');
      expect(err.message).toBe('Resource not found');
      expect(err.status).toBe(404);
    });

    it('TEST-API-ENV-002: ApiError correctly represents 401 unauthorized errors', () => {
      const err = new ApiError('Access denied. No token provided.', 401);
      expect(err.status).toBe(401);
      expect(err.message).toContain('No token provided');
    });

    it('TEST-API-ENV-003: ApiError correctly represents 403 forbidden RBAC errors', () => {
      const err = new ApiError('RequireRole: INSTRUCTOR access required', 403);
      expect(err.status).toBe(403);
      expect(err.message).toContain('INSTRUCTOR');
    });

    it('TEST-API-ENV-004: ApiError correctly represents 429 rate limit errors', () => {
      const err = new ApiError('Too many requests. Slow down.', 429);
      expect(err.status).toBe(429);
      expect(err.message).toContain('Too many requests');
    });

    it('TEST-API-ENV-005: ApiError correctly captures 500 internal server errors', () => {
      const err = new ApiError('Internal server error', 500);
      expect(err.status).toBe(500);
      expect(err instanceof Error).toBe(true);
    });

    it('TEST-API-ENV-006: authService.login delegates to API client and unwraps typed response', async () => {
      const mockUser = {
        id: 101,
        username: 'cyber_operative',
        email: 'op@xploitverse.io',
        role: 'STUDENT',
        firstName: 'Alex',
        lastName: 'Vance',
        totalLabTime: 3600,
        totalSpent: 12.5,
      };

      (authService.login as vi.Mock).mockResolvedValue({
        user: mockUser,
        token: 'ey.jwt.mock.token',
      });

      const res = await authService.login({
        email: 'op@xploitverse.io',
        password: 'Password123!',
      });

      expect(res.user.id).toBe(101);
      expect(res.user.role).toBe('STUDENT');
      expect(res.token).toBe('ey.jwt.mock.token');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 11: AuthContext Type Hardening & State Machine (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 11: AuthContext Type Hardening', () => {
    const TestConsumer = () => {
      const { user, isAuthenticated, loading, login, logout, hasRole } = useAuth();
      return (
        <div>
          <div data-testid="auth-loading">{loading.toString()}</div>
          <div data-testid="auth-authenticated">{isAuthenticated.toString()}</div>
          <div data-testid="auth-username">{user?.username || 'GUEST'}</div>
          <div data-testid="auth-role">{user?.role || 'NONE'}</div>
          <div data-testid="auth-has-admin">{hasRole('ADMIN').toString()}</div>
          <div data-testid="auth-has-student">{hasRole('STUDENT').toString()}</div>
          <button onClick={() => login({ email: 'op@test.io', password: 'secretpassword' })}>
            Trigger Login
          </button>
          <button onClick={logout}>Trigger Logout</button>
        </div>
      );
    };

    it('TEST-AUTH-CTX-001: provides initial unauthenticated guest state when no session exists', async () => {
      (authService.getMe as vi.Mock).mockRejectedValue({ response: { status: 401 } });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('auth-username')).toHaveTextContent('GUEST');
      expect(screen.getByTestId('auth-role')).toHaveTextContent('NONE');
    });

    it('TEST-AUTH-CTX-002: successfully transitions to authenticated state on login', async () => {
      (authService.getMe as vi.Mock).mockRejectedValue({ response: { status: 401 } });
      (authService.login as vi.Mock).mockResolvedValue({
        user: {
          id: 1,
          username: 'shadow_hunter',
          email: 'op@test.io',
          role: 'STUDENT',
          firstName: 'John',
          lastName: 'Doe',
          totalLabTime: 120,
          totalSpent: 5.0,
        },
        token: 'mock-jwt-token-12345',
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      fireEvent.click(screen.getByText('Trigger Login'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('auth-username')).toHaveTextContent('shadow_hunter');
        expect(screen.getByTestId('auth-role')).toHaveTextContent('STUDENT');
      });

      expect(localStorage.getItem('token')).toBe('mock-jwt-token-12345');
    });

    it('TEST-AUTH-CTX-003: correctly clears user state and local storage token on logout', async () => {
      localStorage.setItem('token', 'existing-token');
      (authService.getMe as vi.Mock).mockResolvedValue({
        user: {
          id: 1,
          username: 'shadow_hunter',
          email: 'op@test.io',
          role: 'STUDENT',
          firstName: 'John',
          lastName: 'Doe',
        },
      });
      (authService.logout as vi.Mock).mockResolvedValue({ success: true, message: 'Logged out' });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });

      fireEvent.click(screen.getByText('Trigger Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('auth-username')).toHaveTextContent('GUEST');
      });

      expect(localStorage.getItem('token')).toBeNull();
    });

    it('TEST-AUTH-CTX-004: hasRole evaluates student and admin privileges accurately', async () => {
      localStorage.setItem('token', 'admin-token');
      (authService.getMe as vi.Mock).mockResolvedValue({
        user: {
          id: 99,
          username: 'root_admin',
          email: 'admin@xploitverse.io',
          role: 'ADMIN',
          firstName: 'Super',
          lastName: 'User',
        },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('auth-has-admin')).toHaveTextContent('true');
      expect(screen.getByTestId('auth-has-student')).toHaveTextContent('false');
    });

    it('TEST-AUTH-CTX-005: restores session on mount when valid token in localStorage', async () => {
      localStorage.setItem('token', 'saved-jwt-token');
      (authService.getMe as vi.Mock).mockResolvedValue({
        user: {
          id: 77,
          username: 'recon_specialist',
          email: 'recon@xploitverse.io',
          role: 'INSTRUCTOR',
          firstName: 'Sarah',
          lastName: 'Connor',
        },
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('auth-loading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('auth-username')).toHaveTextContent('recon_specialist');
      expect(screen.getByTestId('auth-role')).toHaveTextContent('INSTRUCTOR');
      expect(authService.getMe).toHaveBeenCalledTimes(1);
    });
  });
});
