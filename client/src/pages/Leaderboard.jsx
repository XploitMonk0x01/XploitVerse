import { useEffect, useState, useCallback } from "react";
import { Trophy, Medal, RefreshCw } from "lucide-react";
import { LoadingSpinner } from "../components/ui";
import { leaderboardService } from "../services";
import { useAuth } from "../context/AuthContext";

const REFRESH_MS = 30_000;

const rankStyle = (rank) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-gray-500";
};

const RankIcon = ({ rank }) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-300" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
    return <span className={`text-sm font-mono font-bold ${rankStyle(rank)}`}>{rank}</span>;
};

const Leaderboard = () => {
    const { user: currentUser } = useAuth();
    const [entries, setEntries] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const load = useCallback(async () => {
        try {
            setError(null);
            const [lbRes, myRes] = await Promise.allSettled([
                leaderboardService.getTop(),
                leaderboardService.getMyRank(),
            ]);

            if (lbRes.status === "fulfilled") {
                setEntries(lbRes.value.data?.data?.leaderboard || []);
                setLastUpdated(new Date());
            } else {
                setError(lbRes.reason?.response?.data?.message || "Failed to load leaderboard");
            }

            if (myRes.status === "fulfilled") {
                setMyRank(myRes.value.data?.data?.entry || null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, REFRESH_MS);
        return () => clearInterval(t);
    }, [load]);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="h-7 w-7 text-yellow-400" />
                        Leaderboard
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        Top hackers by total points. Updates every 5 minutes.
                    </p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    title="Refresh"
                >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* My rank card */}
            {myRank && (
                <div className="card-cyber p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Your rank</span>
                        <span className={`text-xl font-bold font-mono ${rankStyle(myRank.rank)}`}>
                            {myRank.rank === -1 ? "—" : `#${myRank.rank}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                            <div className="text-white font-semibold">{myRank.totalPoints ?? 0}</div>
                            <div className="text-gray-500 text-xs">points</div>
                        </div>
                        <div className="text-center">
                            <div className="text-white font-semibold">{myRank.tasksCompleted ?? 0}</div>
                            <div className="text-gray-500 text-xs">tasks</div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="card-cyber px-4 py-3 mb-6">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {loading ? (
                <LoadingSpinner size="lg" className="py-24" />
            ) : entries.length === 0 ? (
                <div className="card-cyber p-8 text-center">
                    <Trophy className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-400">No scores yet. Submit a flag to get on the board!</p>
                </div>
            ) : (
                <div className="card-cyber overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                                <th className="px-4 py-3 text-left w-12">#</th>
                                <th className="px-4 py-3 text-left">Player</th>
                                <th className="px-4 py-3 text-right">Tasks</th>
                                <th className="px-4 py-3 text-right">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => {
                                const isMe = currentUser && e.userID === currentUser.id;
                                return (
                                    <tr
                                        key={e.userId}
                                        className={`border-b border-gray-800/50 last:border-0 transition-colors ${isMe ? "bg-green-900/10" : "hover:bg-gray-800/30"
                                            }`}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center w-6">
                                                <RankIcon rank={e.rank} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`font-medium ${isMe ? "text-green-400" : "text-white"}`}>
                                                {e.username || "Anonymous"}
                                                {isMe && <span className="ml-2 text-xs text-green-600">(you)</span>}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-400 font-mono">
                                            {e.tasksCompleted}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold font-mono text-green-400">
                                            {e.totalPoints.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {lastUpdated && (
                        <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-600 text-right">
                            Last refreshed: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
