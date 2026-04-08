import User from '../models/User.js'
import UserTaskProgress from '../models/UserTaskProgress.js'
import { ApiError } from '../middleware/error.middleware.js'

export const getAllUsersData = async ({
  page = 1,
  limit = 10,
  role,
  search,
  sortBy = 'createdAt',
  order = 'desc',
}) => {
  const query = {}

  if (role) {
    query.role = role
  }

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ]
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const sortOrder = order === 'asc' ? 1 : -1

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password'),
    User.countDocuments(query),
  ])

  return {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  }
}

export const getUserByIdData = async (id) => {
  const user = await User.findById(id).select('-password')

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  return user
}

export const updateProfileForUser = async ({
  userId,
  currentUsername,
  firstName,
  lastName,
  username,
  preferences,
}) => {
  if (username && username !== currentUsername) {
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      throw new ApiError('Username is already taken', 400)
    }
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      firstName,
      lastName,
      username,
      preferences,
    },
    { new: true, runValidators: true },
  ).select('-password')

  return user
}

export const updateUserRoleById = async ({ role, targetUserId, actorUserId }) => {
  if (!role) {
    throw new ApiError('Role is required', 400)
  }

  const user = await User.findById(targetUserId)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (user._id.toString() === actorUserId.toString()) {
    throw new ApiError('You cannot change your own role', 400)
  }

  user.role = role
  await user.save()

  return user
}

export const setUserActiveState = async ({
  targetUserId,
  actorUserId,
  isActive,
}) => {
  const user = await User.findById(targetUserId)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (actorUserId && user._id.toString() === actorUserId.toString()) {
    throw new ApiError('You cannot deactivate your own account', 400)
  }

  user.isActive = isActive
  await user.save()

  return user
}

export const getUserStatsData = async () => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        totalLabTime: { $sum: '$totalLabTime' },
        totalSpent: { $sum: '$totalSpent' },
      },
    },
  ])

  const totalUsers = await User.countDocuments()
  const activeUsers = await User.countDocuments({ isActive: true })

  return {
    totalUsers,
    activeUsers,
    byRole: stats,
  }
}

export const getUserProgressSummary = async (userId) => {
  const progress = await UserTaskProgress.find({ userId }).sort({
    completedAt: -1,
  })

  let totalPoints = 0
  let tasksCompleted = 0

  for (const row of progress) {
    totalPoints += row.pointsEarned || 0
    if (row.completedAt) {
      tasksCompleted += 1
    }
  }

  return {
    progress,
    summary: {
      totalPoints,
      tasksCompleted,
      totalAttempts: progress.length,
    },
  }
}

export default {
  getAllUsersData,
  getUserByIdData,
  updateProfileForUser,
  updateUserRoleById,
  setUserActiveState,
  getUserStatsData,
  getUserProgressSummary,
}
