import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const addJob = mutation({
  args: {
    vendorId: v.id('vendors'),
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
      throw new Error('Not authorized to add job for this ticket')
    }

    const vendor = await ctx.db.get(args.vendorId)
    if (!vendor) {
      throw new Error('Vendor not found')
    }

    const job = {
      ticketId: args.ticketId,
      assignedAt: Date.now(),
      completedAt: undefined,
      feedback: undefined,
    }

    await ctx.db.patch(args.vendorId, {
      jobs: [...vendor.jobs, job],
    })
  },
})

