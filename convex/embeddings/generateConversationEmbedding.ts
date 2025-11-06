import { v } from 'convex/values'
import OpenAI from 'openai'
import { internalAction } from '../_generated/server'
import { internal } from '../_generated/api'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Internal action - called internally, no user context required
export const generateConversationEmbedding = internalAction({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    // Get conversation data using internal query
    const conversation = await ctx.runQuery(internal.conversations.getByIdInternal, {
      conversationId: args.conversationId,
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Create embedding text from all messages
    const embeddingText = conversation.messages
      .map((msg: { message: string }) => msg.message)
      .join(' ')

    if (!embeddingText.trim()) {
      throw new Error('Conversation has no messages to embed')
    }

    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: embeddingText,
    })

    const embedding = response.data[0].embedding

    // Update conversation with embedding
    await ctx.runMutation(internal.embeddings.updateConversationEmbedding, {
      conversationId: args.conversationId,
      embedding,
    })

    return embedding
  },
})

