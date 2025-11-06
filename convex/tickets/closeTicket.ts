import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const closeTicket = mutation({
  args: {
    ticketId: v.id('tickets'),
    verificationPhotoId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    await ctx.db.patch(args.ticketId, {
      verificationPhotoId: args.verificationPhotoId,
      closedAt: Date.now(),
      status: 'Closed',
    })
  },
})

