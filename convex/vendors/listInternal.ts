import { internalQuery } from '../_generated/server'

/**
 * Get all vendors (internal)
 */
export const listInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('vendors').collect()
  },
})

