import { useEffect, useState, useCallback } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import { LoadingSpinner, EmptyState, Button } from "../components/ui";
import {
  SpotlightCard,
  BorderBeam,
  DecryptedText,
  TacticalBadge,
  StaggerContainer,
  FadeIn,
  ScalePress,
} from "../components/ui/motion";
import { leaderboardService } from "../services";
import { useAuth } from "../context/AuthContext";
import type { LeaderboardEntry, MyRank } from "../types";

const REFRESH_MS = 30_000;

export const Leaderboard = () => {
  const { user: currentUser } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [lbRes, myRes] = await Promise.allSettled([
        leaderboardService.getTop(),
        leaderboardService.getMyRank(),
      ]);

      if (lbRes.status === "fulfilled") {
        setEntries(lbRes.value.leaderboard || []);
        setLastUpdated(new Date());
      } else {
        setError(lbRes.reason instanceof Error ? lbRes.reason.message : "Failed to load operative rankings");
      }

      if (myRes.status === "fulfilled") {
        setMyRank(myRes.value || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const handleRefresh = () => {
    void load();
  };

  const getRankPill = (rank: number) => {
    if (rank === 1)
      return (
        <TacticalBadge variant="warning" size="sm" pulse>
          #01
        </TacticalBadge>
      );
    if (rank === 2)
      return (
        <TacticalBadge variant="neutral" size="sm">
          #02
        </TacticalBadge>
      );
    if (rank === 3)
      return (
        <TacticalBadge variant="info" size="sm">
          #03
        </TacticalBadge>
      );
    return (
      <span className="font-mono text-dim font-bold text-xs">
        #{String(rank).padStart(2, "0")}
      </span>
    );
  };

  return (
    <StaggerContainer className="max-w-4xl mx-auto space-y-8 font-mono">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-ink tracking-tight uppercase leading-none mb-2">
              <DecryptedText text="Leaderboard" animateOn="view" speed={20} />
            </h1>
            <p className="text-xs text-muted">
              Global operative rankings by points and completed challenges
            </p>
          </div>
          <ScalePress scale={0.98}>
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </ScalePress>
        </div>
      </FadeIn>

      {/* User's Operative Dossier Rank Card */}
      {myRank && (
        <FadeIn delay={0.05}>
          <SpotlightCard
            spotlightColor="rgba(0, 230, 153, 0.15)"
            className="bg-surface border border-accent/60 p-5 sm:p-6 shadow-sm relative overflow-hidden"
          >
            <BorderBeam size={160} duration={10} colorFrom="#00E699" colorTo="#00F0FF" />
            <span className="absolute top-1 left-1 text-[8px] text-border pointer-events-none">+</span>
            <span className="absolute top-1 right-1 text-[8px] text-border pointer-events-none">+</span>
            <span className="absolute bottom-1 left-1 text-[8px] text-border pointer-events-none">+</span>
            <span className="absolute bottom-1 right-1 text-[8px] text-border pointer-events-none">+</span>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-paper border border-accent flex items-center justify-center text-accent font-bold shadow-[2px_2px_0px_var(--color-accent)]">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-muted font-bold tracking-widest uppercase mb-1">
                    YOUR_CURRENT_STANDING
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-ink tracking-tight">
                      {myRank.rank === -1 ? "UNRANKED" : `RANK #${myRank.rank}`}
                    </span>
                    <TacticalBadge variant="accent" size="sm">
                      {currentUser?.role || "OPERATIVE"}
                    </TacticalBadge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 text-xs uppercase border-t sm:border-t-0 border-border pt-3 sm:pt-0">
                <div>
                  <span className="text-muted block text-[10px] tracking-widest mb-0.5">CURRENT_POINTS</span>
                  <span className="text-lg font-black text-cyan font-mono">
                    {Number(myRank.points || 0).toLocaleString()} PTS
                  </span>
                </div>
              </div>
            </div>
          </SpotlightCard>
        </FadeIn>
      )}

      {error && (
        <FadeIn>
          <div className="p-4 bg-error/10 border border-error text-error text-xs font-bold uppercase tracking-widest">
            [ERR]: {error}
          </div>
        </FadeIn>
      )}

      {/* Leaderboard Matrix Table */}
      <FadeIn delay={0.1}>
        {loading ? (
          <div className="py-24">
            <LoadingSpinner message="SYNCING_GLOBAL_STANDINGS" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="STANDINGS_EMPTY"
            description="Zero operative flags recorded. Execute a challenge task to claim first blood rank."
          />
        ) : (
          <div className="bg-surface border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border bg-paper/80 text-[10px] text-muted tracking-[0.12em] uppercase">
                    <th className="px-5 py-3 text-left w-20">Rank</th>
                    <th className="px-5 py-3 text-left">Operative</th>
                    <th className="px-5 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((e, idx) => {
                    const isMe =
                      currentUser &&
                      (e.userId === currentUser.id);

                    return (
                      <tr
                        key={e.userId || idx}
                        className={`transition-colors duration-150 ${isMe
                          ? "bg-accent/10 hover:bg-accent/15 border-l-2 border-l-accent"
                          : "hover:bg-paper/50"
                          }`}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getRankPill(e.rank)}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold uppercase tracking-wider ${isMe ? "text-accent" : "text-ink"
                                }`}
                            >
                              {e.username || "ANONYMOUS_OPERATIVE"}
                            </span>
                            {isMe && (
                              <TacticalBadge variant="accent" size="sm">
                                YOU
                              </TacticalBadge>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right font-bold text-cyan font-mono">
                          +{Number(e.points || 0).toLocaleString()} PTS
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {lastUpdated && (
              <div className="px-5 py-2.5 border-t border-border text-[10px] text-dim text-right tracking-wider uppercase bg-paper/40">
                LAST_POLL: {lastUpdated.toLocaleTimeString()} // AUTO_REFRESH: 30S
              </div>
            )}
          </div>
        )}
      </FadeIn>
    </StaggerContainer>
  );
};

export default Leaderboard;