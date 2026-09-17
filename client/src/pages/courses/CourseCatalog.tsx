import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Input, LoadingSpinner, EmptyState } from "../../components/ui";
import { courseService } from "../../services";
import { Search, Lock, ChevronRight, Terminal } from "lucide-react";
import type { Course } from "../../types";
import { SpotlightCard } from "../../components/ui/motion/SpotlightCard";
import { TacticalBadge } from "../../components/ui/motion/TacticalBadge";
import { StaggerContainer, FadeIn } from "../../components/ui/motion/MotionWrappers";
import { DecryptedText } from "../../components/ui/motion/DecryptedText";

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
      setError(e instanceof Error ? e.message : 'Failed to load missions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = courses.filter((c) => {
    const matchesDiff = difficulty === "All" || c.difficulty === difficulty;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.title?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.tags?.some((t) => t.toLowerCase().includes(q));
    return matchesDiff && matchesSearch;
  });

  const getDifficultyVariant = (diff?: string): 'cyan' | 'warning' | 'error' | 'muted' => {
    switch (diff?.toLowerCase()) {
      case 'easy':
      case 'beginner':
        return 'cyan';
      case 'medium':
      case 'intermediate':
        return 'warning';
      case 'hard':
      case 'advanced':
      case 'expert':
        return 'error';
      default:
        return 'muted';
    }
  };

  return (
    <StaggerContainer className="space-y-8 font-mono">
      {/* Header */}
      <FadeIn direction="down" className="border-b border-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-black text-ink tracking-tight uppercase leading-none mb-2">
          <DecryptedText text="Challenge Catalog" speed={20} />
        </h1>
        <p className="text-xs text-muted">
          {courses.length} penetration testing modules available
        </p>
      </FadeIn>

      {/* Filters */}
      <FadeIn direction="up" className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Search by title, tag, or vulnerability..."
            icon={Search}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DIFFICULTIES.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] border transition-all select-none active:translate-x-[1px] active:translate-y-[1px] ${difficulty === d
                ? 'bg-accent text-paper border-accent shadow-accent'
                : 'bg-surface border-border text-muted hover:text-ink hover:border-border-bright'
                }`}
            >
              {d === 'All' ? 'All' : d}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Error Banner */}
      {error && (
        <FadeIn className="p-4 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-widest">
          [ERR]: {error}
        </FadeIn>
      )}

      {/* Content Grid */}
      {loading ? (
        <div className="py-20">
          <LoadingSpinner message="FETCHING_MISSION_DOSSIERS" />
        </div>
      ) : filtered.length === 0 ? (
        <FadeIn>
          <EmptyState
            title="NO_MATCHING_MISSIONS"
            description={
              courses.length === 0
                ? "No challenge rooms currently published in the operational catalog."
                : "Zero targets matched your query parameters. Adjust filter dials."
            }
          />
        </FadeIn>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {filtered.map((course) => (
            <Link
              key={course.id || course.slug}
              to={`/courses/${course.slug}`}
              className="block group h-full"
            >
              <SpotlightCard
                className="p-5 flex flex-col h-full bg-surface"
                spotlightColor="rgba(0, 229, 255, 0.06)"
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <TacticalBadge
                    label={course.difficulty || 'Easy'}
                    variant={getDifficultyVariant(course.difficulty)}
                    size="sm"
                  />
                  {course.isPremium ? (
                    <Lock className="w-3.5 h-3.5 text-warning shrink-0" />
                  ) : (
                    <Terminal className="w-3.5 h-3.5 text-dim shrink-0" />
                  )}
                </div>

                {/* Title */}
                <h2 className="text-base font-display font-black text-ink group-hover:text-accent transition-colors uppercase tracking-tight mb-2 line-clamp-2 leading-tight">
                  {course.title}
                </h2>

                <p className="text-muted text-xs leading-relaxed line-clamp-3 mb-5 flex-1">
                  {course.description || 'Live vulnerable environment with real-world attack vectors.'}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                  <span className="text-[10px] text-dim font-mono tracking-wider uppercase">
                    {course.slug}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-muted group-hover:text-accent uppercase tracking-wider transition-colors">
                    <span>Open</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      )}
    </StaggerContainer>
  );
};

export default CourseCatalog;