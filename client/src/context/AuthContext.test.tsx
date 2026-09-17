import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { vi } from 'vitest';

vi.mock('../services', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

import { authService } from '../services';

const TestComponent = () => {
  const { user, loading, isAuthenticated, login, register, logout, hasRole } = useAuth();
  return (
    <div>
      <span data-testid="user">{user?.username || 'null'}</span>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="authenticated">{isAuthenticated.toString()}</span>
      <button onClick={() => login({ email: 'test@test.com', password: '123456' })}>Login</button>
      <button onClick={() => register({ username: 'test', email: 'test@test.com', password: '123456' })}>Register</button>
      <button onClick={logout}>Logout</button>
      <span data-testid="has-role-admin">{hasRole('ADMIN').toString()}</span>
    </div>
  );
};

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides initial state with no user', async () => {
    (authService.getMe as vi.Mock).mockRejectedValue({ response: { status: 401 } });
    
    renderWithProvider(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('sets user on successful login', async () => {
    (authService.getMe as vi.Mock).mockRejectedValue({ response: { status: 401 } });
    (authService.login as vi.Mock).mockResolvedValue({
      user: { id: 1, username: 'testuser', email: 'test@test.com', role: 'STUDENT', firstName: '', lastName: '', totalLabTime: 0, totalSpent: 0 }, token: 'fake-token'
    });

    renderWithProvider(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-token');
  });

  it('sets user on successful register', async () => {
    (authService.getMe as vi.Mock).mockRejectedValue({ response: { status: 401 } });
    (authService.register as vi.Mock).mockResolvedValue({
      user: { id: 1, username: 'testuser', email: 'test@test.com', role: 'STUDENT', firstName: '', lastName: '', totalLabTime: 0, totalSpent: 0 }, token: 'fake-token'
    });

    renderWithProvider(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    fireEvent.click(screen.getByText('Register'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
  });

  it('clears user on logout', async () => {
    localStorage.setItem('token', 'fake-token');
    (authService.getMe as vi.Mock).mockResolvedValue({
      user: { id: 1, username: 'testuser', email: 'test@test.com', role: 'STUDENT', firstName: '', lastName: '', totalLabTime: 0, totalSpent: 0 }
    });
    (authService.logout as vi.Mock).mockResolvedValue({ success: true, message: 'Logout successful' });

    renderWithProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });

    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('checks role correctly', async () => {
    localStorage.setItem('token', 'fake-token');
    (authService.getMe as vi.Mock).mockResolvedValue({
      user: { id: 1, username: 'admin', email: 'admin@test.com', role: 'ADMIN', firstName: '', lastName: '', totalLabTime: 0, totalSpent: 0 }
    });

    renderWithProvider(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('has-role-admin')).toHaveTextContent('true');
    });
  });
});