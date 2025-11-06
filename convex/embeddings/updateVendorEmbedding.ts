import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

export const updateVendorEmbedding = internalMutation({
  args: {
    vendorId: v.id('vendors'),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vendorId, {
      embedding: args.embedding,
    })
  },
})

