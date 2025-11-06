import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const updateRating = mutation({
  args: {
    vendorId: v.id('vendors'),
    rating: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vendorId, {
      rating: args.rating,
    })
  },
})

