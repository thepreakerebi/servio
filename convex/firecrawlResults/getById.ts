import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'

/**
 * Get firecrawl results by ID (internal)
 */
export const getById = internalQuery({
  args: {
    resultId: v.id('firecrawlResults'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.resultId)
  },
})

