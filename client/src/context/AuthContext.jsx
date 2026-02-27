import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is logged in on mount
    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await api.get('/auth/me');
            setUser(response.data.data.user);
        } catch (err) {
            console.error('Auth check failed:', err);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Register
    const register = async (userData) => {
        try {
            setError(null);
            const response = await api.post('/auth/register', userData);
            const { user, token } = response.data.data;

            localStorage.setItem('token', token);
            setUser(user);

            return { success: true, user };
        } catch (err) {
            const message = err.response?.data?.message || 'Registration failed';
            setError(message);
            return { success: false, error: message };
        }
    };

    // Login
    const login = async (credentials) => {
        try {
            setError(null);
            const response = await api.post('/auth/login', credentials);
            const { user, token } = response.data.data;

            localStorage.setItem('token', token);
            setUser(user);

            return { success: true, user };
        } catch (err) {
            const message = err.response?.data?.message || 'Login failed';
            setError(message);
            return { success: false, error: message };
        }
    };

    // Logout
    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    // Update user data
    const updateUser = (userData) => {
        setUser((prev) => ({ ...prev, ...userData }));
    };

    // Check if user has specific role
    const hasRole = (roles) => {
        if (!user) return false;
        if (typeof roles === 'string') {
            return user.role === roles;
        }
        return roles.includes(user.role);
    };

    const value = {
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
