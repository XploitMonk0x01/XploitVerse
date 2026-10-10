import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  Badge,
  Stat,
  difficultyVariant,
} from "../../components/ui";
import { StaggerContainer, FadeIn } from "../../components/ui/motion";
import { courseService } from "../../services";
import {
  ChevronRight,
  Layers,
  Award,
  BookOpen,
} from "lucide-react";
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
          setError(e instanceof Error ? e.message : "Failed to load course");
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
          title={course?.title || "Course"}
          subtitle={course?.description}
          backLink={{ href: "/courses", label: "Back to catalog" }}
        />
      </FadeIn>

      {error && (
        <FadeIn>
          <ErrorState error={error} title="Could not load course" />
        </FadeIn>
      )}

      {!course ? (
        <FadeIn>
          <EmptyState
            icon={<BookOpen className="h-5 w-5" strokeWidth={1.75} />}
            title="Course not found"
            description="This course does not exist or is no longer published."
          />
        </FadeIn>
      ) : (
        <>
          {/* Course summary */}
          <FadeIn>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat
                label="Difficulty"
                value={<Badge variant={difficultyVariant(course.difficulty)} size="md">{course.difficulty || "Easy"}</Badge>}
              />
              <Stat
                label="Modules"
                value={modules.length}
                icon={<Layers className="h-4 w-4" strokeWidth={1.75} />}
                tone="accent"
              />
              <Stat
                label="Access"
                value="Pay as you go"
                icon={<Award className="h-4 w-4" strokeWidth={1.75} />}
                tone="neutral"
              />
            </div>
          </FadeIn>

          {/* Modules */}
          <FadeIn>
            <Card padding="lg">
              <div className="mb-4 flex items-center gap-2 border-b border-border-subtle pb-4">
                <Layers className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <h2 className="text-sm font-semibold text-fg">Modules</h2>
                <span className="ml-auto text-xs text-fg-subtle">
                  {modules.length} {modules.length === 1 ? "module" : "modules"}
                </span>
              </div>

              {modules.length === 0 ? (
                <p className="text-sm text-fg-muted">No modules have been added to this course yet.</p>
              ) : (
                <ul className="space-y-3">
                  {modules.map((m, idx) => {
                    const moduleId = m.id;
                    return (
                      <li key={moduleId}>
                        <Link
                          to={`/modules/${moduleId}`}
                          className="group flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-overlay/60 p-4 transition-colors hover:border-accent hover:bg-accent/5"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <span className="w-6 shrink-0 font-mono text-xs text-fg-subtle group-hover:text-accent">
                              {String(m.order ?? idx + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-fg transition-colors group-hover:text-accent">
                                {m.title}
                              </p>
                              {m.description && (
                                <p className="mt-1 truncate text-xs text-fg-muted">
                                  {m.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            {typeof m.pointsReward === "number" && (
                              <Badge variant="info" size="sm">
                                +{m.pointsReward} PTS
                              </Badge>
                            )}
                            <ChevronRight
                              className="h-4 w-4 text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                              strokeWidth={1.75}
                            />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </FadeIn>
        </>
      )}
    </StaggerContainer>
  );
};

export default CourseDetail;
