import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const updateRating = mutation({
  args: {
    vendorId: v.id('vendors'),
    rating: v.number(),
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    
    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to rate vendor for this ticket')
    }

    await ctx.db.patch(args.vendorId, {
      rating: args.rating,
    })
  },
})

