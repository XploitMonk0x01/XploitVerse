import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle, Flag, HelpCircle, Terminal } from "lucide-react";
import { Button, Input, LoadingSpinner } from "../../components/ui";
import { flagService, taskService, userService } from "../../services";

const taskTypeConfig = {
    flag: { label: "Flag", icon: Flag, cls: "text-green-400 border-green-900 bg-green-900/20" },
    question: { label: "Quiz", icon: HelpCircle, cls: "text-blue-400 border-blue-900 bg-blue-900/20" },
    interactive: { label: "Lab", icon: Terminal, cls: "text-purple-400 border-purple-900 bg-purple-900/20" },
};

const TaskDetail = () => {
    const { id } = useParams();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [flag, setFlag] = useState("");
    const [submittingFlag, setSubmittingFlag] = useState(false);
    const [completedAt, setCompletedAt] = useState(null);
    const [pointsEarned, setPointsEarned] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const [taskRes, progressRes] = await Promise.allSettled([
                    taskService.getById(id),
                    userService.getMyProgress(),
                ]);

                if (!cancelled) {
                    if (taskRes.status === "fulfilled") {
                        setTask(taskRes.value.data?.data?.task || null);
                    } else {
                        setError(taskRes.reason?.response?.data?.message || "Failed to load task");
                    }

                    if (progressRes.status === "fulfilled") {
                        const prog = progressRes.value.data?.data?.progress || [];
                        const mine = prog.find((p) => p.taskId === id || p.taskId?.$oid === id);
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
        load();
        return () => { cancelled = true; };
    }, [id]);

    const submitFlag = async (e) => {
        e.preventDefault();
        const trimmed = flag.trim();
        if (!trimmed) return;

        try {
            setSubmittingFlag(true);
            const res = await flagService.submit({ taskId: id, flag: trimmed });
            const data = res.data?.data;
            if (data?.alreadySolved) {
                toast.success("Already solved!");
                setCompletedAt(data.completedAt || new Date().toISOString());
                setPointsEarned(data.pointsEarned ?? null);
            } else {
                toast.success(res.data?.message || "Correct flag! 🎯");
                setCompletedAt(new Date().toISOString());
                setPointsEarned(data?.pointsEarned ?? null);
            }
            setFlag("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit flag");
        } finally {
            setSubmittingFlag(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <LoadingSpinner size="lg" className="py-24" />
            </div>
        );
    }

    const typeCfg = task && taskTypeConfig[task.type?.toLowerCase()];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {error && (
                <div className="mb-6 card-cyber px-4 py-3">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {!task ? (
                <div className="card-cyber p-6">
                    <p className="text-gray-300">Task not found.</p>
                    <Link to="/courses" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
                        ← Back to courses
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mb-8">
                        <Link to="/courses" className="text-sm text-gray-400 hover:text-white">
                            ← Courses
                        </Link>

                        <div className="flex flex-wrap items-start gap-3 mt-3">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white flex-1">{task.title}</h1>
                            {completedAt && (
                                <span className="flex items-center gap-1.5 text-sm text-green-400 mt-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Solved
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            {typeCfg && (
                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${typeCfg.cls}`}>
                                    <typeCfg.icon className="h-3 w-3" />
                                    {typeCfg.label}
                                </span>
                            )}
                            {task.points != null && (
                                <span className="text-xs text-green-500">{task.points} pts</span>
                            )}
                            {pointsEarned != null && completedAt && (
                                <span className="text-xs text-gray-500">
                                    +{pointsEarned} pts earned
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Completion banner */}
                    {completedAt && (
                        <div className="mb-6 px-4 py-3 rounded-lg border border-green-900 bg-green-900/20 flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                            <p className="text-sm text-green-300">
                                Task completed on {new Date(completedAt).toLocaleDateString()}.
                                {pointsEarned != null && ` You earned ${pointsEarned} points.`}
                            </p>
                        </div>
                    )}

                    <div className="card-cyber p-6 space-y-5">
                        {task.prompt ? (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-200 mb-2">Prompt</h2>
                                <p className="text-gray-300 whitespace-pre-wrap">{task.prompt}</p>
                            </div>
                        ) : null}

                        {task.type === "flag" && !completedAt ? (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-200 mb-3">Submit Flag</h2>
                                <form onSubmit={submitFlag} className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1">
                                        <Input
                                            label={null}
                                            value={flag}
                                            onChange={(e) => setFlag(e.target.value)}
                                            placeholder="FLAG{...}"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        isLoading={submittingFlag}
                                        disabled={submittingFlag || !flag.trim()}
                                        className="sm:self-end"
                                    >
                                        Submit
                                    </Button>
                                </form>
                            </div>
                        ) : null}

                        {task.contentMd ? (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-200 mb-2">Notes</h2>
                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/40 border border-gray-800 rounded-lg p-4">
                                    {task.contentMd}
                                </pre>
                            </div>
                        ) : null}

                        {Array.isArray(task.hints) && task.hints.length > 0 ? (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-200 mb-2">Hints</h2>
                                <ul className="space-y-2">
                                    {task.hints.map((h, idx) => (
                                        <li
                                            key={idx}
                                            className="text-sm text-gray-300 border border-gray-800 rounded-lg px-3 py-2"
                                        >
                                            💡 {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
};

export default TaskDetail;
