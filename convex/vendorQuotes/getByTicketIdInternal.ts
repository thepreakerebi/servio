import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Get all vendor quotes for a ticket (internal)
 */
export const getByTicketIdInternal = internalQuery({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    const quotes = await ctx.db
      .query('vendorQuotes')
      .withIndex('by_ticketId', (q) => q.eq('ticketId', args.ticketId))
      .collect()

    return quotes
  },
})

