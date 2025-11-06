import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const update = mutation({
  args: {
    ticketId: v.id('tickets'),
    issueType: v.optional(v.string()),
    predictedTags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    const { ticketId, ...updates } = args
    await ctx.db.patch(ticketId, updates)
  },
})

