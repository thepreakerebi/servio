import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

export const updateVendorOutreachEmbedding = internalMutation({
  args: {
    outreachId: v.id('vendorOutreach'),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.outreachId, {
      embedding: args.embedding,
    })
  },
})

