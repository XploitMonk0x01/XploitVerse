import LabSession, { LAB_STATUS, LAB_TYPES } from "../models/LabSession.js";
import User from "../models/User.js";
import { asyncHandler, ApiError } from "../middleware/error.middleware.js";

/**
 * @desc    Create a new lab session (Request a lab)
 * @route   POST /api/lab-sessions
 * @access  Private
 */
export const createLabSession = asyncHandler(async (req, res) => {
  const { labType, labName, description, difficulty, maxDuration } = req.body;

  // Check if user already has an active session
  const activeSession = await LabSession.findOne({
    user: req.user._id,
    status: {
      $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING],
    },
  });

  if (activeSession) {
    throw new ApiError(
      "You already have an active lab session. Please terminate it before starting a new one.",
      400
    );
  }

  const session = await LabSession.create({
    user: req.user._id,
    labType: labType || LAB_TYPES.WEB_EXPLOITATION,
    labName: labName || "Untitled Lab",
    description,
    difficulty,
    maxDuration,
    status: LAB_STATUS.PENDING,
  });

  // Log the creation
  await session.logActivity("session_created", {
    requestedBy: req.user.username,
    labType: session.labType,
  });

  res.status(201).json({
    success: true,
    message: "Lab session requested. Waiting for initialization...",
    data: { session },
  });
});

/**
 * @desc    Get all lab sessions (filtered by role)
 * @route   GET /api/lab-sessions
 * @access  Private
 */
export const getLabSessions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    labType,
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  // Build query based on user role
  const query = {};

  // Students can only see their own sessions
  if (req.user.role === "STUDENT") {
    query.user = req.user._id;
  }

  // Optional filters
  if (status) {
    query.status = status;
  }

  if (labType) {
    query.labType = labType;
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOrder = order === "asc" ? 1 : -1;

  const [sessions, total] = await Promise.all([
    LabSession.find(query)
      .populate("user", "username email role")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit)),
    LabSession.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get single lab session by ID
 * @route   GET /api/lab-sessions/:id
 * @access  Private
 */
export const getLabSessionById = asyncHandler(async (req, res) => {
  const session = await LabSession.findById(req.params.id).populate(
    "user",
    "username email role"
  );

  if (!session) {
    throw new ApiError("Lab session not found", 404);
  }

  // Students can only view their own sessions
  if (
    req.user.role === "STUDENT" &&
    session.user._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError("You are not authorized to view this session", 403);
  }

  res.status(200).json({
    success: true,
    data: { session },
  });
});

/**
 * @desc    Get current user's active session
 * @route   GET /api/lab-sessions/active
 * @access  Private
 */
export const getActiveSession = asyncHandler(async (req, res) => {
  const session = await LabSession.findOne({
    user: req.user._id,
    status: {
      $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING],
    },
  });

  res.status(200).json({
    success: true,
    data: { session },
  });
});

/**
 * @desc    Update lab session status (Admin/Instructor or system)
 * @route   PATCH /api/lab-sessions/:id/status
 * @access  Private/Admin/Instructor
 */
