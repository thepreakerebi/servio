import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const updateProfile = mutation({
  args: {
    orgName: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    await ctx.db.patch(user._id, {
      orgName: args.orgName,
      location: args.location,
    })

    return user._id
  },
})

