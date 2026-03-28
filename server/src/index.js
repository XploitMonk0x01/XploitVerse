import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import config from "./config/index.js";
import connectDB from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import labSessionRoutes from "./routes/labSession.routes.js";
import labRoutes from "./routes/lab.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { initializeSocketHandlers } from "./socket/socketHandler.js";

// Initialize Express app
const app = express();

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: config.clientUrl,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Initialize Socket handlers
initializeSocketHandlers(io);

// Connect to MongoDB
connectDB();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 1000 : 100, // More lenient in dev
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api", limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 100 : 10, // More lenient in dev
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});
app.use("/api/auth", authLimiter);

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Logging
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "XploitVerse API is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/lab-sessions", labSessionRoutes);
app.use("/api/labs", labRoutes);
app.use("/api/chat", chatRoutes);

// API Documentation endpoint (placeholder for Phase 2)
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to XploitVerse API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      labs: "/api/labs",
      labSessions: "/api/lab-sessions",
    },
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;
httpServer.listen(PORT, () => {
  console.log(`
🛡️  XploitVerse API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server running on port ${PORT}
🌍 Environment: ${config.nodeEnv}
📡 API URL: http://localhost:${PORT}/api
🔌 WebSocket: ws://localhost:${PORT}
🏥 Health Check: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export { io };
export default app;
