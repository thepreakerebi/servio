import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const addMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    sender: v.union(v.literal('user'), v.literal('agent'), v.literal('vendor')),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user owns the ticket (unless sender is agent/vendor)
    if (args.sender === 'user') {
      const ticket = await ctx.db.get(conversation.ticketId)
      if (!ticket || ticket.createdBy !== user._id) {
        throw new Error('Not authorized to add message to this conversation')
      }
    }

    const newMessage = {
      sender: args.sender,
      message: args.message,
      date: Date.now(),
    }

    await ctx.db.patch(args.conversationId, {
      messages: [...conversation.messages, newMessage],
      updatedAt: Date.now(),
    })
  },
})
