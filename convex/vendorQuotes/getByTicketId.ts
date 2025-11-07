import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

/**
 * Get all vendor quotes for a ticket
 */
export const getByTicketId = query({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Verify user owns the ticket
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access quotes for this ticket')
    }

    const quotes = await ctx.db
      .query('vendorQuotes')
      .withIndex('by_ticketId', (q) => q.eq('ticketId', args.ticketId))
      .collect()

    // Fetch vendor details for each quote
    const quotesWithVendors = await Promise.all(
      quotes.map(async (quote) => {
        const vendor = await ctx.db.get(quote.vendorId)
        return {
          ...quote,
          vendor,
        }
      }),
    )

    // Filter out quotes with deleted vendors
    return quotesWithVendors.filter((q) => q.vendor !== null)
  },
})

