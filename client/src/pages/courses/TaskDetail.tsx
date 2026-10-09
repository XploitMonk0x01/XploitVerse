import { type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Key, Lightbulb, ListChecks } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  SkeletonCard,
} from "../../components/ui";
import { FadeIn, StaggerContainer } from "../../components/ui/motion";
import { flagService, taskService, userService } from "../../services";
import type { Task } from "../../types";

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
        toast.success("Flag accepted. Task complete.");
        setCompletedAt(new Date().toISOString());
        setPointsEarned(data?.pointsEarned ?? null);
      }
      setFlag("");
    } catch (err: unknown) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error(err instanceof Error ? err.message : "Incorrect flag. Check your payload.");
    } finally {
      setSubmittingFlag(false);
    }
  };

  const submitFlagVoid = (e: FormEvent) => {
    void submitFlag(e);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-content space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <StaggerContainer className="mx-auto max-w-content space-y-6">
      <FadeIn>
        <PageHeader
          title={task?.title || "Task"}
          subtitle={task?.prompt}
          backLink={{ href: "/courses", label: "Back to catalog" }}
          badge={
            task
              ? {
                  label: completedAt ? "Completed" : "In progress",
                  variant: completedAt ? "success" : "warning",
                }
              : undefined
          }
        />
      </FadeIn>

      {error && (
        <FadeIn>
          <ErrorState error={error} title="Could not load task" />
        </FadeIn>
      )}

      {!task ? (
        <FadeIn>
          <EmptyState
            icon={<ListChecks className="h-5 w-5" strokeWidth={1.75} />}
            title="Task not found"
            description="This task is not available, or it has been removed from the course."
          />
        </FadeIn>
      ) : (
        <>
          <FadeIn>
            <Card padding="lg" className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-accent">Objective — Task #{task.id}</span>
              {task.points != null && (
                <Badge variant="info" size="sm">
                  +{task.points} PTS
                </Badge>
              )}
            </Card>
          </FadeIn>

          <AnimatePresence>
            {completedAt && (
              <FadeIn className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-fg">
                  <CheckCircle className="h-4 w-4 shrink-0 text-success" strokeWidth={1.75} />
                  <span>Completed on {new Date(completedAt).toLocaleDateString()}</span>
                  {pointsEarned != null && (
                    <span className="font-medium text-success">+{pointsEarned} points</span>
                  )}
                </div>
              </FadeIn>
            )}
          </AnimatePresence>

          {task.contentMd || task.bodyMarkdown ? (
            <FadeIn>
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4 text-accent" strokeWidth={1.75} />
                    Instructions
                  </CardTitle>
                </CardHeader>
                <div className="whitespace-pre-wrap rounded-md border border-border-subtle bg-bg-overlay/60 p-4 font-mono text-xs leading-relaxed text-fg-muted">
                  {task.contentMd || task.bodyMarkdown}
                </div>
              </Card>
            </FadeIn>
          ) : null}

          {task.type === "flag" && !completedAt && (
            <motion.div
              animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
              className="rounded-lg border border-accent/30 bg-accent/5 p-6 shadow-card"
            >
              <h2 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-fg">
                <Key className="h-4 w-4 text-accent" strokeWidth={1.75} />
                Submit flag
              </h2>
              <p className="mb-4 text-sm text-fg-muted">
                Enter the flag you captured on the target. Format: XPLOIT{'{...}'}.
              </p>

              <form onSubmit={submitFlagVoid} className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <Input
                    value={flag}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFlag(e.target.value)}
                    placeholder="XPLOIT{...}"
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" variant="primary" disabled={submittingFlag || !flag.trim()}>
                  {submittingFlag ? "Submitting…" : "Submit"}
                </Button>
              </form>
            </motion.div>
          )}

          {Array.isArray(task.hints) && task.hints.length > 0 && (
            <FadeIn>
              <Card padding="lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="h-4 w-4 text-warn" strokeWidth={1.75} />
                    Hints
                  </CardTitle>
                </CardHeader>
                <ul className="space-y-2">
                  {task.hints.map((h, idx) => (
                    <li
                      key={idx}
                      className="rounded-md border border-border-subtle bg-bg-overlay/60 p-3 text-sm leading-relaxed text-fg-muted"
                    >
                      <span className="mr-2 font-medium text-fg">Hint {idx + 1}</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </Card>
            </FadeIn>
          )}
        </>
      )}
    </StaggerContainer>
  );
};

export default TaskDetail;