export const updateSessionStatus = asyncHandler(async (req, res) => {
  const { status, awsInstanceId, publicIp, privateIp, errorMessage } = req.body;

  const session = await LabSession.findById(req.params.id);

  if (!session) {
    throw new ApiError("Lab session not found", 404);
  }

  // Validate status transition
  const validTransitions = {
    [LAB_STATUS.PENDING]: [LAB_STATUS.INITIALIZING, LAB_STATUS.ERROR],
    [LAB_STATUS.INITIALIZING]: [LAB_STATUS.RUNNING, LAB_STATUS.ERROR],
    [LAB_STATUS.RUNNING]: [
      LAB_STATUS.STOPPING,
      LAB_STATUS.TERMINATED,
      LAB_STATUS.ERROR,
    ],
    [LAB_STATUS.STOPPING]: [LAB_STATUS.STOPPED, LAB_STATUS.ERROR],
    [LAB_STATUS.STOPPED]: [LAB_STATUS.RUNNING, LAB_STATUS.TERMINATED],
  };

  if (
    validTransitions[session.status] &&
    !validTransitions[session.status].includes(status)
  ) {
    throw new ApiError(
      `Invalid status transition from ${session.status} to ${status}`,
      400
    );
  }

  // Update fields
  session.status = status;

  if (awsInstanceId) session.awsInstanceId = awsInstanceId;
  if (publicIp) session.publicIp = publicIp;
  if (privateIp) session.privateIp = privateIp;
  if (errorMessage) session.errorMessage = errorMessage;

  await session.save();

  // Update user's total lab time and spent if session is terminated
  if (status === LAB_STATUS.TERMINATED && session.finalCost) {
    await User.findByIdAndUpdate(session.user, {
      $inc: {
        totalLabTime: session.totalBillableMinutes,
        totalSpent: session.finalCost,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: `Session status updated to ${status}`,
    data: { session },
  });
});

/**
 * @desc    Terminate lab session (user can terminate their own)
 * @route   POST /api/lab-sessions/:id/terminate
 * @access  Private
 */
export const terminateSession = asyncHandler(async (req, res) => {
  const session = await LabSession.findById(req.params.id);

  if (!session) {
    throw new ApiError("Lab session not found", 404);
  }

  // Check authorization
  if (
    req.user.role === "STUDENT" &&
    session.user.toString() !== req.user._id.toString()
  ) {
    throw new ApiError("You are not authorized to terminate this session", 403);
  }

  // Check if session can be terminated
  if ([LAB_STATUS.TERMINATED, LAB_STATUS.STOPPED].includes(session.status)) {
    throw new ApiError("Session is already terminated or stopped", 400);
  }

  // Update status (in Phase 2, this will also trigger AWS EC2 termination)
  session.status = LAB_STATUS.TERMINATED;
  await session.save();

  // Update user stats
  if (session.finalCost) {
    await User.findByIdAndUpdate(session.user, {
      $inc: {
        totalLabTime: session.totalBillableMinutes,
        totalSpent: session.finalCost,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: "Lab session terminated successfully",
    data: {
      session,
      billing: {
        duration: session.durationFormatted,
        totalMinutes: session.totalBillableMinutes,
        cost: session.finalCost,
      },
    },
  });
});

/**
 * @desc    Get lab session statistics (Admin/Instructor)
 * @route   GET /api/lab-sessions/stats
 * @access  Private/Admin/Instructor
 */
export const getSessionStats = asyncHandler(async (req, res) => {
  const stats = await LabSession.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalMinutes: { $sum: "$totalBillableMinutes" },
        totalCost: { $sum: "$finalCost" },
      },
    },
  ]);

  const typeStats = await LabSession.aggregate([
    {
      $group: {
        _id: "$labType",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalSessions = await LabSession.countDocuments();
  const activeSessions = await LabSession.countDocuments({
    status: {
      $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING],
    },
  });

  res.status(200).json({
    success: true,
    data: {
      totalSessions,
      activeSessions,
      byStatus: stats,
      byType: typeStats,
    },
  });
});

/**
 * @desc    Add user notes to session
 * @route   PATCH /api/lab-sessions/:id/notes
 * @access  Private
 */
export const updateSessionNotes = asyncHandler(async (req, res) => {
  const { notes } = req.body;

  const session = await LabSession.findById(req.params.id);

  if (!session) {
    throw new ApiError("Lab session not found", 404);
  }

  // Check authorization
  if (session.user.toString() !== req.user._id.toString()) {
    throw new ApiError("You are not authorized to update this session", 403);
  }

  session.userNotes = notes;
  await session.save();

  res.status(200).json({
    success: true,
    message: "Notes updated successfully",
    data: { session },
  });
});

export default {
  createLabSession,
  getLabSessions,
  getLabSessionById,
  getActiveSession,
  updateSessionStatus,
  terminateSession,
  getSessionStats,
  updateSessionNotes,
};
