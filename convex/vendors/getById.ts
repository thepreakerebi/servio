import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getById = query({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    await requireAuth(ctx, args.token)
    return await ctx.db.get(args.vendorId)
  },
})

