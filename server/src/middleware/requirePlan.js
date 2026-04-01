import { ApiError } from './error.middleware.js'
import { PLANS } from '../models/Subscription.js'

/**
 * requirePlan('PRO') — middleware factory
 * Allows PREMIUM to access PRO-gated content (PREMIUM ⊃ PRO).
 *
 * Usage:
 *   router.get('/premium-lab', verifyToken, requirePlan('PRO'), handler)
 */
export const requirePlan = (...requiredPlans) => {
    // Build the set of plans that satisfy the requirement.
    // PREMIUM always satisfies any lower tier requirement.
    const allowed = new Set(requiredPlans)
    if (requiredPlans.includes(PLANS.PRO)) allowed.add(PLANS.PREMIUM)

    return (req, _res, next) => {
        if (!req.user) {
            return next(new ApiError('Authentication required.', 401))
        }

        const userPlan = req.user.plan || PLANS.FREE

        if (!allowed.has(userPlan)) {
            return next(
                new ApiError(
                    `This content requires a ${requiredPlans.join(' or ')} subscription. Please upgrade your plan.`,
                    403,
                ),
            )
        }

        next()
    }
}

export default { requirePlan }
