import { v } from 'convex/values'
import { query } from '../_generated/server'

export const getByTicketId = query({
  args: { ticketId: v.id('tickets') },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query('conversations')
      .withIndex('by_ticketId', (q) => q.eq('ticketId', args.ticketId))
      .first()

    return conversation
  },
})

