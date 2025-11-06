import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const create = mutation({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    const conversationId = await ctx.db.insert('conversations', {
      ticketId: args.ticketId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Update ticket with conversation ID
    await ctx.db.patch(args.ticketId, {
      conversationId,
    })

    return conversationId
  },
})

