import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

/**
 * Get user by ID
 * Requires authentication - users can only view their own profile
 */
export const getById = query({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)
    
    // Users can only view their own profile
    if (args.userId !== user._id) {
      throw new Error('Not authorized to access this user profile')
    }
    
    return await ctx.db.get(args.userId)
  },
})

