import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

export const updateTicketEmbedding = internalMutation({
  args: {
    ticketId: v.id('tickets'),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ticketId, {
      embedding: args.embedding,
    })
  },
})

