import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';
import type { User, RegisterData, LoginCredentials, AuthResult, AuthState } from '../types';

const AuthContext = createContext<AuthState | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authService.getMe();
      const fetchedUser = response.user;
      if (fetchedUser) {
        setUser(fetchedUser);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const register = async (userData: RegisterData): Promise<AuthResult> => {
    try {
      setError(null);
      const response = await authService.register(userData);
      const newUser = response.user;
      const token = response.token;

      if (token) {
        localStorage.setItem('token', token);
      }
      if (newUser) {
        setUser(newUser);
      }

      return { success: true, user: newUser };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      setError(null);
      const response = await authService.login(credentials);
      const newUser = response.user;
      const token = response.token;

      if (token) {
        localStorage.setItem('token', token);
      }
      if (newUser) {
        setUser(newUser);
      }

      return { success: true, user: newUser };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    return roles.includes(user.role);
  };

  const value: AuthState = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateUser,
    hasRole,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;