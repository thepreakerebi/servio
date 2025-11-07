import { v } from 'convex/values'
import { query } from '../_generated/server'

/**
 * Get a vendor quote by ID
 */
export const getById = query({
  args: {
    quoteId: v.id('vendorQuotes'),
  },
  handler: async (ctx, args) => {
    const quote = await ctx.db.get(args.quoteId)
    if (!quote) {
      return null
    }

    const vendor = await ctx.db.get(quote.vendorId)
    return {
      ...quote,
      vendor,
    }
  },
})

