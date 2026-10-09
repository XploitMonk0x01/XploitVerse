import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  Stat,
  Badge,
} from "../../components/ui";
import { StaggerContainer, FadeIn } from "../../components/ui/motion";
import { moduleService } from "../../services";
import { ChevronRight, ListChecks, Award, FolderOpen } from "lucide-react";
import type { Module, Task } from "../../types";

export const ModuleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [module, setModule] = useState<Module | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await moduleService.getById(Number(id));
        if (!cancelled) {
          setModule(res.module || null);
          setTasks(res.tasks || []);
        }
      } catch (e: unknown) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load module");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-content space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const totalPoints = tasks.reduce((acc, t) => acc + (t.points || 0), 0);

  return (
    <StaggerContainer className="mx-auto max-w-content space-y-6">
      <FadeIn>
        <PageHeader
          title={module?.title || "Module"}
          subtitle={module?.description}
          backLink={{ href: "/courses", label: "Back to course" }}
          badge={{ label: `Module ${module?.order || 1}`, variant: "neutral" }}
        />
      </FadeIn>

      {error ? (
        <FadeIn>
          <ErrorState error={error} title="Could not load module" />
        </FadeIn>
      ) : !module ? (
        <FadeIn>
          <EmptyState
            icon={<FolderOpen className="h-5 w-5" strokeWidth={1.75} />}
            title="Module not found"
            description="This module is not available, or it has been removed from the course."
          />
        </FadeIn>
      ) : (
        <>
          <FadeIn>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Stat
                label="Tasks"
                value={tasks.length}
                icon={<ListChecks className="h-4 w-4" strokeWidth={1.75} />}
                tone="accent"
              />
              <Stat
                label="Points available"
                value={`+${totalPoints} PTS`}
                icon={<Award className="h-4 w-4" strokeWidth={1.75} />}
              />
            </div>
          </FadeIn>

          <FadeIn>
            <Card padding="lg">
              <div className="mb-4 flex items-center gap-2 border-b border-border-subtle pb-4">
                <ListChecks className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-fg">Tasks</h2>
                <span className="ml-auto text-xs text-fg-subtle">
                  {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                </span>
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  No individual tasks registered in this module yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {tasks.map((task, idx) => (
                    <li key={task.id}>
                      <Link
                        to={`/tasks/${task.id}`}
                        className="group flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-overlay/60 p-4 transition-colors hover:border-accent hover:bg-accent/5"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="w-6 shrink-0 font-mono text-xs text-fg-subtle group-hover:text-accent">
                            {String(task.order ?? idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-fg transition-colors group-hover:text-accent">
                              {task.title}
                            </p>
                            {task.prompt && (
                              <p className="mt-1 truncate text-xs text-fg-muted">
                                {task.prompt}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <Badge variant="info" size="sm">
                            +{task.points || 0} PTS
                          </Badge>
                          <ChevronRight
                            className="h-4 w-4 text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                            strokeWidth={1.75}
                          />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </FadeIn>
        </>
      )}
    </StaggerContainer>
  );
};

export default ModuleDetail;
