import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  Server,
  Code2,
  Zap,
  Check,
  Terminal,
  Menu,
  X,
} from 'lucide-react';
import { Button, Badge, difficultyVariant } from '../components/ui';
import { AmbientBackdrop } from '../components/ui/motion/AmbientBackdrop';
import { HeroTerminal } from '../components/landing/HeroTerminal';
import { Reveal } from '../components/ui/motion/MotionWrappers';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface LabPreview {
  id: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  duration: string;
}

const NAV_LINKS = [
  { label: 'Labs', to: '/courses' },
  { label: 'Ranges', to: '/courses' },
  { label: 'Leaderboard', to: '/leaderboard' },
];

const STATS = [
  { value: '45+', label: 'Vulnerability labs' },
  { value: '1.8s', label: 'Median spin-up' },
  { value: '100%', label: 'Cloud isolation' },
  { value: '12k+', label: 'Flags captured' },
];

const FEATURES = [
  {
    icon: Server,
    title: 'Isolated cloud sandboxes',
    body: 'Every challenge boots into its own ephemeral container network. Run destructive exploits freely — nothing bleeds across tenants, and each range is wiped clean on teardown.',
  },
  {
    icon: Code2,
    title: 'A catalog of real CVEs',
    body: 'Train against attacks pulled from genuine enterprise compromises: AWS IMDSv2 SSRF, JWT signature forgery, Kubernetes host breakouts, and blind SQL injection.',
  },
  {
    icon: Zap,
    title: 'Instant flag verification',
    body: 'Submit captured flags from the terminal or web UI. A zero-latency judging engine scores your work and updates your rank the moment it lands.',
  },
  {
    icon: Terminal,
    title: 'A full attacking workstation',
    body: 'Streamed browser terminal with the standard offensive toolchain preloaded — no local setup, no broken dependencies, no version drift between runs.',
  },
];

const FEATURED_LABS: LabPreview[] = [
  {
    id: 'aws-ssrf-v2',
    title: 'AWS Cloud Metadata SSRF',
    category: 'Cloud Security',
    difficulty: 'Medium',
    description:
      'Bypass internal proxy filters to query the EC2 IMDSv2 metadata service and exfiltrate temporary IAM session keys.',
    duration: '25 min',
  },
  {
    id: 'jwt-sig-bypass',
    title: 'JWT None-Algorithm Forgery',
    category: 'Authentication',
    difficulty: 'Easy',
    description:
      'Exploit flawed token validation to forge administrative authorization claims using the none algorithm signature trick.',
    duration: '15 min',
  },
  {
    id: 'k8s-pod-escape',
    title: 'Kubernetes Privileged Breakout',
    category: 'Container Security',
    difficulty: 'Hard',
    description:
      'Escape a compromised container with root privileges and mount the underlying host node filesystem via cgroups.',
    duration: '45 min',
  },
];

