import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

/**
 * Get conversation by ticket ID
 * Returns the conversation associated with a ticket
 */
export const getByTicketId = query({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)

    // Verify user owns the ticket
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access conversation for this ticket')
    }

    // Get conversation by ticket ID
    const conversation = await ctx.db
      .query('conversations')
      .withIndex('by_ticketId', (q) => q.eq('ticketId', args.ticketId))
      .first()

    return conversation
  },
})

