import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getById = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    
    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      return null
    }

    // Verify user owns the ticket associated with this conversation
    const ticket = await ctx.db.get(conversation.ticketId)
    if (!ticket || ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access this conversation')
    }

    return conversation
  },
})

