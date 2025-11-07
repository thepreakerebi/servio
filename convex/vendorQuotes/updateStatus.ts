import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

/**
 * Update vendor quote status
 */
export const updateStatus = internalMutation({
  args: {
    quoteId: v.id('vendorQuotes'),
    status: v.union(
      v.literal('pending'),
      v.literal('received'),
      v.literal('selected'),
      v.literal('rejected'),
      v.literal('expired'),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.quoteId, {
      status: args.status,
    })
  },
})

