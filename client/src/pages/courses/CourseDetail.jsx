import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingSpinner } from "../../components/ui";
import { courseService } from "../../services";
import { Lock, ChevronRight } from "lucide-react";

const difficultyStyle = {
    Easy: "text-green-400 border-green-900 bg-green-900/20",
    Medium: "text-yellow-400 border-yellow-900 bg-yellow-900/20",
    Hard: "text-red-400 border-red-900 bg-red-900/20",
};

const CourseDetail = () => {
    const { slug } = useParams();
    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await courseService.getBySlug(slug);
                const data = res.data?.data;
                if (!cancelled) {
                    setCourse(data?.course || null);
                    setModules(data?.modules || []);
                }
            } catch (e) {
                if (!cancelled) setError(e.response?.data?.message || "Failed to load course");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [slug]);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <LoadingSpinner size="lg" className="py-24" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {error && (
                <div className="mb-6 card-cyber px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {!course ? (
                <div className="card-cyber p-6">
                    <p className="text-gray-300">Course not found.</p>
                    <Link to="/courses" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
                        ← Back to courses
                    </Link>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="mb-8">
                        <Link to="/courses" className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1">
                            ← Courses
                        </Link>

                        <div className="flex flex-wrap items-start gap-3 mt-3">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white flex-1">
                                {course.title}
                            </h1>
                            {course.isPremium && (
                                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 mt-1">
                                    <Lock className="h-3 w-3" /> Premium
                                </span>
                            )}
                        </div>

                        {course.description && (
                            <p className="text-gray-400 mt-3 max-w-3xl">{course.description}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                            {course.difficulty && (
                                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${difficultyStyle[course.difficulty] || "text-gray-400 border-gray-700"}`}>
                                    {course.difficulty}
                                </span>
                            )}
                            {course.category && (
                                <span className="text-xs text-gray-500">{course.category}</span>
                            )}
                            <span className="text-xs text-gray-600">
                                {modules.length} module{modules.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {/* Tags */}
                        {Array.isArray(course.tags) && course.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {course.tags.map((tag) => (
                                    <span key={tag} className="text-xs px-2 py-0.5 rounded border border-gray-800 text-gray-500">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Modules list */}
                    <div className="card-cyber p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Modules</h2>
                        {modules.length === 0 ? (
                            <p className="text-gray-400">No modules published yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {modules.map((m, idx) => {
                                    const moduleId = m.id || m._id;
                                    return (
                                        <Link
                                            key={moduleId}
                                            to={`/modules/${moduleId}`}
                                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-gray-800 hover:border-gray-600 hover:bg-gray-800/30 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs text-gray-600 w-5 shrink-0 text-right">
                                                    {m.order ?? idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-white font-medium truncate">{m.title}</p>
                                                    {m.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5 truncate">{m.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {typeof m.pointsReward === "number" && (
                                                    <span className="text-xs text-green-500">{m.pointsReward} pts</span>
                                                )}
                                                <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CourseDetail;
