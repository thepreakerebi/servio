import { v } from 'convex/values'
import { query } from '../_generated/server'

export const getById = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId)
  },
})