export function Landing() {
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative isolate min-h-screen bg-bg-base font-sans text-fg antialiased">
      <AmbientBackdrop />

      {/* ── Announcement ── */}
      <div className="border-b border-border-subtle bg-bg-raised">
        <div className="mx-auto flex max-w-content items-center justify-center gap-2 px-4 py-2.5 text-center text-xs text-fg-muted sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 font-medium text-accent">
            New
          </span>
          <span>The Kubernetes Privileged Breakout range is now live.</span>
          <Link
            to="/courses"
            className="hidden items-center gap-0.5 font-medium text-fg underline decoration-border-strong underline-offset-2 transition-colors hover:text-accent sm:inline-flex"
          >
            Explore <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-topbar border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-fg shadow-card">
              <Shield className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-fg">XploitVerse</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="group relative rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                {link.label}
                <span className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-accent transition-transform duration-200 ease-tactical group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg sm:block">
              Sign in
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">
                Start training
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              className="-mr-1 rounded-md p-2 text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" strokeWidth={1.75} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden border-t border-border-subtle bg-bg-base md:hidden"
              onClick={() => setMenuOpen(false)}
            >
              <nav className="mx-auto flex max-w-content flex-col gap-1 px-4 py-3 sm:px-6 lg:px-8">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/login"
                  className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg sm:hidden"
                >
                  Sign in
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="relative mx-auto max-w-content px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Copy */}
            <div className="animate-fade-up lg:col-span-6">
              <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-fg sm:text-6xl">
                Learn offense by{' '}
                <span className="font-display italic text-accent">breaking</span>
                <br className="hidden sm:block" /> real systems.
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-fg-muted sm:text-base">
                Spin up isolated cloud sandboxes in seconds. Practice genuine web exploits, cloud
                privilege escalation, and red-team tradecraft inside on-demand attack ranges — then
                prove it on the leaderboard.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/register">
                  <Button variant="primary" size="lg">
                    Start training free
                    <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button variant="secondary" size="lg">
                    Browse the catalog
                  </Button>
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
                {['No credit card required', 'Ephemeral cloud sandboxes', 'Preloaded toolchain'].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" strokeWidth={2} />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Terminal mock */}
            <div className="animate-fade-up lg:col-span-6" style={{ animationDelay: '80ms' }}>
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="border-y border-border bg-bg-raised">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {STATS.map((stat, idx) => (
            <div key={stat.label} className="border-border px-2 even:border-l even:pl-6 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0">
              <Reveal delay={idx * 0.06}>
                <div className="font-display text-4xl leading-none tracking-tight text-fg sm:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  {stat.label}
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features (editorial split) ── */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto grid max-w-content gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <div className="text-xs font-medium uppercase tracking-widest text-accent">
                The platform
              </div>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-fg sm:text-4xl">
                Built like the real thing,{' '}
                <span className="font-display italic text-fg-muted">safely.</span>
              </h2>
              <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-fg-muted">
                No multiple-choice quizzes or canned simulations. Live Linux shells, vulnerable
                cloud targets, and a judging engine that treats every flag like production.
              </p>
              <Link
                to="/courses"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
              >
                See all 45+ labs <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {FEATURES.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <Reveal key={feat.title} delay={idx * 0.06} className="group bg-bg-raised p-8 transition-colors hover:bg-bg-base">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-bg-base text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent/10">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight text-fg">{feat.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{feat.body}</p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured labs ── */}
      <section className="border-t border-border bg-bg-raised py-20 lg:py-28">
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-accent">
                Featured ranges
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
                Start with a live target
              </h2>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-fg-muted transition-colors hover:text-accent"
            >
              View the full catalog <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURED_LABS.map((lab, idx) => (
              <Reveal key={lab.id} delay={idx * 0.08} className="h-full">
                <motion.div
                  whileHover={reduce ? undefined : { y: -4 }}
                  transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                  className="group flex h-full flex-col justify-between rounded-xl border border-border bg-bg-base p-6 transition-colors hover:border-border-strong hover:shadow-card"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                        {lab.category}
                      </span>
                      <Badge variant={difficultyVariant(lab.difficulty)}>{lab.difficulty}</Badge>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug tracking-tight text-fg">
                      {lab.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{lab.description}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="font-mono text-xs text-fg-subtle">{lab.duration}</span>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 font-medium text-accent transition-colors hover:text-accent-hover"
                    >
                      Deploy <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Link>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <p className="font-display text-3xl italic leading-snug tracking-tight text-fg sm:text-4xl">
              “The first platform that made cloud attacks feel real. I went from reading write-ups to
              forging IAM credentials in a weekend.”
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                MK
              </span>
              <div className="text-left">
                <div className="text-sm font-semibold text-fg">Maya Krishnan</div>
                <div className="text-xs text-fg-muted">Security Engineer, ranked #12</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-content">
          <div className="relative overflow-hidden rounded-2xl bg-accent px-6 py-16 text-center shadow-pop sm:px-16">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent blur-md"
              animate={reduce ? undefined : { x: ['-100%', '420%'] }}
              transition={reduce ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                Ready to run your first exploit?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">
                Create a free account and spin up an isolated target in under sixty seconds. No card,
                no setup, no risk.
              </p>
              <div className="mt-8 flex justify-center">
                <Link to="/register">
                  <Button
                    size="lg"
                    className="bg-bg-raised text-accent hover:bg-bg-base active:bg-bg-base"
                  >
                    Create free account
                    <ArrowRight className="ml-1 h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-bg-raised">
        <div className="mx-auto max-w-content px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <Link to="/" className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-fg">
                  <Shield className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="text-[15px] font-semibold tracking-tight text-fg">XploitVerse</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
                Hands-on cybersecurity training on live, isolated cloud infrastructure. Learn by
                breaking — not by memorizing.
              </p>
            </div>

            {[
              {
                heading: 'Platform',
                links: [
                  { label: 'Labs', to: '/courses' },
                  { label: 'Ranges', to: '/courses' },
                  { label: 'Leaderboard', to: '/leaderboard' },
                ],
              },
              {
                heading: 'Account',
                links: [
                  { label: 'Sign in', to: '/login' },
                  { label: 'Create account', to: '/register' },
                  { label: 'Dashboard', to: '/dashboard' },
                ],
              },
              {
                heading: 'Resources',
                links: [
                  { label: 'Documentation', to: '/courses' },
                  { label: 'Changelog', to: '/courses' },
                  { label: 'Support', to: '/login' },
                ],
              },
            ].map((col) => (
              <div key={col.heading} className="md:col-span-2">
                <div className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
                  {col.heading}
                </div>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-fg-muted transition-colors hover:text-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-fg-subtle sm:flex-row">
            <span>© {new Date().getFullYear()} XploitVerse. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <Link to="/login" className="transition-colors hover:text-fg">Privacy</Link>
              <Link to="/login" className="transition-colors hover:text-fg">Terms</Link>
              <Link to="/login" className="transition-colors hover:text-fg">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
