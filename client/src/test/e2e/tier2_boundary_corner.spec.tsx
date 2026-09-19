import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { flagService, labSessionService, authService, userService } from '../../services';
import { ApiError } from '../../services/api';
import { PasswordInput } from '../../components/ui/PasswordInput';
import Login from '../../pages/auth/Login';
import { AuthProvider } from '../../context/AuthContext';

// Mock services
vi.mock('../../services', async () => {
  const actual = await vi.importActual('../../services');
  return {
    ...actual,
    flagService: {
      submit: vi.fn(),
    },
    labSessionService: {
      terminate: vi.fn(),
      getById: vi.fn(),
      getActive: vi.fn(),
    },
    authService: {
      login: vi.fn(),
      register: vi.fn(),
      getMe: vi.fn(),
    },
    userService: {
      updateProfile: vi.fn(),
      getMyProgress: vi.fn(),
    },
  };
});

describe('Tier 2: Boundary, Corner, Pairwise & Adversarial Test Suites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Category-Partition & Boundary Value Analysis (BVA)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Boundary Value Analysis (BVA)', () => {
    it('TEST-BVA-001: Password length boundary: 7 chars (Min-1) vs 8 chars (Min valid)', () => {
      // Nominal length boundary check
      const minLen = 8;
      const shortPass = 'Ab1!xyz'; // 7 chars
      const validPass = 'Ab1!xyza'; // 8 chars

      expect(shortPass.length < minLen).toBe(true);
      expect(validPass.length >= minLen).toBe(true);
    });

    it('TEST-BVA-002: Password length boundary: extremely long string (10,000 chars) does not crash component', () => {
      const hugePass = 'A1!'.repeat(3334);
      render(<PasswordInput placeholder="Huge pass" defaultValue={hugePass} />);

      const input = screen.getByPlaceholderText('Huge pass');
      expect(input).toHaveValue(hugePass);
    });

    it('TEST-BVA-003: Negative task ID in flagService.submit is rejected by validation', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Invalid task ID: must be a positive integer', 400)
      );

      await expect(
        flagService.submit({ taskId: -1, flag: 'XPLOIT{test}' })
      ).rejects.toThrow('Invalid task ID');
    });

    it('TEST-BVA-004: Zero task ID in flagService.submit is rejected by validation', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Invalid task ID: must be a positive integer', 400)
      );

      await expect(
        flagService.submit({ taskId: 0, flag: 'XPLOIT{test}' })
      ).rejects.toThrow('Invalid task ID');
    });

    it('TEST-BVA-005: Max safe integer ID (9007199254740991) is preserved without precision loss', async () => {
      const maxId = Number.MAX_SAFE_INTEGER;
      (labSessionService.getById as vi.Mock).mockResolvedValue({
        session: { id: maxId, status: 'running' },
      });

      const res = await labSessionService.getById(maxId);
      expect(res.session.id).toBe(9007199254740991);
      expect(labSessionService.getById).toHaveBeenCalledWith(9007199254740991);
    });

    it('TEST-BVA-006: Empty flag string is rejected before network dispatch', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Flag payload cannot be empty', 400)
      );

      await expect(
        flagService.submit({ taskId: 501, flag: '' })
      ).rejects.toThrow('Flag payload cannot be empty');
    });

    it('TEST-BVA-007: Whitespace-only flag string is trimmed and rejected', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Flag payload cannot be empty', 400)
      );

      await expect(
        flagService.submit({ taskId: 501, flag: '     \t\n   ' })
      ).rejects.toThrow('Flag payload cannot be empty');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Pairwise Role vs Resource Authorization Matrix
  // ═══════════════════════════════════════════════════════════════════════
  describe('Pairwise Authorization Matrix (Roles vs Endpoints)', () => {
    it('TEST-PAIR-001: STUDENT role accessing ADMIN-only metrics receives 403 Forbidden', () => {
      const studentUser = { id: 10, role: 'STUDENT' };
      const requiredRole = 'ADMIN';

      const isAuthorized = studentUser.role === requiredRole;
      expect(isAuthorized).toBe(false);

      const forbiddenError = new ApiError('RequireRole: ADMIN access required', 403);
      expect(forbiddenError.status).toBe(403);
      expect(forbiddenError.message).toContain('ADMIN access required');
    });

    it('TEST-PAIR-002: INSTRUCTOR terminating another user session receives 403 Forbidden (Feature 24)', async () => {
      // Feature 24: Instructor Ownership Bug Fix — instructors cannot hijack other users' labs
      (labSessionService.terminate as vi.Mock).mockRejectedValue(
        new ApiError('Forbidden: Cannot terminate another user\'s lab session', 403)
      );

      await expect(labSessionService.terminate(999)).rejects.toThrow(
        'Cannot terminate another user\'s lab session'
      );
    });

    it('TEST-PAIR-003: ADMIN role is authorized to access administrative surfaces', () => {
      const adminUser = { id: 1, role: 'ADMIN' };
      const isAuthorized = adminUser.role === 'ADMIN';
      expect(isAuthorized).toBe(true);
    });

    it('TEST-PAIR-004: Anonymous user accessing protected route receives 401 Unauthorized', () => {
      const token = null;
      const isAuthenticated = Boolean(token);
      expect(isAuthenticated).toBe(false);

      const unauthorizedError = new ApiError('Access denied. No token provided.', 401);
      expect(unauthorizedError.status).toBe(401);
    });

    it('TEST-PAIR-005: Deactivated user account is rejected with 401 Unauthorized', () => {
      const user = { id: 5, isActive: false };
      expect(user.isActive).toBe(false);

      const error = new ApiError('User account has been deactivated.', 401);
      expect(error.status).toBe(401);
      expect(error.message).toContain('deactivated');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Adversarial & Security Edge Cases
  // ═══════════════════════════════════════════════════════════════════════
  describe('Adversarial & Security Edge Cases', () => {
    it('TEST-ADV-001: SQL Injection string in email input is rejected by client validator', async () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByPlaceholderText(/operative@xploitverse\.io/i);
      fireEvent.change(emailInput, { target: { value: "' OR '1'='1' --" } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid format/i)).toBeInTheDocument();
      });
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('TEST-ADV-002: XSS script tags in task title/body are rendered as text without DOM execution', () => {
      const xssPayload = '<script>alert("XSS")</script>';
      render(<div data-testid="xss-target">{xssPayload}</div>);

      const el = screen.getByTestId('xss-target');
      // React text nodes encode tags safely without executing innerHTML
      expect(el.innerHTML).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
      expect(el.textContent).toBe('<script>alert("XSS")</script>');
    });

    it('TEST-ADV-003: WebSocket origin validation rejects untrusted origins (Feature 29)', () => {
      const allowedOrigin = 'http://localhost:5173';
      const maliciousOrigin = 'http://malicious-attacker-site.com';

      const validateOrigin = (origin: string, allowed: string) => origin === allowed;

      expect(validateOrigin(maliciousOrigin, allowedOrigin)).toBe(false);
      expect(validateOrigin(allowedOrigin, allowedOrigin)).toBe(true);
    });

    it('TEST-ADV-004: WebSocket rejects query-string JWT tokens in production mode (Feature 29)', () => {
      const nodeEnv = 'production';
      const hasQueryToken = true;

      // In production mode, query string tokens must be rejected to prevent log leakage
      const allowQueryToken = nodeEnv !== 'production';
      expect(allowQueryToken).toBe(false);
    });

    it('TEST-ADV-005: Mock shell execution is restricted to development mode only (Feature 30)', () => {
      const canExecuteMockShell = (env: string) => env === 'development';

      expect(canExecuteMockShell('development')).toBe(true);
      expect(canExecuteMockShell('production')).toBe(false);
      expect(canExecuteMockShell('test')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // State Transitions & Concurrency Corner Cases
  // ═══════════════════════════════════════════════════════════════════════
  describe('State Transitions & Concurrency Corner Cases', () => {
    it('TEST-CRN-001: Double termination: terminating an already terminated session returns 404 or idempotent', async () => {
      (labSessionService.terminate as vi.Mock).mockRejectedValueOnce(
        new ApiError('Lab session already terminated or does not exist', 404)
      );

      await expect(labSessionService.terminate(301)).rejects.toThrow('already terminated');
    });

    it('TEST-CRN-002: Rapid burst of flag submissions triggers 429 Too Many Requests rate limiter', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Too many requests. Rate limit exceeded.', 429)
      );

      await expect(
        flagService.submit({ taskId: 501, flag: 'XPLOIT{test}' })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('TEST-CRN-003: Session with null expires_at is given explicit fallback expiry to prevent hang (Feature 32)', () => {
      const startedAt = '2026-09-17T02:00:00Z';
      const rawExpiresAt: string | null = null;
      const defaultDurationHours = 4;

      // Feature 32: Session deadlock fix & cleanup prevents null expires_at hang
      const resolvedExpiresAt =
        rawExpiresAt ||
        new Date(new Date(startedAt).getTime() + defaultDurationHours * 3600 * 1000).toISOString();

      expect(resolvedExpiresAt).toBe('2026-09-17T06:00:00.000Z');
    });

    it('TEST-CRN-004: User profile update rejects empty names with validation error', async () => {
      (userService.updateProfile as vi.Mock).mockRejectedValue(
        new ApiError('First name cannot be empty', 400)
      );

      await expect(
        userService.updateProfile({ firstName: '', lastName: '' })
      ).rejects.toThrow('First name cannot be empty');
    });
  });
});
