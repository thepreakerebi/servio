import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

/**
 * Get the current authenticated user 
 * Token is verified server-side for security
 */
export const getCurrent = query({
  args: {
    token: v.string(), // JWT token - verified server-side
  },
  handler: async (ctx, args) => {
    // Verify token and return authenticated user
    return await requireAuth(ctx, args.token)
  },
})

