import { v } from 'convex/values'
import { query } from '../_generated/server'

export const getById = query({
  args: { vendorId: v.id('vendors') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vendorId)
  },
})

