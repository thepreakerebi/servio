import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Get vendor outreach record by ID (internal)
 */
export const getByIdInternal = internalQuery({
  args: {
    outreachId: v.id('vendorOutreach'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.outreachId)
  },
})

