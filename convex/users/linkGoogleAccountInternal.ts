import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'
import type { MutationCtx } from '../_generated/server'

/**
 * Internal mutation to link Google account to existing user
 * Used by HTTP actions for OAuth callbacks
 */
export const linkGoogleAccountInternal = internalMutation({
  args: {
    userId: v.id('users'),
    googleId: v.string(),
    name: v.optional(v.string()),
    profilePic: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Check if googleId is already linked to another user
    const existing = await ctx.db
      .query('users')
      .withIndex('by_googleId', (q) => q.eq('googleId', args.googleId))
      .first()

    if (existing && existing._id !== args.userId) {
      throw new Error('Google account already linked to another user')
    }

    // Update user with Google account info
    await ctx.db.patch(args.userId, {
      googleId: args.googleId,
      name: args.name ?? user.name,
      profilePic: args.profilePic ?? user.profilePic,
    })

    return args.userId
  },
})

