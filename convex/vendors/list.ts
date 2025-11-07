import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const list = query({
  args: {
    token: v.string(), // JWT token - verified server-side for security
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    await requireAuth(ctx, args.token)
    return await ctx.db.query('vendors').collect()
  },
})

