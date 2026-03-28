import UserTaskProgress from "../models/UserTaskProgress.js";
import { asyncHandler } from "../middleware/error.middleware.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = [];
let cachedAt = null;

const refreshCache = async () => {
  const rows = await UserTaskProgress.aggregate([
    {
      $match: {
        completedAt: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$userId",
        totalPoints: { $sum: "$pointsEarned" },
        tasksCompleted: { $sum: 1 },
      },
    },
    {
      $sort: {
        totalPoints: -1,
        tasksCompleted: -1,
      },
    },
    { $limit: 100 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        userId: "$_id",
        username: "$user.username",
        totalPoints: 1,
        tasksCompleted: 1,
      },
    },
  ]);

  cache = rows.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    username: entry.username || "unknown",
    totalPoints: entry.totalPoints,
    tasksCompleted: entry.tasksCompleted,
  }));

  cachedAt = new Date();
};

const ensureCache = async () => {
  if (!cachedAt || Date.now() - cachedAt.getTime() > CACHE_TTL_MS) {
    await refreshCache();
  }
};

export const getLeaderboard = asyncHandler(async (_req, res) => {
  await ensureCache();

  res.status(200).json({
    success: true,
    data: {
      leaderboard: cache,
      cachedAt,
    },
  });
});

export const getMyRank = asyncHandler(async (req, res) => {
  await ensureCache();

  const userId = req.user._id.toString();
  const entry = cache.find((row) => row.userId.toString() === userId);

  if (entry) {
    return res.status(200).json({
      success: true,
      data: {
        entry,
        total: cache.length,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      entry: {
        rank: -1,
        userId: req.user._id,
        username: req.user.username,
        totalPoints: 0,
        tasksCompleted: 0,
      },
      total: cache.length,
    },
  });
});

export default {
  getLeaderboard,
  getMyRank,
};
