import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

/**
 * User Roles for XploitVerse Platform
 *
 * STUDENT (Red Team): Can launch labs, practice attacks, view own sessions
 * INSTRUCTOR (Blue Team): Can monitor students, view analytics, manage content
 * ADMIN (Purple Team): Full system access, AWS management, cost oversight
 */
export const USER_ROLES = {
  STUDENT: 'STUDENT',
  INSTRUCTOR: 'INSTRUCTOR',
  ADMIN: 'ADMIN',
}

// Alternative color-coded roles for cybersecurity context
export const TEAM_ROLES = {
  RED: 'STUDENT', // Offensive security
  BLUE: 'INSTRUCTOR', // Defensive security
  PURPLE: 'ADMIN', // Full spectrum
}

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.STUDENT,
    },
    // Profile fields
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    avatar: {
      type: String,
      default: null,
    },
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Subscription plan (denormalized from Subscription for fast middleware checks)
    plan: {
      type: String,
      enum: ['FREE', 'PRO', 'PREMIUM'],
      default: 'FREE',
    },
    // Security fields
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailVerificationOtpHash: {
      type: String,
      select: false,
    },
    emailVerificationOtpExpires: {
      type: Date,
      select: false,
    },
    emailVerificationOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    emailVerificationOtpLastSentAt: {
      type: Date,
      select: false,
    },
    // Usage tracking (for billing/analytics - Phase 2+)
    totalLabTime: {
      type: Number,
      default: 0, // Total minutes spent in labs
    },
    totalSpent: {
      type: Number,
      default: 0, // Total USD spent on labs
    },
    // Preferences
    preferences: {
      theme: {
        type: String,
        enum: ['dark', 'light', 'system'],
        default: 'dark',
      },
      notifications: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for performance
userSchema.index({ email: 1 })
// Note: username index created automatically by unique: true
userSchema.index({ role: 1 })
userSchema.index({ createdAt: -1 })

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`
  }
  return this.username
})

// Virtual to get active lab sessions (will be populated in Phase 2)
userSchema.virtual('activeSessions', {
  ref: 'LabSession',
  localField: '_id',
  foreignField: 'user',
  match: { status: { $in: ['initializing', 'running'] } },
})

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next()

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)

    // Update passwordChangedAt for existing documents
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000 // Subtract 1s to ensure JWT is issued after
    }

    next()
  } catch (error) {
    next(error)
  }
})

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Instance method to check if password changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    )
    return jwtTimestamp < changedTimestamp
  }
  return false
}

// Static method to find by credentials
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select('+password')

  if (!user) {
    throw new Error('Invalid email or password')
  }

  const isPasswordMatch = await user.comparePassword(password)

  if (!isPasswordMatch) {
    throw new Error('Invalid email or password')
  }

  return user
}

const User = mongoose.model('User', userSchema)

export default User
