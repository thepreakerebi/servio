import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'

/**
 * Internal mutation to create a new user account
 * Used by HTTP actions for OAuth callbacks
 */
export const createAccountInternal = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    googleId: v.optional(v.string()),
    profilePic: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()

    if (existing) {
      throw new Error('User with this email already exists')
    }

    // Create new user
    const userId = await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      googleId: args.googleId,
      profilePic: args.profilePic,
      createdAt: Date.now(),
      onboardingCompleted: false,
    })

    return userId
  },
})

