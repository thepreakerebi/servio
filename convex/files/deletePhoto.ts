import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const deletePhoto = mutation({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    fileId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)
    
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
      throw new Error('Not authorized to delete this file')
    }
    
    await ctx.storage.delete(args.fileId)
  },
})

