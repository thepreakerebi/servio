import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Get a vendor quote by ID (internal)
 */
export const getByIdInternal = internalQuery({
  args: {
    quoteId: v.id('vendorQuotes'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.quoteId)
  },
})

