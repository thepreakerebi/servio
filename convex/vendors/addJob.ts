import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const addJob = mutation({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    vendorId: v.id('vendors'),
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

