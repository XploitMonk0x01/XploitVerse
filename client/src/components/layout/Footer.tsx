import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-surface font-mono relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <div className="w-7 h-7 bg-accent flex items-center justify-center group-hover:bg-accent-hover transition-colors shadow-accent">
                <Terminal className="w-3.5 h-3.5 text-paper" />
              </div>
              <span className="text-sm font-display font-black text-ink uppercase tracking-tight">
                XPLOITVERSE
              </span>
            </Link>
            <p className="text-muted text-xs max-w-[32ch] leading-relaxed">
              Offensive security training platform with hands-on lab environments.
            </p>
          </div>

          <div>
            <h3 className="text-ink font-bold uppercase tracking-[0.15em] mb-4 text-[11px]">
              Navigation
            </h3>
            <ul className="space-y-2 text-xs">
              {[
                { to: '/dashboard', label: 'Dashboard' },
                { to: '/courses', label: 'Challenges' },
                { to: '/leaderboard', label: 'Leaderboard' },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-muted hover:text-accent transition-colors flex items-center gap-2">
                    <span className="text-dim text-[10px]">›</span>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-ink font-bold uppercase tracking-[0.15em] mb-4 text-[11px]">
              Resources
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/profile" className="text-muted hover:text-accent transition-colors flex items-center gap-2">
                  <span className="text-dim text-[10px]">›</span>
                  Profile
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-dim tracking-wider uppercase">
          <p>© {new Date().getFullYear()} Xploitverse Systems. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span>Build 2026.09</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
