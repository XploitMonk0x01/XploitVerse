import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  Shield,
  Trophy,
  LogOut,
  UserCircle,
  ChevronDown,
  Activity,
  Sparkles,
} from 'lucide-react';

interface NavLink {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: string[];
}

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setDropdownOpen(false);
  }, [location]);

  const handleLogout = () => {
    setDropdownOpen(false);
    void logout();
  };

  const navLinks: NavLink[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/courses', label: 'Courses', icon: BookOpen, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/pricing', label: 'Pricing', icon: Sparkles, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/admin', label: 'Admin', icon: Shield, roles: ['INSTRUCTOR', 'ADMIN'] },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.username?.[0] || 'X').toUpperCase();

  return (
    <header className="sticky top-0 z-topbar select-none border-b border-border-subtle bg-bg-base/95 backdrop-blur">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-accent text-accent-fg transition-colors group-hover:bg-accent-hover">
              <Shield className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-fg">XploitVerse</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks
              .filter((link) => link.roles.some((role) => hasRole(role)))
              .map((link) => {
                const active = isActive(link.to);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                      active ? 'text-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-accent' : 'text-fg-subtle'}`} strokeWidth={1.75} />
                    <span>{link.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
                        transition={reduce ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                    )}
                  </Link>
                );
              })}
          </nav>

          {/* Right: User / Auth */}
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded border border-border bg-bg-raised px-2.5 py-1.5 transition-colors hover:border-border-strong"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-accent text-xs font-semibold text-accent-fg">
                    {initials}
                  </span>
                  <span className="hidden text-sm font-medium text-fg sm:block">{user.username}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-fg-subtle" strokeWidth={1.75} />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                      className="absolute right-0 z-dropdown mt-1.5 w-52 rounded-md border border-border bg-bg-raised py-1 shadow-pop"
                    >
                      <div className="border-b border-border-subtle px-4 py-2.5">
                        <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-accent">
                          {user.role}
                        </p>
                        <p className="truncate text-sm text-fg">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
                      >
                        <UserCircle className="h-4 w-4" strokeWidth={1.75} />
                        Profile & Settings
                      </Link>
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
                      >
                        <Activity className="h-4 w-4" strokeWidth={1.75} />
                        Dashboard
                      </Link>
                      <div className="my-1 border-t border-border-subtle" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
                      >
                        <LogOut className="h-4 w-4" strokeWidth={1.75} />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            className="rounded border border-border bg-bg-raised p-2 text-fg-muted transition-colors hover:text-fg md:hidden"
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden border-t border-border-subtle bg-bg-base md:hidden"
          >
            <div className="space-y-1 p-4">
              {user && (
                <div className="mb-3 flex items-center gap-3 rounded-md border border-border-subtle bg-bg-raised p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-accent text-xs font-semibold text-accent-fg">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{user.username}</p>
                    <p className="truncate text-xs text-fg-muted">{user.email}</p>
                  </div>
                </div>
              )}
              {navLinks
                .filter((link) => link.roles.some((role) => hasRole(role)))
                .map((link) => {
                  const active = isActive(link.to);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        active ? 'bg-bg-overlay text-fg' : 'text-fg-muted hover:bg-bg-raised hover:text-fg'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? 'text-accent' : 'text-fg-subtle'}`} strokeWidth={1.75} />
                      {link.label}
                    </Link>
                  );
                })}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 flex w-full items-center gap-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm font-medium text-danger"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sign Out
                </button>
              ) : (
                <div className="mt-3 flex flex-col gap-2 border-t border-border-subtle pt-3">
                  <Link
                    to="/login"
                    className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-fg"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-md bg-accent px-4 py-2 text-center text-sm font-medium text-accent-fg"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
