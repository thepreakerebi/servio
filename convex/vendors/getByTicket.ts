import { v } from 'convex/values'
import { query } from '../_generated/server'

export const getByTicket = query({
  args: { ticketId: v.id('tickets') },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket || !ticket.selectedVendorId) {
      return null
    }

    return await ctx.db.get(ticket.selectedVendorId)
  },
})

