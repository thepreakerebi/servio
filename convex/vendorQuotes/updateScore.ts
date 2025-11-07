import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

/**
 * Update vendor quote score (for ranking)
 */
export const updateScore = internalMutation({
  args: {
    quoteId: v.id('vendorQuotes'),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.quoteId, {
      score: args.score,
    })
  },
})

