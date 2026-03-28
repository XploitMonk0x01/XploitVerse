import mongoose from 'mongoose'

const userTaskProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'user_task_progress',
  },
)

userTaskProgressSchema.index({ userId: 1, taskId: 1 }, { unique: true })
userTaskProgressSchema.index({ completedAt: -1 })

const UserTaskProgress = mongoose.model(
  'UserTaskProgress',
  userTaskProgressSchema,
)

export default UserTaskProgress
