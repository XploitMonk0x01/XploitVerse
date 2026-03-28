import mongoose from 'mongoose'

export const TASK_TYPES = {
  QUESTION: 'question',
  FLAG: 'flag',
  INTERACTIVE: 'interactive',
}

const taskSchema = new mongoose.Schema(
  {
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Task title must be at least 3 characters'],
      maxlength: [160, 'Task title cannot exceed 160 characters'],
    },
    type: {
      type: String,
      enum: Object.values(TASK_TYPES),
      required: [true, 'Task type is required'],
    },
    order: {
      type: Number,
      default: 0,
    },
    prompt: {
      type: String,
      default: '',
    },
    contentMd: {
      type: String,
      default: '',
    },
    hints: [
      {
        type: String,
      },
    ],
    points: {
      type: Number,
      default: 0,
    },
    hintPenalty: {
      type: Number,
      default: 0,
    },
    flagHash: {
      type: String,
      default: '',
      select: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'tasks',
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.flagHash
        return ret
      },
    },
  },
)

taskSchema.index({ moduleId: 1, order: 1 })

const Task = mongoose.model('Task', taskSchema)

export default Task
