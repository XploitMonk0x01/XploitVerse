import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Cpu,
  DatabaseZap,
  TerminalSquare,
  ArrowRight,
  Binary,
  Network,
  Radio,
  Lock,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui';
import { SpotlightCard } from '../components/ui/motion/SpotlightCard';
import { DecryptedText } from '../components/ui/motion/DecryptedText';
import { BorderBeam } from '../components/ui/motion/BorderBeam';
import { FadeIn } from '../components/ui/motion/MotionWrappers';
import { TacticalBadge } from '../components/ui/motion/TacticalBadge';

const MARQUEE_ITEMS = [
  'WEB_EXPLOITATION', 'PRIVILEGE_ESCALATION', 'NETWORK_PENTEST',
  'CTF_SIMULATION', 'CLOUD_ATTACK', 'REVERSE_ENGINEERING',
  'BINARY_EXPLOITATION', 'FORENSICS', 'CRYPTOGRAPHY',
];

const Landing = () => {
  return (
    <div className="min-h-[100dvh] bg-paper select-none font-mono">

      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full z-50 bg-paper/96 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px]">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-accent flex items-center justify-center transition-all group-hover:bg-accent-hover shadow-accent">
                <TerminalSquare className="w-4 h-4 text-paper" />
              </div>
              <span className="text-base font-display font-black text-ink uppercase tracking-tight">
                <DecryptedText text="XPLOITVERSE" speed={22} animateOn="hover" />
              </span>
            </Link>
            <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold tracking-widest">
              <Link
                to="/login"
                className="hidden sm:block px-3 py-1.5 text-muted hover:text-ink border border-transparent hover:border-border transition-all"
              >
                Sign In
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Access
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-[100dvh] flex items-center pt-[60px] px-4 relative overflow-hidden">
        {/* Large background number */}

        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-[1fr_420px] gap-10 xl:gap-16 items-center">

            {/* Left: Copy */}
            <FadeIn direction="up" distance={20}>


              <h1 className="font-display font-black uppercase leading-[0.92] tracking-[-0.03em] mb-8">
                <span className="block text-[clamp(3.5rem,9vw,8rem)] text-ink">Hack</span>
                <span className="block text-[clamp(3.5rem,9vw,8rem)] text-ink">Real</span>
                <span
                  className="block text-[clamp(3.5rem,9vw,8rem)] glitch-flicker"
                  style={{ color: 'var(--color-accent)', textShadow: '3px 3px 0 rgba(255,69,0,0.25)' }}
                >
                  Cloud.
                </span>
              </h1>

              <p className="text-muted text-sm leading-relaxed max-w-[46ch] mb-10 border-l-2 border-border pl-4">
                Authentic AWS environments. Zero sandboxing. Pay only for compute you use.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/register">
                  <Button variant="primary" size="lg">
                    Deploy Target
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </FadeIn>

            {/* Right: Terminal */}
            <FadeIn direction="left" distance={24} className="hidden lg:block">
              <div className="relative border border-border bg-surface shadow-[8px_8px_0px_#000] overflow-hidden">
                <BorderBeam size={200} duration={9} colorFrom="#00E5FF" colorTo="#FF4500" />

                {/* Terminal chrome */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-paper/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-error inline-block" />
                    <span className="w-2.5 h-2.5 bg-warning inline-block" />
                    <span className="w-2.5 h-2.5 bg-success inline-block" />
                  </div>
                  <span className="text-[10px] text-muted font-mono tracking-wider">
                    root@xploitverse:~#
                  </span>
                  <span className="text-[10px] text-accent flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" />
                    LIVE
                  </span>
                </div>

                {/* Output */}
                <div className="font-mono text-xs p-5 space-y-1.5 leading-relaxed">
                  <p className="text-dim">$ ./provision --target web-vuln-01 --region us-east-1</p>
                  <p className="text-muted">[SYS] Allocating VPC 172.30.0.0/16...</p>
                  <p className="text-muted">[SYS] Deploying subnet isolation...</p>
                  <p className="text-muted">[SYS] Configuring security groups...</p>
                  <p className="text-cyan mt-2">[OK]  Instance i-0a3f9c12b45d678e online</p>
                  <p className="text-warning">[!]  Offensive vectors loaded: 80, 22, 5000</p>
                  <p className="text-success mt-3 flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-success animate-ping" />
                    Ready. Elapsed: 94s
                  </p>
                  <p className="text-dim mt-2">$ <span className="animate-pulse">_</span></p>
                </div>

                <div className="absolute bottom-3 right-4 font-display text-2xl text-border/15 font-black pointer-events-none">
                  XV-CORE
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── MARQUEE STRIP ── */}
      <div className="border-y border-border bg-surface overflow-hidden py-3">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 px-6 text-[11px] font-bold text-muted tracking-[0.15em] uppercase">
              <span className="text-accent">◆</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { value: '$0.50', label: 'Per Hour', sub: 'metered billing' },
              { value: '<120s', label: 'Boot Time', sub: 'avg provision' },
              { value: '100%', label: 'Isolated', sub: 'dedicated ec2' },
              { value: '68%', label: 'Cost Saved', sub: 'vs competitors' },
            ].map((s) => (
              <div key={s.label} className="px-6 py-10 group hover:bg-accent transition-colors duration-150 cursor-default">
                <div className="text-[clamp(2rem,4vw,3rem)] font-display font-black text-ink group-hover:text-paper leading-none mb-1 tracking-tight">
                  {s.value}
                </div>
                <div className="text-xs font-bold text-ink group-hover:text-paper uppercase tracking-widest mb-0.5">
                  {s.label}
                </div>
                <div className="text-[10px] text-muted group-hover:text-paper/70 uppercase tracking-wider">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ARCHITECTURE ── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section header — left-aligned, no eyebrow */}
          <div className="grid lg:grid-cols-[1fr_auto] items-end gap-6 mb-14 border-b border-border pb-8">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-display font-black text-ink uppercase tracking-tight leading-none">
              System<br />Architecture
            </h2>
            <p className="text-muted text-xs max-w-[32ch] leading-relaxed lg:text-right">
              Every component engineered for uncompromising realism and sub-second telemetry feedback.
            </p>
          </div>

          {/* 2+2 asymmetric grid */}
          <div className="grid md:grid-cols-2 gap-px bg-border">
            {[
              {
                icon: Cpu,
                code: '01',
                title: 'Isolated Environments',
                description: 'Dedicated EC2 instances per session. Zero resource sharing. Absolute network isolation for critical operations.',
                accent: 'var(--color-cyan)',
                large: true,
              },
              {
                icon: DatabaseZap,
                code: '02',
                title: 'On-Demand Infrastructure',
                description: 'Metered at $0.50/hr. Provisions instantly, self-terminates on session end.',
                accent: 'var(--color-accent)',
                large: false,
              },
              {
                icon: TerminalSquare,
                code: '03',
                title: 'Rapid Deployment',
                description: 'Fully configured target environment in under 120 seconds.',
                accent: 'var(--color-info)',
                large: false,
              },
              {
                icon: ShieldAlert,
                code: '04',
                title: 'Live Vulnerability Targets',
                description: 'Authentic AWS infrastructure with verified, real-world vulnerability vectors.',
                accent: 'var(--color-error)',
                large: true,
              },
            ].map((f) => (
              <SpotlightCard
                key={f.code}
                className={`p-8 bg-surface ${f.large ? 'md:py-12' : ''}`}
                spotlightColor="rgba(0, 229, 255, 0.06)"
              >
                <div className="flex items-start justify-between mb-8">
                  <f.icon className="w-7 h-7" style={{ color: f.accent }} />
                  <span className="font-mono text-[10px] text-dim font-bold tracking-widest">{f.code}</span>
                </div>
                <h3 className="text-lg font-display font-black text-ink uppercase tracking-tight mb-3">
                  {f.title}
                </h3>
                <p className="text-muted text-xs leading-relaxed max-w-[38ch]">
                  {f.description}
                </p>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMBAT MODULES — inverted section ── */}
      <section className="py-24 px-4 bg-ink">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-14">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-display font-black text-paper uppercase tracking-tight leading-none">
              Combat<br />Modules
            </h2>
            <Link to="/courses">
              <Button variant="ghost" className="text-paper border-paper/30 hover:border-paper hover:bg-paper hover:text-ink">
                View All
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* Asymmetric module grid: 1 large + 3 small */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30">
            {/* Large featured module */}
            <Link
              to="/courses"
              className="lg:col-span-1 lg:row-span-2 group relative border border-border/30 bg-[#0D0D0D] p-8 flex flex-col justify-between min-h-[280px] hover:bg-accent transition-colors duration-200"
            >
              <div>
                <Network className="w-10 h-10 text-muted group-hover:text-paper mb-6 transition-colors" />
                <h3 className="text-xl font-display font-black text-ink group-hover:text-paper uppercase tracking-tight transition-colors">
                  Web Exploitation
                </h3>
                <p className="text-muted group-hover:text-paper/70 text-xs mt-2 leading-relaxed max-w-[28ch] transition-colors">
                  XSS, SQLi, SSRF, IDOR, and modern web attack chains on live targets.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted group-hover:text-paper/60 uppercase tracking-widest transition-colors">
                <span>Enter Module</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {[
              { name: 'Network Pentest', icon: DatabaseZap, desc: 'Recon, scanning, exploitation of network services.' },
              { name: 'Privilege Escalation', icon: ShieldAlert, desc: 'Linux & Windows privesc paths on real systems.' },
              { name: 'CTF Simulation', icon: Binary, desc: 'Timed capture-the-flag challenges with scoring.' },
            ].map((lab) => (
              <Link
                key={lab.name}
                to="/courses"
                className="group relative border border-border/30 bg-[#0D0D0D] p-6 flex flex-col justify-between min-h-[130px] hover:bg-surface-elevated transition-colors duration-200"
              >
                <lab.icon className="w-6 h-6 text-muted group-hover:text-accent transition-colors" />
                <div>
                  <h3 className="text-sm font-display font-black text-ink uppercase tracking-tight mb-1">
                    {lab.name}
                  </h3>
                  <p className="text-dim text-[11px] leading-relaxed">{lab.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-4 border-t border-border relative overflow-hidden">
        {/* Background accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,69,0,0.06) 0%, transparent 70%)' }}
        />
        <div className="max-w-4xl mx-auto relative">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-display font-black text-ink uppercase tracking-tight leading-[0.92] mb-6">
                Start Your<br />
                <span style={{ color: 'var(--color-accent)' }}>First Op.</span>
              </h2>
              <p className="text-muted text-sm max-w-[40ch] leading-relaxed">
                Provision credentials, spin up a target, and execute your first attack sequence in under two minutes.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <Link to="/register">
                <Button variant="primary" size="lg" className="w-full lg:w-auto px-10">
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <div className="flex items-center gap-4 text-[10px] text-dim uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Live in 120s
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-4 bg-surface border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <TerminalSquare className="w-3.5 h-3.5 text-paper" />
            </div>
            <span className="font-display font-black text-sm text-ink uppercase tracking-tight">
              XPLOITVERSE
            </span>
          </div>
          <p className="text-dim font-mono text-[10px] uppercase tracking-widest">
            © {new Date().getFullYear()} Xploitverse Systems. All rights reserved.
          </p>
          <TacticalBadge label="Build 2026.09" variant="muted" size="sm" />
        </div>
      </footer>
    </div>
  );
};

export default Landing;