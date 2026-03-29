import User from '../models/User.js'
import { asyncHandler, ApiError } from '../middleware/error.middleware.js'
import UserTaskProgress from '../models/UserTaskProgress.js'

/**
 * @desc    Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    role,
    search,
    sortBy = 'createdAt',
    order = 'desc',
  } = req.query

  // Build query
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

  // Pagination
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

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  })
})

/**
 * @desc    Get user by ID (Admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password')

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  res.status(200).json({
    success: true,
    data: { user },
  })
})

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, preferences } = req.body

  // Check if username is taken (if being changed)
  if (username && username !== req.user.username) {
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      throw new ApiError('Username is already taken', 400)
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      firstName,
      lastName,
      username,
      preferences,
    },
    { new: true, runValidators: true },
  ).select('-password')

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { user },
  })
})

/**
 * @desc    Update user role (Admin only)
 * @route   PUT /api/users/:id/role
 * @access  Private/Admin
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body

  if (!role) {
    throw new ApiError('Role is required', 400)
  }

  const user = await User.findById(req.params.id)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  // Prevent admin from changing their own role
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError('You cannot change your own role', 400)
  }

  user.role = role
  await user.save()

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    data: { user },
  })
})

/**
 * @desc    Deactivate user (Admin only)
 * @route   PUT /api/users/:id/deactivate
 * @access  Private/Admin
 */
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  // Prevent admin from deactivating themselves
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError('You cannot deactivate your own account', 400)
  }

  user.isActive = false
  await user.save()

  res.status(200).json({
    success: true,
    message: 'User deactivated successfully',
  })
})

/**
 * @desc    Reactivate user (Admin only)
 * @route   PUT /api/users/:id/reactivate
 * @access  Private/Admin
 */
export const reactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    throw new ApiError('User not found', 404)
  }

  user.isActive = true
  await user.save()

  res.status(200).json({
    success: true,
    message: 'User reactivated successfully',
  })
})

/**
 * @desc    Get user statistics (Admin/Instructor)
 * @route   GET /api/users/stats
 * @access  Private/Admin/Instructor
 */
export const getUserStats = asyncHandler(async (req, res) => {
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

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      byRole: stats,
    },
  })
})

/**
 * @desc    Get current user's task progress summary
 * @route   GET /api/users/me/progress
 * @access  Private
 */
export const getMyProgress = asyncHandler(async (req, res) => {
  const progress = await UserTaskProgress.find({ userId: req.user._id }).sort({
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

  res.status(200).json({
    success: true,
    data: {
      progress,
      summary: {
        totalPoints,
        tasksCompleted,
        totalAttempts: progress.length,
      },
    },
  })
})

export default {
  getAllUsers,
  getUserById,
  updateProfile,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  getUserStats,
  getMyProgress,
}
