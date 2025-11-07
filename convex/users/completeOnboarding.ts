import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'
import type { MutationCtx } from '../_generated/server'

/**
 * Complete onboarding - update orgName and location
 * Called after user completes onboarding form
 * Sets onboardingCompleted to true
 */
export const completeOnboarding = mutation({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    orgName: v.string(),
    location: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)

    // Update user with onboarding information
    await ctx.db.patch(user._id, {
      orgName: args.orgName,
      location: args.location,
      onboardingCompleted: true,
    })

    return user._id
  },
})

