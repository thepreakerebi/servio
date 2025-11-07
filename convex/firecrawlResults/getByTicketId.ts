import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getByTicketId = query({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)

    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access firecrawl results for this ticket')
    }

    if (!ticket.firecrawlResultsId) {
      return null
    }

    return await ctx.db.get(ticket.firecrawlResultsId)
  },
})

