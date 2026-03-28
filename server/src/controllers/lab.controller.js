import Lab from "../models/Lab.js";
import LabSession, { LAB_STATUS } from "../models/LabSession.js";
import { asyncHandler, ApiError } from "../middleware/error.middleware.js";

/**
 * Generate a fake IP address for mock cloud simulation
 */
const generateFakeIP = () => {
  const octet = Math.floor(Math.random() * 254) + 1;
  return `10.0.0.${octet}`;
};

/**
 * Simulate cloud provisioning delay (3 seconds)
 */
const simulateCloudDelay = () => {
  return new Promise((resolve) => setTimeout(resolve, 3000));
};

/**
 * @desc    Get all available labs
 * @route   GET /api/labs
 * @access  Private
 */
export const getAllLabs = asyncHandler(async (req, res) => {
  const { category, difficulty, search, page = 1, limit = 10 } = req.query;

  // Build query
  const query = { isActive: true, isPublished: true };

  if (category) {
    query.category = category;
  }

  if (difficulty) {
    query.difficulty = difficulty;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [labs, total] = await Promise.all([
    Lab.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Lab.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      labs,
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
 * @desc    Get single lab by ID
 * @route   GET /api/labs/:id
 * @access  Private
 */
export const getLabById = asyncHandler(async (req, res) => {
  const lab = await Lab.findById(req.params.id);

  if (!lab) {
    throw new ApiError("Lab not found", 404);
  }

  res.status(200).json({
    success: true,
    data: { lab },
  });
});

/**
 * @desc    Start a lab session (Mock Cloud Provisioning)
 * @route   POST /api/labs/start
 * @access  Private
 *
 * This endpoint simulates AWS EC2 instance provisioning:
 * 1. Validates the lab exists
 * 2. Checks for existing active sessions
 * 3. Simulates a 3-second boot-up delay
 * 4. Creates a LabSession with mock instance details
 */
export const startLab = asyncHandler(async (req, res) => {
  const { labId } = req.body;

  if (!labId) {
    throw new ApiError("Lab ID is required", 400);
  }

  // Find the lab
  const lab = await Lab.findById(labId);

  if (!lab) {
    throw new ApiError("Lab not found", 404);
  }

  if (!lab.isActive || !lab.isPublished) {
    throw new ApiError("This lab is not currently available", 400);
  }

  // Check if user already has an active session
  const existingSession = await LabSession.findOne({
    user: req.user._id,
    status: {
      $in: [LAB_STATUS.PENDING, LAB_STATUS.INITIALIZING, LAB_STATUS.RUNNING],
    },
  });

  if (existingSession) {
    throw new ApiError(
      "You already have an active lab session. Please stop it before starting a new one.",
      400
    );
  }

  // Create session with INITIALIZING status
  const session = await LabSession.create({
    user: req.user._id,
    labType: lab.category.toLowerCase().replace(" ", "_"),
    labName: lab.title,
    description: lab.description,
    difficulty: lab.difficulty.toLowerCase(),
    status: LAB_STATUS.INITIALIZING,
    lab: labId, // Reference to the Lab
    metadata: {
      labId: lab._id,
      category: lab.category,
      estimatedDuration: lab.estimatedDuration,
    },
  });

  // Send immediate response that provisioning has started
  res.status(202).json({
    success: true,
    message: "Provisioning cloud environment...",
    data: {
      session: {
        id: session._id,
        status: session.status,
        labName: session.labName,
      },
    },
  });
});

/**
 * @desc    Check provisioning status and complete if ready
 * @route   GET /api/labs/session/:sessionId/status
 * @access  Private
 *
 * This simulates checking if the "cloud instance" is ready
 */
export const checkSessionStatus = asyncHandler(async (req, res) => {
  const session = await LabSession.findById(req.params.sessionId);

  if (!session) {
    throw new ApiError("Session not found", 404);
  }

  // Check authorization
  if (session.user.toString() !== req.user._id.toString()) {
    throw new ApiError("Not authorized to access this session", 403);
  }

  res.status(200).json({
    success: true,
    data: { session },
  });
});

/**
 * @desc    Complete lab provisioning (called after delay)
 * @route   POST /api/labs/session/:sessionId/provision
 * @access  Private
 *
 * This endpoint is called after the simulated delay to mark the session as running
 */
export const completeProvisioning = asyncHandler(async (req, res) => {
  const session = await LabSession.findById(req.params.sessionId);

  if (!session) {
    throw new ApiError("Session not found", 404);
  }

  // Check authorization
  if (session.user.toString() !== req.user._id.toString()) {
    throw new ApiError("Not authorized to access this session", 403);
  }

  if (session.status !== LAB_STATUS.INITIALIZING) {
    throw new ApiError("Session is not in initializing state", 400);
  }

  // Simulate the cloud boot delay
  await simulateCloudDelay();

  // Generate mock instance details
  const fakeIP = generateFakeIP();
  const mockInstanceId = `i-${Math.random().toString(36).substring(2, 10)}`;

  // Update session to running
  session.status = LAB_STATUS.RUNNING;
  session.startTime = new Date();
  session.publicIp = fakeIP;
  session.privateIp = `172.16.0.${Math.floor(Math.random() * 254) + 1}`;
  session.awsInstanceId = mockInstanceId;
  session.awsInstanceType = "t2.micro";

  // Set auto-terminate time (default 4 hours)
  session.autoTerminateAt = new Date(
    Date.now() + session.maxDuration * 60 * 1000
  );

  await session.save();

  // Log the activity
  await session.logActivity("lab_started", {
    ip: fakeIP,
    instanceId: mockInstanceId,
    mock: true,
  });

  res.status(200).json({
    success: true,
    message: "Cloud environment is now active!",
    data: {
      session: {
        id: session._id,
        status: session.status,
        labName: session.labName,
        publicIp: session.publicIp,
        startTime: session.startTime,
        autoTerminateAt: session.autoTerminateAt,
        instanceId: session.awsInstanceId,
      },
    },
  });
});

/**
 * @desc    Stop a lab session
 * @route   POST /api/labs/stop
 * @access  Private
 */
export const stopLab = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    throw new ApiError("Session ID is required", 400);
  }

  const session = await LabSession.findById(sessionId);

  if (!session) {
    throw new ApiError("Session not found", 404);
  }

  // Check authorization
  if (session.user.toString() !== req.user._id.toString()) {
    throw new ApiError("Not authorized to stop this session", 403);
  }

  // Check if session can be stopped
  if (!["pending", "initializing", "running"].includes(session.status)) {
    throw new ApiError(
      `Cannot stop session with status: ${session.status}`,
      400
    );
  }

  // Update session status
  session.status = LAB_STATUS.STOPPED;
  session.endTime = new Date();

  // Calculate duration and cost
  if (session.startTime) {
    const durationMs = session.endTime - session.startTime;
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));
    session.totalBillableMinutes = durationMinutes;
    session.finalCost = parseFloat(
      ((durationMinutes / 60) * session.hourlyRate).toFixed(2)
    );
  }

  await session.save();

  // Log the activity
  await session.logActivity("lab_stopped", {
    duration: session.totalBillableMinutes,
    cost: session.finalCost,
    mock: true,
  });

  res.status(200).json({
    success: true,
    message: "Lab session stopped successfully",
    data: {
      session: {
        id: session._id,
        status: session.status,
        labName: session.labName,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.durationFormatted,
        totalMinutes: session.totalBillableMinutes,
        cost: session.finalCost,
      },
    },
  });
});

/**
 * @desc    Get user's active session
 * @route   GET /api/labs/active-session
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
 * @desc    Get user's session history
 * @route   GET /api/labs/history
 * @access  Private
 */
export const getSessionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    LabSession.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    LabSession.countDocuments({ user: req.user._id }),
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

export default {
  getAllLabs,
  getLabById,
  startLab,
  stopLab,
  checkSessionStatus,
  completeProvisioning,
  getActiveSession,
  getSessionHistory,
};
