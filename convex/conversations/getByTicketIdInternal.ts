import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Get conversation by ticket ID (internal)
 */
export const getByTicketIdInternal = internalQuery({
  args: { ticketId: v.id('tickets') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('conversations')
      .withIndex('by_ticketId', (q) => q.eq('ticketId', args.ticketId))
      .first()
  },
})

