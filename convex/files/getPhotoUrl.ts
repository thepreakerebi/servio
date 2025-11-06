import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getPhotoUrl = query({
  args: { fileId: v.id('_storage') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    
    // Verify file ownership by checking if it's associated with user's tickets
    const ticketWithPhoto = await ctx.db
      .query('tickets')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', user._id))
      .filter((q) => 
        q.or(
          q.eq(q.field('photoId'), args.fileId),
          q.eq(q.field('verificationPhotoId'), args.fileId)
        )
      )
      .first()
    
    if (!ticketWithPhoto) {
      throw new Error('Not authorized to access this file')
    }
    
    return await ctx.storage.getUrl(args.fileId)
  },
})
