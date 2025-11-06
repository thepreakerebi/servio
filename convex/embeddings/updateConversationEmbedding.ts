import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

export const updateConversationEmbedding = internalMutation({
  args: {
    conversationId: v.id('conversations'),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      embedding: args.embedding,
    })
  },
})

