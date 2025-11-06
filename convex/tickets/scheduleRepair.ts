import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const scheduleRepair = mutation({
  args: {
    ticketId: v.id('tickets'),
    scheduledDate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    await ctx.db.patch(args.ticketId, {
      scheduledDate: args.scheduledDate,
      status: 'Scheduled',
    })
  },
})

