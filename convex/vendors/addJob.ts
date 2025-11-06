import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const addJob = mutation({
  args: {
    vendorId: v.id('vendors'),
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
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

