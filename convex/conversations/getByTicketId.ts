import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getByTicketId = query({
  args: { ticketId: v.id('tickets') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access this conversation')
    }

    const conversation = await ctx.db
      .query('conversations')
      .withIndex('by_ticketId', (q) => q.eq('ticketId', args.ticketId))
      .first()

    return conversation
  },
})

