import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Get vendor by email (internal)
 */
export const getByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('vendors')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()
  },
})

