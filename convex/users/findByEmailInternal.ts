import { v } from 'convex/values'
import { internalQuery } from '../_generated/server'
import type { QueryCtx } from '../_generated/server'

/**
 * Internal query to find user by email address
 * Used by HTTP actions for OAuth callbacks
 */
export const findByEmailInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()
  },
})

