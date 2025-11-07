import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'
import { api } from '../_generated/api'
import type { Id } from '../_generated/dataModel'

export const create = mutation({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    description: v.string(),
    location: v.optional(v.string()),
    photoId: v.id('_storage'),
  },
  handler: async (ctx, args): Promise<Id<'tickets'>> => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)

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
    await ctx.scheduler.runAfter(
      0,
      api.agents.ticketAnalysisAgent.analyzeTicket as any,
      {
        ticketId,
      },
    )

    return ticketId
  },
})

