import mongoose from 'mongoose'

const moduleSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      minlength: [3, 'Module title must be at least 3 characters'],
      maxlength: [120, 'Module title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    pointsReward: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'modules',
  },
)

moduleSchema.index({ courseId: 1, order: 1 })

const Module = mongoose.model('Module', moduleSchema)

export default Module
