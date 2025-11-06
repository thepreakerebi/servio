import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const updateStatus = mutation({
  args: {
    ticketId: v.id('tickets'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to update status for this ticket')
    }

    await ctx.db.patch(args.ticketId, {
      status: args.status,
    })
  },
})

