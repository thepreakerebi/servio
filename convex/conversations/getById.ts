import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getById = query({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)

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
