import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    
    // Users can only view their own profile
    if (args.userId !== user._id) {
      throw new Error('Not authorized to access this user profile')
    }
    
    return await ctx.db.get(args.userId)
  },
})

