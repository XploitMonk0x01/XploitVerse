import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trophy, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonTable,
  Stat,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui";
import { FadeIn, StaggerContainer } from "../components/ui/motion";
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
        setError(lbRes.reason instanceof Error ? lbRes.reason.message : "Failed to load rankings");
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

  const renderRank = (rank: number) => {
    if (rank >= 1 && rank <= 3) {
      const variant = rank === 1 ? "warning" : rank === 2 ? "neutral" : "info";
      return (
        <Badge variant={variant} size="sm">
          #{rank}
        </Badge>
      );
    }
    return <span className="font-mono text-xs tabular-nums text-fg-subtle">#{rank}</span>;
  };

  return (
    <StaggerContainer className="mx-auto max-w-content space-y-6">
      <FadeIn>
        <PageHeader
          title="Leaderboard"
          subtitle="Rankings by points and completed challenges."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              iconLeft={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />}
            >
              Refresh
            </Button>
          }
        />
      </FadeIn>

      {myRank && (
        <FadeIn>
          <Card padding="lg">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold text-fg">
                {currentUser?.username ? `${currentUser.username} · ${currentUser.role}` : "Your standing"}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Stat
                label="Your rank"
                value={myRank.rank === -1 ? "Unranked" : `#${myRank.rank}`}
                icon={<Trophy className="h-4 w-4" strokeWidth={1.75} />}
                tone="accent"
              />
              <Stat
                label="Points"
                value={Number(myRank.points || 0).toLocaleString()}
                icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
              />
            </div>
          </Card>
        </FadeIn>
      )}

      {error && (
        <FadeIn>
          <ErrorState error={error} title="Could not load rankings" />
        </FadeIn>
      )}

      <FadeIn>
        {loading ? (
          <Card padding="none" className="overflow-hidden">
            <SkeletonTable rows={10} columns={3} />
          </Card>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No standings yet"
            description="No points have been recorded. Complete a challenge to appear here."
          />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <Table size="sm">
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead className="w-24">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead align="right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e, idx) => {
                  const isMe = currentUser && e.userId === currentUser.id;
                  return (
                    <TableRow
                      key={e.userId || idx}
                      className={isMe ? "bg-accent/5" : undefined}
                    >
                      <TableCell className="whitespace-nowrap">{renderRank(e.rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={isMe ? "font-medium text-accent" : "text-fg"}>
                            {e.username || "Anonymous"}
                          </span>
                          {isMe && (
                            <Badge variant="accent" size="sm">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell align="right" className="font-medium">
                        +{Number(e.points || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {lastUpdated && (
              <p className="border-t border-border-subtle px-4 py-2.5 text-right text-xs text-fg-subtle">
                Updated {lastUpdated.toLocaleTimeString()} · refreshes every 30 s
              </p>
            )}
          </Card>
        )}
      </FadeIn>
    </StaggerContainer>
  );
};

export default Leaderboard;
