import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Get vendor outreach record by email ID (internal)
 */
export const getByEmailIdInternal = internalQuery({
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

