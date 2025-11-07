import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

export const updateVendorQuoteEmbedding = internalMutation({
  args: {
    quoteId: v.id('vendorQuotes'),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.quoteId, {
      embedding: args.embedding,
    })
  },
})

