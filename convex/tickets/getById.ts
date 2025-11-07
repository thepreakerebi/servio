import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const getById = query({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    ticketId: v.id('tickets'),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    const user = await requireAuth(ctx, args.token)
    
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      return null
    }

    // Verify user owns the ticket
    if (ticket.createdBy !== user._id) {
      throw new Error('Not authorized to access this ticket')
    }

    // Get photo URL if photoId exists
    let photoUrl: string | null = null
    if (ticket.photoId) {
      photoUrl = await ctx.storage.getUrl(ticket.photoId)
    }

    // Get verification photo URL if exists
    let verificationPhotoUrl: string | null = null
    if (ticket.verificationPhotoId) {
      verificationPhotoUrl = await ctx.storage.getUrl(ticket.verificationPhotoId)
    }

    return {
      ...ticket,
      photoUrl,
      verificationPhotoUrl,
    }
  },
})

