import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const assignVendor = mutation({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to assign vendor to this ticket')
    }

    await ctx.db.patch(args.ticketId, {
      selectedVendorId: args.vendorId,
      status: 'Awaiting Vendor',
    })
  },
})

