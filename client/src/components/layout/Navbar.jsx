import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Menu,
    X,
    LayoutDashboard,
    BookOpen,
    Shield,
    Trophy,
    LogOut,
    Terminal,
    Bell,
    UserCircle,
    ChevronDown,
} from 'lucide-react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);          // mobile menu
    const [dropdownOpen, setDropdownOpen] = useState(false); // profile dropdown
    const dropdownRef = useRef(null);

    const { user, logout, hasRole } = useAuth();
    const location = useLocation();

    /* Close dropdown on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Close mobile menu on route change */
    useEffect(() => {
        setIsOpen(false);
        setDropdownOpen(false);
    }, [location]);

    const handleLogout = async () => {
        setDropdownOpen(false);
        await logout();
    };

    const navLinks = [
        {
            to: '/dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
        },
        {
            to: '/courses',
            label: 'Courses',
            icon: BookOpen,
            roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
        },
        {
            to: '/leaderboard',
            label: 'Leaderboard',
            icon: Trophy,
            roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
        },
        {
            to: '/admin',
            label: 'Admin Panel',
            icon: Shield,
            roles: ['INSTRUCTOR', 'ADMIN'],
        },
    ];

    const isActive = (path) => location.pathname === path;

    /* Avatar initials */
    const initials =
        user?.firstName && user?.lastName
            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            : (user?.username?.[0] || 'U').toUpperCase();

    return (
        <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-green-400" />
                        </div>
                        <span className="text-xl font-bold gradient-text">XploitVerse</span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navLinks.map(
                            (link) =>
                                hasRole(link.roles) && (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm ${isActive(link.to)
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                            }`}
                                    >
                                        <link.icon className="w-4 h-4" />
                                        <span>{link.label}</span>
                                    </Link>
                                )
                        )}
                    </div>

                    {/* Desktop right section */}
                    <div className="hidden md:flex items-center space-x-2">
                        {/* Notification bell */}
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>

                        {/* Profile dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen((v) => !v)}
                                className="flex items-center gap-2 pl-4 border-l border-gray-700 hover:opacity-80 transition-opacity"
                            >
                                {/* Avatar */}
                                <div className="w-8 h-8 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-green-400">{initials}</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-white leading-tight">
                                        {user?.username}
                                    </p>
                                    <p className="text-xs text-gray-500 leading-tight">{user?.role}</p>
                                </div>
                                <ChevronDown
                                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>

                            {/* Dropdown menu */}
                            {dropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50">
                                    <div className="px-4 py-3 border-b border-gray-800">
                                        <p className="text-sm font-medium text-white truncate">
                                            {user?.firstName
                                                ? `${user.firstName} ${user.lastName || ''}`.trim()
                                                : user?.username}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>

                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <UserCircle className="w-4 h-4" />
                                        My Profile
                                    </Link>

                                    <div className="border-t border-gray-800 my-1" />

                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden p-2 text-gray-400 hover:text-white"
                        onClick={() => setIsOpen((v) => !v)}
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden border-t border-gray-800">
                    <div className="px-4 py-4 space-y-1">
                        {/* User info header */}
                        <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-gray-800/50 rounded-lg">
                            <div className="w-9 h-9 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-green-400">{initials}</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{user?.username}</p>
                                <p className="text-xs text-gray-500">{user?.role}</p>
                            </div>
                        </div>

                        {/* Nav links */}
                        {navLinks.map(
                            (link) =>
                                hasRole(link.roles) && (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive(link.to)
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                            }`}
                                    >
                                        <link.icon className="w-5 h-5" />
                                        <span>{link.label}</span>
                                    </Link>
                                )
                        )}

                        {/* Profile */}
                        <Link
                            to="/profile"
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive('/profile')
                                ? 'bg-green-500/20 text-green-400'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            <UserCircle className="w-5 h-5" />
                            <span>My Profile</span>
                        </Link>

                        <hr className="border-gray-800 my-2" />

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-3 w-full px-3 py-2.5 text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
