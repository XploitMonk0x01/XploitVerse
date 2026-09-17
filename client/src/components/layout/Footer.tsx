import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail, Terminal, ShieldCheck, Cpu } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-surface font-mono relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
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
              Real AWS environments for offensive security training. No sandboxes. No simulations.
            </p>
            <div className="mt-4 flex items-center gap-3 text-[10px] text-dim">
              <span className="flex items-center gap-1.5 text-success">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3" />
                Sandboxed
              </span>
            </div>
          </div>

          {/* Nav */}
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

          {/* Social */}
          <div>
            <h3 className="text-ink font-bold uppercase tracking-[0.15em] mb-4 text-[11px]">
              Connect
            </h3>
            <div className="flex gap-2">
              {[
                { href: 'https://github.com', icon: Github, label: 'GitHub' },
                { href: 'https://twitter.com', icon: Twitter, label: 'Twitter' },
                { href: 'https://linkedin.com', icon: Linkedin, label: 'LinkedIn' },
                { href: 'mailto:contact@xploitverse.io', icon: Mail, label: 'Email' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  title={s.label}
                  className="p-2 border border-border bg-paper text-muted hover:text-accent hover:border-accent transition-all"
                >
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-dim tracking-wider uppercase">
          <p>© {new Date().getFullYear()} Xploitverse Systems. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span>Build 2026.09</span>
            <span className="text-border">|</span>
            <span className="text-success font-bold">TLS 1.3</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;