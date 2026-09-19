import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingSpinner, EmptyState } from "../../components/ui";
import {
  SpotlightCard,
  DecryptedText,
  TacticalBadge,
  StaggerContainer,
  FadeIn,
  ScalePress,
} from "../../components/ui/motion";
import { moduleService } from "../../services";
import { ChevronRight, ArrowLeft, Target, Award } from "lucide-react";
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
          setError(
            e instanceof Error ? e.message : "Failed to load tactical module"
          );
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
      <div className="py-24">
        <LoadingSpinner message="ANALYZING_MODULE_OPERATIONS" />
      </div>
    );
  }

  const totalPoints = tasks.reduce((acc, t) => acc + (t.points || 0), 0);

  return (
    <StaggerContainer className="max-w-5xl mx-auto space-y-8 font-mono">
      {/* Return Link */}
      <FadeIn>
        <div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-accent uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>[ // BACK_TO_MISSION ]</span>
          </Link>
        </div>
      </FadeIn>

      {error && (
        <FadeIn>
          <div className="p-4 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-widest">
            [ERR]: {error}
          </div>
        </FadeIn>
      )}

      {!module ? (
        <FadeIn>
          <EmptyState
            title="MODULE_NOT_FOUND"
            description="The requested operation block is unindexed."
          />
        </FadeIn>
      ) : (
        <>
          {/* Module Banner Card */}
          <FadeIn>
            <SpotlightCard
              spotlightColor="rgba(0, 230, 153, 0.12)"
              className="bg-surface border border-border p-6 sm:p-8 shadow-sm relative overflow-hidden"
            >
              <span className="absolute top-1 left-1 text-[8px] text-border pointer-events-none">+</span>
              <span className="absolute top-1 right-1 text-[8px] text-border pointer-events-none">+</span>
              <span className="absolute bottom-1 left-1 text-[8px] text-border pointer-events-none">+</span>
              <span className="absolute bottom-1 right-1 text-[8px] text-border pointer-events-none">+</span>

              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-accent inline-block animate-pulse" />
                <span className="text-xs font-bold text-accent tracking-widest uppercase">
                  [ MODULE // SEQUENCE_0{module.order || 1} ]
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-display font-black text-ink uppercase tracking-wider mb-3">
                <DecryptedText text={module.title} animateOn="view" speed={30} />
              </h1>

              {module.description && (
                <p className="text-muted text-xs sm:text-sm leading-relaxed max-w-3xl mb-6">
                  {module.description}
                </p>
              )}

              {/* Sub-Metrics */}
              <div className="flex flex-wrap items-center gap-4 text-xs border-t border-border pt-4 text-dim uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-bold">TOTAL_TASKS:</span>
                  <TacticalBadge variant="neutral" size="sm">
                    {tasks.length}
                  </TacticalBadge>
                </div>
                <span>::</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-bold">ACCUMULATIVE_POINTS:</span>
                  <TacticalBadge variant="cyan" size="sm">
                    <Award className="w-3 h-3 mr-1 inline" />+{totalPoints} PTS
                  </TacticalBadge>
                </div>
              </div>
            </SpotlightCard>
          </FadeIn>

          {/* Tasks Execution Matrix */}
          <FadeIn delay={0.1}>
            <div className="bg-surface border border-border p-6 shadow-sm relative">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-display font-bold text-ink uppercase tracking-wider">
                    MISSION_TASKS
                  </h2>
                </div>
                <span className="text-[10px] text-muted tracking-widest uppercase">
                  COUNT: {tasks.length}
                </span>
              </div>

              {tasks.length === 0 ? (
                <p className="text-xs text-muted">No individual tasks registered for this sequence.</p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task, idx) => (
                    <ScalePress key={task.id} scale={0.99}>
                      <Link
                        to={`/tasks/${task.id}`}
                        className="flex items-center justify-between gap-4 p-4 bg-paper border border-border hover:border-accent group transition-all duration-200 relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="text-xs font-bold text-dim group-hover:text-accent w-7 shrink-0 font-mono">
                            [{String(task.order ?? idx + 1).padStart(2, "0")}]
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-ink group-hover:text-accent transition-colors uppercase truncate">
                              {task.title}
                            </p>
                            {task.prompt && (
                              <p className="text-[11px] text-muted truncate mt-1">
                                {task.prompt}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <TacticalBadge variant="cyan" size="sm">
                            +{task.points || 0} PTS
                          </TacticalBadge>
                          <div className="w-7 h-7 bg-surface border border-border flex items-center justify-center group-hover:border-accent group-hover:bg-accent/10 transition-colors">
                            <ChevronRight className="w-4 h-4 text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </Link>
                    </ScalePress>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        </>
      )}
    </StaggerContainer>
  );
};

export default ModuleDetail;