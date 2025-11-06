import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const updateStatus = mutation({
  args: {
    ticketId: v.id('tickets'),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    await ctx.db.patch(args.ticketId, {
      status: args.status,
    })
  },
})

