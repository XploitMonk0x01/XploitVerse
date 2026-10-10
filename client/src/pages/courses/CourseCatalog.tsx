import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Input,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  Badge,
  Card,
  difficultyVariant,
} from "../../components/ui";
import { courseService } from "../../services";
import { Search, ChevronRight, Terminal } from "lucide-react";
import type { Course } from "../../types";
import { StaggerContainer, FadeIn } from "../../components/ui/motion/MotionWrappers";

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"] as const;

export const CourseCatalog = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>("All");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await courseService.getAll();
      setCourses(res.courses || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesDiff = difficulty === "All" || c.difficulty === difficulty;
      const matchesSearch =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q));
      return matchesDiff && matchesSearch;
    });
  }, [courses, search, difficulty]);

  return (
    <StaggerContainer className="mx-auto max-w-content space-y-6">
      <FadeIn direction="down">
        <PageHeader
          title="Challenge catalog"
          subtitle={`${courses.length} penetration testing courses available`}
        />
      </FadeIn>

      {/* Filters */}
      <FadeIn direction="up" className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search by title, tag, or vulnerability..."
            icon={Search}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors select-none ${
                difficulty === d
                  ? 'border-accent bg-accent text-accent-fg shadow-card'
                  : 'border-border bg-bg-raised text-fg-muted hover:border-border-strong hover:text-fg'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </FadeIn>

      {error && (
        <FadeIn>
          <ErrorState error={error} onRetry={() => { void load(); }} title="Could not load courses" />
        </FadeIn>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" role="status">
          <span className="sr-only">Loading courses</span>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <FadeIn>
          <EmptyState
            title="No matching courses"
            description={
              courses.length === 0
                ? "No courses have been published yet."
                : "No courses match your search. Try a different term or filter."
            }
          />
        </FadeIn>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <Link
              key={course.id || course.slug}
              to={`/courses/${course.slug}`}
              className="group block h-full"
            >
              <Card padding="lg" className="flex h-full flex-col transition-shadow group-hover:shadow-pop">
                {/* Header row */}
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant={difficultyVariant(course.difficulty)} size="sm">
                    {course.difficulty || 'Easy'}
                  </Badge>
                  <Terminal className="h-3.5 w-3.5 shrink-0 text-fg-subtle" strokeWidth={1.75} />
                </div>

                {/* Title */}
                <h2 className="mb-2 line-clamp-2 text-base font-semibold leading-tight tracking-tight text-fg transition-colors group-hover:text-accent">
                  {course.title}
                </h2>

                <p className="mb-5 line-clamp-3 flex-1 text-sm leading-relaxed text-fg-muted">
                  {course.description || 'Hands-on vulnerable environment with real attack paths.'}
                </p>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between border-t border-border-subtle pt-3">
                  <span className="font-mono text-xs text-fg-subtle">{course.slug}</span>
                  <div className="flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors group-hover:text-accent">
                    <span>Open</span>
                    <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </StaggerContainer>
  );
};

export default CourseCatalog;
