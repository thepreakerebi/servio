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
    const user = await requireAuth(ctx)

    // Verify user owns the ticket by querying directly
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      throw new Error('Ticket not found')
    }

    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to update this ticket')
    }

    const { ticketId, ...updates } = args
    await ctx.db.patch(ticketId, updates)
  },
})

