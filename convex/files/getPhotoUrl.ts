import { v } from 'convex/values'
import { query } from '../_generated/server'

export const getPhotoUrl = query({
  args: { fileId: v.id('_storage') },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.fileId)
  },
})

