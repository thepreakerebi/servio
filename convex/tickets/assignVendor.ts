import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const assignVendor = mutation({
  args: {
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    await ctx.db.patch(args.ticketId, {
      selectedVendorId: args.vendorId,
      status: 'Awaiting Vendor',
    })
  },
})

