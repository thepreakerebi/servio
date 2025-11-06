import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'
import { internal } from '../_generated/api'

export const create = mutation({
  args: {
    description: v.string(),
    location: v.optional(v.string()),
    photoId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    const ticketId = await ctx.db.insert('tickets', {
      createdBy: user._id,
      description: args.description,
      location: args.location,
      photoId: args.photoId,
      predictedTags: [],
      status: 'New',
      createdAt: Date.now(),
    })

    // Trigger ticket analysis and embedding generation
    await ctx.scheduler.runAfter(0, internal.agents.ticketAnalysisAgent.analyzeTicket, {
      ticketId,
    })

    return ticketId
  },
})

