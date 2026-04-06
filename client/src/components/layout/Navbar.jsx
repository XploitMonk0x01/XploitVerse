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
  Zap,
} from 'lucide-react';

const styles = `
  .nav-root {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-surface);
    border-bottom: 1.5px solid var(--color-border);
  }
  .nav-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 var(--space-4);
  }
  @media (min-width: 640px) { .nav-container { padding: 0 var(--space-6); } }
  @media (min-width: 1024px) { .nav-container { padding: 0 var(--space-8); } }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    text-decoration: none;
  }
  .nav-logo-box {
    width: 32px;
    height: 32px;
    background: var(--color-ink);
    border-radius: var(--radius-base);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-paper);
  }
  .nav-brand-text {
    font-size: var(--text-lg);
    font-family: var(--font-display);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-ink);
    letter-spacing: 0.1em;
  }

  .nav-links {
    display: none;
    align-items: center;
    gap: var(--space-2);
  }
  @media (min-width: 768px) { .nav-links { display: flex; } }

  .nav-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.75rem var(--space-3);
    border-radius: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    text-decoration: none;
    transition: all var(--ease-out);
    border-bottom: 2px solid transparent;
  }
  .nav-link:hover {
    color: var(--color-ink);
    background: var(--color-surface);
  }
  .nav-link.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .nav-actions {
    display: none;
    align-items: center;
    gap: var(--space-4);
  }
  @media (min-width: 768px) { .nav-actions { display: flex; } }

  .nav-icon-btn {
    padding: var(--space-2);
    color: var(--color-muted);
    border-radius: 0;
    transition: all var(--ease-out);
    background: transparent;
    border: none;
    cursor: pointer;
    position: relative;
  }
  .nav-icon-btn:hover {
    color: var(--color-ink);
    background: var(--color-surface);
  }
  .nav-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    background: var(--color-accent);
    border-radius: 0;
  }

  .nav-user-menu {
    position: relative;
  }
  .nav-user-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding-left: var(--space-4);
    border-left: 1px dotted var(--color-border);
    background: transparent;
    border-top: none;
    border-right: none;
    border-bottom: none;
    cursor: pointer;
    transition: opacity var(--ease-out);
  }
  .nav-user-trigger:hover {
    opacity: 0.8;
  }
  .nav-avatar {
    width: 36px;
    height: 36px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--color-ink);
  }
  .nav-user-info {
    display: none;
    text-align: left;
  }
  @media (min-width: 1024px) { .nav-user-info { display: block; } }

  .nav-user-name {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--color-ink);
    line-height: 1.2;
    text-transform: uppercase;
  }
  .nav-user-role {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .nav-dropdown {
    position: absolute;
    top: calc(100% + var(--space-4));
    right: 0;
    width: 240px;
    background: var(--color-paper);
    border: 1px solid var(--color-border);
    padding: var(--space-2);
    box-shadow: var(--shadow-md);
    transform-origin: top right;
    animation: drop-in var(--ease-out);
    z-index: 100;
  }
  @keyframes drop-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .nav-dropdown-header {
    padding: var(--space-3);
    border-bottom: 1px dotted var(--color-border);
    margin-bottom: var(--space-2);
  }
  .nav-dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    padding: 0.75rem var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-ink);
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: none;
    text-align: left;
    transition: all var(--ease-out);
  }
  .nav-dropdown-item:hover {
    background: var(--color-surface);
    color: var(--color-accent);
  }
  .nav-dropdown-item.danger {
    color: var(--color-error);
    margin-top: var(--space-2);
    border-top: 1px dotted var(--color-border);
  }
  .nav-dropdown-item.danger:hover {
    background: rgba(255, 42, 42, 0.1);
    color: var(--color-error);
  }

  .nav-mobile-btn {
    display: flex;
    padding: var(--space-2);
    color: var(--color-muted);
    background: transparent;
    border: none;
    cursor: pointer;
  }
  @media (min-width: 768px) { .nav-mobile-btn { display: none; } }

  .nav-mobile-menu {
    border-top: 1px dashed var(--color-border);
    background: var(--color-paper);
  }
  @media (min-width: 768px) { .nav-mobile-menu { display: none; } }

  .nav-mobile-inner {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .nav-mobile-profile {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    margin-bottom: var(--space-4);
  }
  .nav-upgrade-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0.4rem 0.9rem;
    background: var(--color-accent);
    color: var(--color-paper);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    border: 1.5px solid var(--color-accent);
    transition: all 0.15s;
    white-space: nowrap;
  }
  .nav-upgrade-btn:hover {
    background: transparent;
    color: var(--color-accent);
  }

  .nav-plan-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.1rem 0.35rem;
    margin-left: 0.5rem;
    font-size: 0.65rem;
    font-family: var(--font-mono);
    font-weight: 800;
    text-transform: uppercase;
    border-radius: 4px;
    background: var(--color-accent);
    color: var(--color-paper);
    letter-spacing: 0.05em;
    vertical-align: middle;
  }

  .nav-plan-badge.animate-upgrade {
    animation: badge-pop 2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  @keyframes badge-pop {
    0% {
      transform: scale(0.5);
      opacity: 0;
      box-shadow: 0 0 0 rgba(var(--color-accent-rgb), 0);
    }
    20% {
      transform: scale(1.3);
      opacity: 1;
      box-shadow: 0 0 15px var(--color-accent);
    }
    40% {
      transform: scale(0.9);
      box-shadow: 0 0 5px var(--color-accent);
    }
    60% {
      transform: scale(1.1);
      box-shadow: 0 0 10px var(--color-accent);
    }
    80% {
      transform: scale(0.95);
      box-shadow: 0 0 3px var(--color-accent);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 rgba(var(--color-accent-rgb), 0);
    }
  }
`;

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const prevPlanRef = useRef(user?.plan);
  const [justUpgraded, setJustUpgraded] = useState(false);

  useEffect(() => {
    if (user?.plan && prevPlanRef.current && user.plan !== 'FREE' && prevPlanRef.current === 'FREE') {
      setJustUpgraded(true);
      setTimeout(() => setJustUpgraded(false), 5000); // reset after 5s
    }
    prevPlanRef.current = user?.plan;
  }, [user?.plan]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/courses', label: 'Courses', icon: BookOpen, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'] },
    { to: '/admin', label: 'Admin Panel', icon: Shield, roles: ['INSTRUCTOR', 'ADMIN'] },
  ];

  const isActive = (path) => location.pathname === path;

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.username?.[0] || 'U').toUpperCase();

  return (
    <>
      <style>{styles}</style>
      <nav className="nav-root">
        <div className="nav-container">
          <div className="nav-inner">
            {/* Logo */}
            <Link to="/dashboard" className="nav-brand">
              <div className="nav-logo-box">
                <Terminal size={18} />
              </div>
              <span className="nav-brand-text">XploitVerse</span>
            </Link>

            {/* Desktop Nav */}
            <div className="nav-links">
              {navLinks.map((link) =>
                hasRole(link.roles) && (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
                  >
                    <link.icon size={16} />
                    <span>{link.label}</span>
                  </Link>
                )
              )}
            </div>

            {/* Desktop Right */}
            <div className="nav-actions">
              <button className="nav-icon-btn" aria-label="Notifications">
                <Bell size={20} />
                <span className="nav-badge"></span>
              </button>

              {/* Upgrade button — only for FREE users */}
              {(!user?.plan || user.plan === 'FREE') && (
                <Link to="/pricing" className="nav-upgrade-btn">
                  <Zap size={13} />
                  Upgrade
                </Link>
              )}

              <div className="nav-user-menu" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="nav-user-trigger"
                >
                  <div className="nav-avatar">
                    {initials}
                  </div>
                  <div className="nav-user-info">
                    <p className="nav-user-name">{user?.username || 'Guest'}</p>
                    <p className="nav-user-role">
                      {user?.role?.toLowerCase() || 'Role'}
                      {user?.plan && user.plan !== 'FREE' && (
                        <span className={`nav-plan-badge ${justUpgraded ? 'animate-upgrade' : ''}`}>
                          {user.plan}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronDown size={14} style={{ color: 'var(--color-muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--ease-default)' }} />
                </button>

                {dropdownOpen && (
                  <div className="nav-dropdown">
                    <div className="nav-dropdown-header">
                      <p className="nav-user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username}
                        {user?.plan && user.plan !== 'FREE' && (
                          <span className={`nav-plan-badge ${justUpgraded ? 'animate-upgrade' : ''}`} style={{ marginLeft: 'var(--space-2)' }}>
                            {user.plan}
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {user?.email}
                      </p>
                    </div>
                    <Link to="/profile" className="nav-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <UserCircle size={16} />
                      My Profile
                    </Link>
                    <button onClick={handleLogout} className="nav-dropdown-item danger">
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button className="nav-mobile-btn" onClick={() => setIsOpen((v) => !v)}>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="nav-mobile-menu">
            <div className="nav-mobile-inner">
              <div className="nav-mobile-profile">
                <div className="nav-avatar">
                  {initials}
                </div>
                <div>
                  <p className="nav-user-name">{user?.username}</p>
                  <p className="nav-user-role">
                    {user?.role?.toLowerCase()}
                    {user?.plan && user.plan !== 'FREE' && (
                      <span className={`nav-plan-badge ${justUpgraded ? 'animate-upgrade' : ''}`}>
                        {user.plan}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {navLinks.map((link) =>
                hasRole(link.roles) && (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
                    style={{ padding: '0.75rem var(--space-3)' }}
                  >
                    <link.icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                )
              )}

              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-2) 0' }} />

              {(!user?.plan || user.plan === 'FREE') && (
                <Link to="/pricing" className="nav-upgrade-btn" style={{ margin: '0 var(--space-3)', justifyContent: 'center' }}>
                  <Zap size={14} />
                  Upgrade Your Plan
                </Link>
              )}

              <button onClick={handleLogout} className="nav-dropdown-item danger" style={{ padding: '0.75rem var(--space-3)' }}>
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
