import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const updateRating = mutation({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    vendorId: v.id('vendors'),
    rating: v.number(),
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
      throw new Error('Not authorized to rate vendor for this ticket')
    }

    await ctx.db.patch(args.vendorId, {
      rating: args.rating,
    })
  },
})

