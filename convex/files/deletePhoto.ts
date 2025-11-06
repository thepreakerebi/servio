import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const deletePhoto = mutation({
  args: { fileId: v.id('_storage') },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.fileId)
  },
})

