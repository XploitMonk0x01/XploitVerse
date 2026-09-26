import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/courses', label: 'Courses' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export const Footer = () => {
  return (
    <footer className="border-t border-border-subtle bg-bg-raised">
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <Link to="/" className="group mb-4 inline-flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-fg">
                <Shield className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-fg">XploitVerse</span>
            </Link>
            <p className="max-w-[36ch] text-sm leading-relaxed text-fg-muted">
              Hands-on cybersecurity training with isolated, containerized labs and guided courses.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-fg">Navigation</h3>
            <ul className="space-y-2 text-sm">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-fg-muted transition-colors hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-fg">Account</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/profile" className="text-fg-muted transition-colors hover:text-accent">
                  Profile & Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border-subtle pt-5 text-xs text-fg-subtle sm:flex-row">
          <p>© {new Date().getFullYear()} XploitVerse. All rights reserved.</p>
          <span className="font-medium text-fg-muted">Status: Operational</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
