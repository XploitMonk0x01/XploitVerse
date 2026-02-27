import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Input, LoadingSpinner } from "../../components/ui";
import { courseService } from "../../services";
import { Search, Lock } from "lucide-react";

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];

const difficultyStyle = {
    Easy: "text-green-400 border-green-900 bg-green-900/20",
    Medium: "text-yellow-400 border-yellow-900 bg-yellow-900/20",
    Hard: "text-red-400 border-red-900 bg-red-900/20",
};

const CourseCatalog = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [difficulty, setDifficulty] = useState("All");

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await courseService.getAll();
            setCourses(res.data?.data?.courses || []);
        } catch (e) {
            setError(e.response?.data?.message || "Failed to load courses");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

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

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Courses</h1>
                <p className="text-gray-400 mt-1">Pick a track and start learning.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <div className="flex-1">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search courses…"
                        icon={Search}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {DIFFICULTIES.map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${difficulty === d
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
                                }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mb-6 card-cyber px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {loading ? (
                <LoadingSpinner size="lg" className="py-24" />
            ) : filtered.length === 0 ? (
                <div className="card-cyber p-6">
                    <p className="text-gray-300">
                        {courses.length === 0 ? "No courses published yet." : "No courses match your filters."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((course) => (
                        <Link
                            key={course.id || course._id || course.slug}
                            to={`/courses/${course.slug}`}
                            className="card-cyber p-5 block hover:border-gray-600 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="text-base font-semibold text-white leading-tight">
                                    {course.title}
                                </h2>
                                {course.isPremium && (
                                    <Lock className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                                )}
                            </div>

                            {course.description ? (
                                <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                                    {course.description}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-600 mt-2 italic">No description.</p>
                            )}

                            {Array.isArray(course.tags) && course.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {course.tags.slice(0, 4).map((tag) => (
                                        <span key={tag} className="text-xs px-2 py-0.5 rounded border border-gray-800 text-gray-500">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-3 mt-4 text-xs">
                                {course.difficulty && (
                                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${difficultyStyle[course.difficulty] || "text-gray-400 border-gray-700"}`}>
                                        {course.difficulty}
                                    </span>
                                )}
                                {course.category && (
                                    <span className="text-gray-500">{course.category}</span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CourseCatalog;
