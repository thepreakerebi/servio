import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getByTicket = query({
  args: { ticketId: v.id('tickets') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      return null
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access vendor for this ticket')
    }

    if (!ticket.selectedVendorId) {
      return null
    }

    return await ctx.db.get(ticket.selectedVendorId)
  },
})

