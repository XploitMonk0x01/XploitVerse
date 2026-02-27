import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * RoleRoute - Protects routes based on user roles
 * 
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles allowed to access the route
 * 
 * Usage:
 * <Route element={<RoleRoute allowedRoles={['ADMIN', 'INSTRUCTOR']} />}>
 *   <Route path="/admin" element={<AdminDashboard />} />
 * </Route>
 */
const RoleRoute = ({ allowedRoles }) => {
    const { user, isAuthenticated, loading, hasRole } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cyber-dark">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user has required role
    if (!hasRole(allowedRoles)) {
        // Redirect to dashboard with unauthorized message
        return (
            <Navigate
                to="/dashboard"
                state={{
                    error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
                }}
                replace
            />
        );
    }

    // Render child routes
    return <Outlet />;
};

export default RoleRoute;
