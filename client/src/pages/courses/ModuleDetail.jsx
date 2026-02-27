import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingSpinner } from "../../components/ui";
import { moduleService } from "../../services";
import { Flag, HelpCircle, Terminal, ChevronRight } from "lucide-react";

const taskTypeConfig = {
    flag: {
        label: "Flag",
        icon: Flag,
        cls: "text-green-400 border-green-900 bg-green-900/20",
    },
    question: {
        label: "Quiz",
        icon: HelpCircle,
        cls: "text-blue-400 border-blue-900 bg-blue-900/20",
    },
    interactive: {
        label: "Lab",
        icon: Terminal,
        cls: "text-purple-400 border-purple-900 bg-purple-900/20",
    },
};

const TaskTypeBadge = ({ type }) => {
    const cfg = taskTypeConfig[type?.toLowerCase()];
    if (!cfg) {
        return (
            <span className="text-xs px-2 py-0.5 rounded border border-gray-800 text-gray-500">
                {type || "Task"}
            </span>
        );
    }
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${cfg.cls}`}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
};

const ModuleDetail = () => {
    const { id } = useParams();
    const [module, setModule] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await moduleService.getById(id);
                const data = res.data?.data;
                if (!cancelled) {
                    setModule(data?.module || null);
                    setTasks(data?.tasks || []);
                }
            } catch (e) {
                if (!cancelled) setError(e.response?.data?.message || "Failed to load module");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <LoadingSpinner size="lg" className="py-24" />
            </div>
        );
    }

    const totalPoints = tasks.reduce((acc, t) => acc + (t.points || 0), 0);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {error && (
                <div className="mb-6 card-cyber px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {!module ? (
                <div className="card-cyber p-6">
                    <p className="text-gray-300">Module not found.</p>
                    <Link to="/courses" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
                        ← Back to courses
                    </Link>
                </div>
            ) : (
                <>
                    {/* Breadcrumb */}
                    <div className="mb-8">
                        <Link to="/courses" className="text-sm text-gray-400 hover:text-white">
                            ← Courses
                        </Link>

                        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-3">{module.title}</h1>

                        {module.description && (
                            <p className="text-gray-400 mt-2 max-w-3xl">{module.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                            <span>{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
                            {totalPoints > 0 && (
                                <span className="text-green-500">{totalPoints} pts total</span>
                            )}
                        </div>
                    </div>

                    {/* Tasks list */}
                    <div className="card-cyber p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Tasks</h2>

                        {tasks.length === 0 ? (
                            <p className="text-gray-400">No tasks published yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {tasks.map((t, idx) => {
                                    const taskId = t.id || t._id;
                                    return (
                                        <Link
                                            key={taskId}
                                            to={`/tasks/${taskId}`}
                                            className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-gray-800 hover:border-gray-600 hover:bg-gray-800/30 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs text-gray-600 w-5 shrink-0 text-right">
                                                    {t.order ?? idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-white font-medium truncate">{t.title}</p>
                                                    {t.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <TaskTypeBadge type={t.type} />
                                                {typeof t.points === "number" && t.points > 0 && (
                                                    <span className="text-xs text-green-500 w-14 text-right">
                                                        {t.points} pts
                                                    </span>
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

export default ModuleDetail;
