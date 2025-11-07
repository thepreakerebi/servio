import { v } from 'convex/values'
import { query } from '../_generated/server'

/**
 * Get all vendor outreach records for a ticket
 */
export const getByTicketId = query({
  args: {
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    const outreachRecords = await ctx.db
      .query('vendorOutreach')
      .withIndex('by_ticketId', (q) => q.eq('ticketId', args.ticketId))
      .collect()

    return outreachRecords
  },
})

