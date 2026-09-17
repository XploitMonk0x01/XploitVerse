import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ArrowLeft, Key, Lightbulb } from "lucide-react";
import { Button, Input, LoadingSpinner, EmptyState } from "../../components/ui";
import { flagService, taskService, userService } from "../../services";
import type { Task } from "../../types";
import { SpotlightCard } from "../../components/ui/motion/SpotlightCard";
import { BorderBeam } from "../../components/ui/motion/BorderBeam";
import { DecryptedText } from "../../components/ui/motion/DecryptedText";
import { TacticalBadge } from "../../components/ui/motion/TacticalBadge";
import { FadeIn } from "../../components/ui/motion/MotionWrappers";

export const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flag, setFlag] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [taskRes, progressRes] = await Promise.allSettled([
          taskService.getById(Number(id)),
          userService.getMyProgress(),
        ]);

        if (!cancelled) {
          if (taskRes.status === "fulfilled") {
            setTask(taskRes.value.task || null);
          } else {
            setError(taskRes.reason instanceof Error ? taskRes.reason.message : "Failed to load task");
          }

          if (progressRes.status === "fulfilled") {
            const prog = progressRes.value.progress || [];
            const mine = prog.find((p: { taskId: string | number }) => String(p.taskId) === String(id));
            if (mine?.completedAt) {
              setCompletedAt(mine.completedAt);
              setPointsEarned(mine.pointsEarned ?? null);
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  const submitFlag = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = flag.trim();
    if (!trimmed) return;

    const parsedTaskId = Number.parseInt(String(id), 10);
    if (!Number.isFinite(parsedTaskId) || parsedTaskId <= 0) {
      toast.error("Invalid task ID");
      return;
    }

    try {
      setSubmittingFlag(true);
      const data = await flagService.submit({ taskId: parsedTaskId, flag: trimmed });
      if (data?.alreadySolved) {
        toast.success("Flag verified (already solved)");
        setCompletedAt(data.completedAt || new Date().toISOString());
        setPointsEarned(data.pointsEarned ?? null);
      } else {
        toast.success("Flag accepted! Access granted.");
        setCompletedAt(new Date().toISOString());
        setPointsEarned(data?.pointsEarned ?? null);
      }
      setFlag("");
    } catch (err: unknown) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error(err instanceof Error ? err.message : "Incorrect flag. Re-evaluate payload.");
    } finally {
      setSubmittingFlag(false);
    }
  };

  const submitFlagVoid = (e: FormEvent) => {
    void submitFlag(e);
  };

  if (loading) {
    return (
      <div className="py-24">
        <LoadingSpinner message="INITIALIZING_TASK_TELEMETRY" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-mono">
      {/* Return Link */}
      <div>
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-accent uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>[ // BACK_TO_MISSIONS ]</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-widest">
          [ERR]: {error}
        </div>
      )}

      {!task ? (
        <EmptyState
          title="TASK_NOT_FOUND"
          description="The requested task objective is unrecorded or unauthorized."
        />
      ) : (
        <>
          {/* Header Dossier with SpotlightCard */}
          <SpotlightCard className="p-6 sm:p-8 relative">
            <span className="absolute top-1 left-1 text-[8px] text-border pointer-events-none">+</span>
            <span className="absolute top-1 right-1 text-[8px] text-border pointer-events-none">+</span>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-4">
              <span className="text-xs font-bold text-accent tracking-widest uppercase">
                [ OBJECTIVE // TASK_#{task.id} ]
              </span>
              <div className="flex items-center gap-3">
                {completedAt ? (
                  <TacticalBadge label="OBJECTIVE_ACCOMPLISHED" variant="success" size="sm" />
                ) : (
                  <TacticalBadge label="ACTIVE_CHALLENGE" variant="warning" pulse size="sm" />
                )}
                {task.points != null && (
                  <TacticalBadge label={`+${task.points} PTS`} variant="cyan" size="sm" />
                )}
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-display font-black text-ink uppercase tracking-wider mb-2">
              <DecryptedText text={task.title} speed={25} />
            </h1>

            {task.prompt && (
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {task.prompt}
              </p>
            )}
          </SpotlightCard>

          {/* Success Banner */}
          <AnimatePresence>
            {completedAt && (
              <FadeIn direction="up" className="p-4 bg-success/10 border border-success text-success flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle className="w-4 h-4 shrink-0 text-success" />
                  <span>
                    SOLVED ON {new Date(completedAt).toLocaleDateString()}
                    {pointsEarned != null ? ` // AWARDED +${pointsEarned} CREDITS` : ""}
                  </span>
                </div>
                <TacticalBadge label="SEALED" variant="success" size="sm" />
              </FadeIn>
            )}
          </AnimatePresence>

          {/* Operational Briefing & Flag Submission Deck */}
          <div className="bg-surface border border-border p-6 space-y-6 shadow-sm">
            {/* Task Content / Body Markdown */}
            {task.contentMd || task.bodyMarkdown ? (
              <div className="border border-border p-5 bg-paper">
                <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="text-accent">#</span> OPERATIONAL_INSTRUCTIONS
                </h2>
                <div className="text-xs text-ink/90 whitespace-pre-wrap font-mono leading-relaxed">
                  {task.contentMd || task.bodyMarkdown}
                </div>
              </div>
            ) : null}

            {/* Flag Submission Console with Motion Shake on Error */}
            {task.type === "flag" && !completedAt && (
              <motion.div
                animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
                transition={{ duration: 0.5 }}
                className="border border-accent/40 bg-accent-dim p-5 relative overflow-hidden"
              >
                <BorderBeam size={180} duration={8} colorFrom="#FF4500" colorTo="#00F0FF" />

                <h2 className="text-xs font-bold text-accent uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
                  <Key className="w-4 h-4" /> SUBMIT_SECURITY_FLAG
                </h2>
                <p className="text-[11px] text-muted mb-4 font-mono relative z-10">
                  Enter the captured flag extracted from the target machine (format: XPLOIT{'{...}'}).
                </p>

                <form onSubmit={submitFlagVoid} className="flex flex-col sm:flex-row gap-3 relative z-10">
                  <div className="flex-1">
                    <Input
                      value={flag}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlag(e.target.value)}
                      placeholder="XPLOIT{...}"
                      autoComplete="off"
                      className="bg-paper"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={submittingFlag}
                    disabled={submittingFlag || !flag.trim()}
                    className="sm:self-end"
                  >
                    <span>{">>>"} TRANSMIT_FLAG</span>
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Intel Hints Accordion */}
            {Array.isArray(task.hints) && task.hints.length > 0 && (
              <div className="border border-border p-5 bg-paper">
                <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-warning" />
                  <span>INTELLIGENCE_HINTS</span>
                </h2>
                <div className="space-y-2">
                  {task.hints.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-surface border border-border text-xs text-muted font-mono leading-relaxed"
                    >
                      <span className="text-warning font-bold mr-2">[HINT_0{idx + 1}]:</span>
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TaskDetail;