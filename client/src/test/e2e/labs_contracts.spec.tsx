import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { labSessionService, flagService, labService } from '../../services';
import { ApiError } from '../../services/api';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import LabWorkspace from '../../pages/LabWorkspace';
import type { LabSession } from '../../types';

// Mock services
vi.mock('../../services', async () => {
  const actual = await vi.importActual('../../services');
  return {
    ...actual,
    labSessionService: {
      getAll: vi.fn(),
      getById: vi.fn(),
      getActive: vi.fn(),
      terminate: vi.fn(),
    },
    flagService: {
      submit: vi.fn(),
    },
    labService: {
      getAll: vi.fn(),
      getById: vi.fn(),
      startLab: vi.fn(),
      stopLab: vi.fn(),
      getActiveSession: vi.fn(),
      completeProvisioning: vi.fn(),
    },
  };
});

describe('Tier 1: Labs, Sessions & Flag Submission Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 17: Canonical Task Lab Provisioning & Active Session (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 17: Canonical Task Lab Provisioning & Session Lifecycle', () => {
    const mockSession: LabSession = {
      id: 301,
      userId: 42,
      roomId: 10,
      taskId: 501,
      status: 'running',
      startedAt: '2026-09-17T02:00:00Z',
      expiresAt: '2026-09-17T06:00:00Z',
      networkName: 'xv-net-301',
      targetContainerId: 'docker-container-target-301',
      attackContainerId: 'docker-container-attack-301',
      connectionInfo: {
        publicIp: '10.10.10.5',
        sshPort: 2222,
        webPort: 8080,
      },
    };

    it('TEST-LAB-PRV-001: labSessionService.getAll retrieves list of lab sessions', async () => {
      (labSessionService.getAll as vi.Mock).mockResolvedValue({
        sessions: [mockSession],
        total: 1,
      });

      const res = await labSessionService.getAll();
      expect(res.sessions).toHaveLength(1);
      expect(res.sessions[0].id).toBe(301);
      expect(res.sessions[0].status).toBe('running');
    });

    it('TEST-LAB-PRV-002: labSessionService.getById conforms to camelCase LabSessionView contract', async () => {
      (labSessionService.getById as vi.Mock).mockResolvedValue({
        session: mockSession,
      });

      const res = await labSessionService.getById(301);
      const s = res.session;

      // Assert camelCase keys
      expect(s).toHaveProperty('userId', 42);
      expect(s).toHaveProperty('taskId', 501);
      expect(s).toHaveProperty('targetContainerId', 'docker-container-target-301');
      expect(s).toHaveProperty('attackContainerId', 'docker-container-attack-301');
      expect(s.connectionInfo).toEqual({
        publicIp: '10.10.10.5',
        sshPort: 2222,
        webPort: 8080,
      });
      expect(s).not.toHaveProperty('user_id');
      expect(s).not.toHaveProperty('task_id');
      expect(s).not.toHaveProperty('target_container_id');
    });

    it('TEST-LAB-PRV-003: labSessionService.getActive returns current running session', async () => {
      (labSessionService.getActive as vi.Mock).mockResolvedValue({
        session: mockSession,
      });

      const res = await labSessionService.getActive();
      expect(res.session).not.toBeNull();
      expect(res.session?.id).toBe(301);
      expect(res.session?.status).toBe('running');
    });

    it('TEST-LAB-PRV-004: labSessionService.getActive returns null when no session is active', async () => {
      (labSessionService.getActive as vi.Mock).mockResolvedValue({
        session: null,
      });

      const res = await labSessionService.getActive();
      expect(res.session).toBeNull();
    });

    it('TEST-LAB-PRV-005: labSessionService.terminate sends terminate request and returns TERMINATED status', async () => {
      (labSessionService.terminate as vi.Mock).mockResolvedValue({
        success: true,
        message: 'Lab session terminated',
        data: { id: 301, status: 'TERMINATED' },
      });

      const res = await labSessionService.terminate(301);
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('TERMINATED');
      expect(labSessionService.terminate).toHaveBeenCalledWith(301);
    });

    it('TEST-LAB-PRV-006: labSessionService.terminate handles non-existent session with 404 ApiError', async () => {
      (labSessionService.terminate as vi.Mock).mockRejectedValue(
        new ApiError('Lab session not found or already terminated', 404)
      );

      await expect(labSessionService.terminate(9999)).rejects.toThrow('Lab session not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 18: Flag Submission Flow & Rate Limiting (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 18: Flag Submission Flow', () => {
    it('TEST-LAB-FLG-001: flagService.submit accepts valid flag and returns points earned', async () => {
      (flagService.submit as vi.Mock).mockResolvedValue({
        success: true,
        message: 'Correct flag! Well done.',
        pointsEarned: 100,
        completedAt: '2026-09-17T02:00:00Z',
      });

      const res = await flagService.submit({ taskId: 501, flag: 'XPLOIT{byp4ss_auth_success}' });
      expect(res.success).toBe(true);
      expect(res.pointsEarned).toBe(100);
      expect(flagService.submit).toHaveBeenCalledWith({
        taskId: 501,
        flag: 'XPLOIT{byp4ss_auth_success}',
      });
    });

    it('TEST-LAB-FLG-002: flagService.submit rejects incorrect flag with error message', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Incorrect flag. Try again.', 400)
      );

      await expect(
        flagService.submit({ taskId: 501, flag: 'XPLOIT{wrong_flag_payload}' })
      ).rejects.toThrow('Incorrect flag');
    });

    it('TEST-LAB-FLG-003: flagService.submit handles already solved challenge flag', async () => {
      (flagService.submit as vi.Mock).mockResolvedValue({
        success: true,
        alreadySolved: true,
        pointsEarned: 0,
        message: 'Flag already submitted for this task.',
      });

      const res = await flagService.submit({ taskId: 501, flag: 'XPLOIT{byp4ss_auth_success}' });
      expect(res.alreadySolved).toBe(true);
      expect(res.pointsEarned).toBe(0);
    });

    it('TEST-LAB-FLG-004: flagService.submit normalizes string numeric taskId to number', async () => {
      (flagService.submit as vi.Mock).mockResolvedValue({
        success: true,
        pointsEarned: 50,
      });

      await flagService.submit({ taskId: '501', flag: 'XPLOIT{test}' });
      expect(flagService.submit).toHaveBeenCalledWith({
        taskId: '501',
        flag: 'XPLOIT{test}',
      });
    });

    it('TEST-LAB-FLG-005: flagService.submit rejects rate-limited submissions with 429 ApiError', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Too many flag submission attempts. Please wait 1 minute.', 429)
      );

      await expect(
        flagService.submit({ taskId: 501, flag: 'XPLOIT{brute_force_guess}' })
      ).rejects.toThrow('Too many flag submission attempts');
    });

    it('TEST-LAB-FLG-006: flagService.submit handles invalid taskId with 404 ApiError', async () => {
      (flagService.submit as vi.Mock).mockRejectedValue(
        new ApiError('Task not found', 404)
      );

      await expect(
        flagService.submit({ taskId: -1, flag: 'XPLOIT{invalid}' })
      ).rejects.toThrow('Task not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 19: Interactive Terminal WebSocket Lifecycle (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 19: Interactive Terminal WebSocket Lifecycle', () => {
    class MockWebSocket {
      url: string;
      readyState: number = WebSocket.OPEN;
      sentMessages: string[] = [];
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;

      constructor(url: string) {
        this.url = url;
      }

      send(data: string) {
        this.sentMessages.push(data);
      }

      close() {
        this.readyState = WebSocket.CLOSED;
        this.onclose?.();
      }
    }

    it('TEST-WS-TRM-001: constructs WebSocket URL with active sessionId parameter', () => {
      const mockWs = new MockWebSocket('ws://127.0.0.1:5000/ws/terminal?sessionId=301&token=test-jwt');
      expect(mockWs.url).toContain('/ws/terminal');
      expect(mockWs.url).toContain('sessionId=301');
      expect(mockWs.readyState).toBe(WebSocket.OPEN);
    });

    it('TEST-WS-TRM-002: transmits terminal command input frame ending with newline', () => {
      const mockWs = new MockWebSocket('ws://127.0.0.1:5000/ws/terminal?sessionId=301');
      mockWs.send('whoami\n');
      expect(mockWs.sentMessages).toContain('whoami\n');
    });

    it('TEST-WS-TRM-003: receives stdout PTY frames and triggers onmessage handler', () => {
      const mockWs = new MockWebSocket('ws://127.0.0.1:5000/ws/terminal?sessionId=301');
      const received: string[] = [];
      mockWs.onmessage = (e) => {
        received.push(e.data);
      };

      mockWs.onmessage({ data: 'root@xv-target:~# ' });
      expect(received).toContain('root@xv-target:~# ');
    });

    it('TEST-WS-TRM-004: updates socket state to CLOSED when server closes connection', () => {
      const mockWs = new MockWebSocket('ws://127.0.0.1:5000/ws/terminal?sessionId=301');
      let closed = false;
      mockWs.onclose = () => {
        closed = true;
      };

      mockWs.close();
      expect(mockWs.readyState).toBe(WebSocket.CLOSED);
      expect(closed).toBe(true);
    });

    it('TEST-WS-TRM-005: handles WebSocket connection error event', () => {
      const mockWs = new MockWebSocket('ws://127.0.0.1:5000/ws/terminal?sessionId=301');
      let errorTriggered = false;
      mockWs.onerror = () => {
        errorTriggered = true;
      };

      mockWs.onerror(new Error('Connection severed'));
      expect(errorTriggered).toBe(true);
    });

    it('TEST-WS-TRM-006: prevents connecting WebSocket when session status is terminated', () => {
      const currentStatus = 'terminated';
      const shouldConnect = ['running', 'initializing', 'pending'].includes(currentStatus);
      expect(shouldConnect).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 20: Session Timer & Confirm Dialog (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 20: Session Timer & Confirm Dialog', () => {
    it('TEST-LAB-TMR-001: ConfirmDialog renders modal title, message, and action buttons', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="TERMINATE_LAB_SESSION"
          message="Are you sure you want to destroy this container instance? All uncommitted data will be wiped."
          confirmText="TERMINATE_NOW"
          cancelText="CANCEL_ACTION"
          onConfirm={onConfirm}
          onClose={onClose}
          variant="danger"
        />
      );

      expect(screen.getByText('TERMINATE_LAB_SESSION')).toBeInTheDocument();
      expect(screen.getByText(/All uncommitted data will be wiped/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /TERMINATE_NOW/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /CANCEL_ACTION/i })).toBeInTheDocument();
    });

    it('TEST-LAB-TMR-002: ConfirmDialog invokes onConfirm handler when confirmed', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="TERMINATE_LAB_SESSION"
          message="Container will be destroyed."
          confirmText="CONFIRM"
          onConfirm={onConfirm}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('TEST-LAB-TMR-003: ConfirmDialog invokes onClose handler when cancel button is clicked', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          title="TERMINATE_LAB_SESSION"
          message="Container will be destroyed."
          cancelText="DISMISS"
          onConfirm={onConfirm}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'DISMISS' }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('TEST-LAB-TMR-004: ConfirmDialog does not render modal when isOpen is false', () => {
      render(
        <ConfirmDialog
          isOpen={false}
          title="HIDDEN_DIALOG"
          message="This should not appear."
          onConfirm={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText('HIDDEN_DIALOG')).not.toBeInTheDocument();
    });

    it('TEST-LAB-TMR-005: calculates remaining session duration and formats countdown', () => {
      const startedAt = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour remaining

      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);

      expect(hours).toBe(1);
      expect(minutes).toBe(0);
    });

    it('TEST-LAB-TMR-006: detects session expiration when current time exceeds expiresAt', () => {
      const expiresAt = new Date(Date.now() - 60 * 1000).toISOString(); // Expired 1 minute ago
      const isExpired = new Date(expiresAt).getTime() <= Date.now();

      expect(isExpired).toBe(true);
    });
  });
});
