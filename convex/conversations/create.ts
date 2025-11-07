import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const create = mutation({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to create conversation for this ticket')
    }

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
