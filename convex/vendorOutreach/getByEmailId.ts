import { v } from 'convex/values'
import { query } from '../_generated/server'

/**
 * Get vendor outreach record by email ID
 */
export const getByEmailId = query({
  args: {
    emailId: v.string(),
  },
  handler: async (ctx, args) => {
    const outreach = await ctx.db
      .query('vendorOutreach')
      .withIndex('by_emailId', (q) => q.eq('emailId', args.emailId))
      .first()

    return outreach
  },
})

