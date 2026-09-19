import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  UserCircle,
  ChevronDown,
  Activity,
} from 'lucide-react';
import { DecryptedText } from '../ui/motion/DecryptedText';

interface NavLink {
  to: string;
  label: string;
  code: string;
  icon: typeof LayoutDashboard;
  roles: string[];
}

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    { to: '/dashboard', label: 'Dashboard', code: '01', icon: LayoutDashboard, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/courses', label: 'Challenges', code: '02', icon: BookOpen, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/leaderboard', label: 'Leaderboard', code: '03', icon: Trophy, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/admin', label: 'Control Deck', code: '04', icon: Shield, roles: ['INSTRUCTOR', 'ADMIN'] },
  ];

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.username?.[0] || 'X').toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-paper/96 backdrop-blur-sm border-b border-border font-mono select-none">
      {/* Main Command Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px]">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-accent flex items-center justify-center transition-all group-hover:bg-accent-hover shadow-accent">
              <Terminal className="w-3.5 h-3.5 text-paper" />
            </div>
            <span className="font-display font-black text-base text-ink tracking-tight uppercase group-hover:text-accent transition-colors">
              <DecryptedText text="XPLOITVERSE" speed={28} animateOn="hover" />
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center">
            {navLinks
              .filter((link) => link.roles.some((role) => hasRole(role)))
              .map((link) => {
                const active = isActive(link.to);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold tracking-[0.12em] uppercase transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'
                      }`}
                  >
                    <Icon className={`w-3 h-3 ${active ? 'text-accent' : ''}`} />
                    <span>{link.label}</span>
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
          </nav>

          {/* Right: User / Auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-2.5 py-1.5 bg-surface border border-border hover:border-border-bright transition-all"
                  >
                    <div className="w-6 h-6 bg-accent flex items-center justify-center text-[10px] font-black text-paper">
                      {initials}
                    </div>
                    <span className="text-[11px] font-bold text-ink uppercase tracking-wider hidden sm:block">
                      {user.username}
                    </span>
                    <ChevronDown className="w-3 h-3 text-muted" />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 mt-1.5 w-52 bg-surface border border-border shadow-md py-1 z-50"
                      >
                        <div className="px-4 py-2.5 border-b border-border">
                          <p className="text-[10px] text-muted tracking-widest uppercase mb-0.5">{user.role}</p>
                          <p className="text-xs font-bold text-ink truncate">{user.email}</p>
                        </div>
                        <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-xs text-muted hover:text-ink hover:bg-paper/60 transition-colors uppercase tracking-wider">
                          <UserCircle className="w-3.5 h-3.5" />
                          Profile
                        </Link>
                        <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-xs text-muted hover:text-ink hover:bg-paper/60 transition-colors uppercase tracking-wider">
                          <Activity className="w-3.5 h-3.5" />
                          Dashboard
                        </Link>
                        <div className="border-t border-border my-1" />
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-error hover:bg-error/10 transition-colors uppercase tracking-wider text-left font-bold"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-1.5 text-[11px] font-bold text-muted hover:text-ink border border-transparent hover:border-border uppercase tracking-wider transition-all">
                  Sign In
                </Link>
                <Link to="/register" className="px-3 py-1.5 text-[11px] font-bold text-paper bg-accent hover:bg-accent-hover uppercase tracking-wider transition-all shadow-accent">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex md:hidden p-2 text-muted hover:text-ink border border-border bg-surface"
          >
            {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden border-t border-border bg-paper overflow-hidden"
          >
            <div className="p-4 space-y-1">
              {user && (
                <div className="flex items-center gap-3 p-3 bg-surface border border-border mb-3">
                  <div className="w-8 h-8 bg-accent flex items-center justify-center font-black text-paper text-xs">
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink uppercase tracking-wider">{user.username}</p>
                    <p className="text-[10px] text-muted">{user.email}</p>
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
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-l-2 transition-colors ${active
                        ? 'text-ink bg-surface border-l-accent'
                        : 'text-muted border-l-transparent hover:text-ink hover:bg-surface/50'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-accent' : 'text-muted'}`} />
                      {link.label}
                    </Link>
                  );
                })}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-3 w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error border border-error/20 bg-error/5 uppercase tracking-wider"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <div className="flex flex-col gap-2 pt-3 border-t border-border mt-3">
                  <Link to="/login" className="px-4 py-2 text-center text-xs font-bold text-ink border border-border uppercase tracking-wider">
                    Sign In
                  </Link>
                  <Link to="/register" className="px-4 py-2 text-center text-xs font-bold text-paper bg-accent uppercase tracking-wider">
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