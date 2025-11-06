import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const store = mutation({
  args: {
    ticketId: v.id('tickets'),
    results: v.array(
      v.object({
        businessName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        specialty: v.string(),
        address: v.string(),
        rating: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const resultId = await ctx.db.insert('firecrawlResults', {
      ticketId: args.ticketId,
      results: args.results,
      createdAt: Date.now(),
    })

    return resultId
  },
})

