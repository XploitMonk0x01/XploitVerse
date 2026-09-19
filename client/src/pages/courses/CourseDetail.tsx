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
import { courseService } from "../../services";
import { Lock, ChevronRight, ArrowLeft, Layers, Award } from "lucide-react";
import type { Course, Module } from "../../types";

export const CourseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await courseService.getBySlug(slug || "");
        if (!cancelled) {
          setCourse(res.course || null);
          setModules(res.modules || []);
        }
      } catch (e: unknown) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Failed to load mission track"
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24">
        <LoadingSpinner message="DECRYPTING_MISSION_BRIEFING" />
      </div>
    );
  }

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
            <span>[ // BACK_TO_CATALOG ]</span>
          </Link>
        </div>
      </FadeIn>

      {error && (
        <FadeIn>
          <div className="p-4 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-wider">
            [ERR]: {error}
          </div>
        </FadeIn>
      )}

      {!course ? (
        <FadeIn>
          <EmptyState
            title="MISSION_NOT_FOUND"
            description="The requested challenge track does not exist or has been declassified."
          />
        </FadeIn>
      ) : (
        <>
          {/* Mission Dossier Header Card */}
          <FadeIn>
            <SpotlightCard
              spotlightColor="rgba(0, 230, 153, 0.12)"
              className="bg-surface border border-border p-6 sm:p-8 shadow-sm relative overflow-hidden"
            >
              <span className="absolute top-1 left-1 text-[8px] text-border pointer-events-none">+</span>
              <span className="absolute top-1 right-1 text-[8px] text-border pointer-events-none">+</span>
              <span className="absolute bottom-1 left-1 text-[8px] text-border pointer-events-none">+</span>
              <span className="absolute bottom-1 right-1 text-[8px] text-border pointer-events-none">+</span>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent inline-block animate-pulse" />
                  <span className="text-xs font-bold text-accent tracking-widest uppercase">
                    [ MISSION_BRIEFING // {course.slug} ]
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {course.isPremium && (
                    <TacticalBadge variant="warning" size="sm" pulse>
                      <Lock className="w-3 h-3 mr-1 inline" /> RESTRICTED
                    </TacticalBadge>
                  )}
                  <TacticalBadge variant="neutral" size="sm">
                    SYS_TRACK
                  </TacticalBadge>
                </div>
              </div>

              <h1 className="text-2xl sm:text-4xl font-display font-black text-ink uppercase tracking-wider mb-3">
                <DecryptedText text={course.title} animateOn="view" speed={30} />
              </h1>

              <p className="text-muted text-xs sm:text-sm leading-relaxed max-w-3xl mb-6">
                {course.description ||
                  "Operational challenge room targeting real attack surfaces and vulnerability vectors."}
              </p>

              {/* Tactical Specs Row */}
              <div className="flex flex-wrap items-center gap-4 text-xs border-t border-border pt-4 text-dim uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-bold">DIFFICULTY:</span>
                  <TacticalBadge
                    variant={
                      course.difficulty?.toLowerCase() === "hard"
                        ? "danger"
                        : course.difficulty?.toLowerCase() === "medium"
                        ? "warning"
                        : "info"
                    }
                    size="sm"
                  >
                    {course.difficulty || "EASY"}
                  </TacticalBadge>
                </div>
                <span>::</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-bold">MODULES:</span>
                  <span className="text-ink font-bold">{modules.length}</span>
                </div>
                <span>::</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted font-bold">CONTAINER_ENGINE:</span>
                  <TacticalBadge variant="success" size="sm" pulse>
                    ONLINE
                  </TacticalBadge>
                </div>
              </div>
            </SpotlightCard>
          </FadeIn>

          {/* Module Hierarchy */}
          <FadeIn delay={0.1}>
            <div className="bg-surface border border-border p-6 shadow-sm relative">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-display font-bold text-ink uppercase tracking-wider">
                    MISSION_MODULES
                  </h2>
                </div>
                <span className="text-[10px] text-muted tracking-widest uppercase">
                  TOTAL_BLOCKS: {modules.length}
                </span>
              </div>

              {modules.length === 0 ? (
                <p className="text-xs text-muted">No tactical modules assigned to this room yet.</p>
              ) : (
                <div className="space-y-3">
                  {modules.map((m, idx) => {
                    const moduleId = m.id;
                    return (
                      <ScalePress key={moduleId} scale={0.99}>
                        <Link
                          to={`/modules/${moduleId}`}
                          className="flex items-center justify-between gap-4 p-4 bg-paper border border-border hover:border-accent group transition-all duration-200 relative overflow-hidden"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="text-xs font-bold text-dim group-hover:text-accent w-7 shrink-0 font-mono">
                              [{String(m.order ?? idx + 1).padStart(2, "0")}]
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-ink group-hover:text-accent transition-colors uppercase truncate">
                                {m.title}
                              </p>
                              {m.description && (
                                <p className="text-[11px] text-muted truncate mt-1">
                                  {m.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {typeof m.pointsReward === "number" && (
                              <TacticalBadge variant="cyan" size="sm">
                                <Award className="w-3 h-3 mr-1 inline" />+{m.pointsReward} PTS
                              </TacticalBadge>
                            )}
                            <div className="w-7 h-7 bg-surface border border-border flex items-center justify-center group-hover:border-accent group-hover:bg-accent/10 transition-colors">
                              <ChevronRight className="w-4 h-4 text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </Link>
                      </ScalePress>
                    );
                  })}
                </div>
              )}
            </div>
          </FadeIn>
        </>
      )}
    </StaggerContainer>
  );
};

export default CourseDetail;