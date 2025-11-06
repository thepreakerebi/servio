import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx)
    return await ctx.db.query('vendors').collect()
  },
})

