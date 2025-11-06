import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getById = query({
  args: { vendorId: v.id('vendors') },
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    return await ctx.db.get(args.vendorId)
  },
})

