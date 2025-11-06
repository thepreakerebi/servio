import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const addMessage = mutation({
  args: {
    conversationId: v.id('conversations'),
    sender: v.union(v.literal('user'), v.literal('agent'), v.literal('vendor')),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation) {
      throw new Error('Conversation not found')
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

