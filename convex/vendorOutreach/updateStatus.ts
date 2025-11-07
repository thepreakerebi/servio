import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

/**
 * Update vendor outreach status
 */
export const updateStatus = internalMutation({
  args: {
    outreachId: v.id('vendorOutreach'),
    status: v.union(
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('opened'),
      v.literal('responded'),
      v.literal('bounced'),
      v.literal('expired'),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.outreachId, {
      status: args.status,
    })
  },
})

