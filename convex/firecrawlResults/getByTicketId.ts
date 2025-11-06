import { query } from '../_generated/server'
import { v } from 'convex/values'

export const getByTicketId = query({
  args: { ticketId: v.id('tickets') },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket || !ticket.firecrawlResultsId) {
      return null
    }

    return await ctx.db.get(ticket.firecrawlResultsId)
  },
})

