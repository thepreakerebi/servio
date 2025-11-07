import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'
import type { QueryCtx } from '../_generated/server'

/**
 * Internal query to get user by ID
 * Used by HTTP actions for OAuth callbacks
 */
export const getByIdInternal = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db.get(args.userId)
  },
})

