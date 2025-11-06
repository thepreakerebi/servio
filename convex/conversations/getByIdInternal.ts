import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

// Internal query version that doesn't require auth
// Used by internal actions and mutations that already have auth context
export const getByIdInternal = internalQuery({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId)
  },
})

