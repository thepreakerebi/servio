import { v } from 'convex/values'
import { query } from '../_generated/server'

export const getById = query({
  args: { ticketId: v.id('tickets') },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId)
    if (!ticket) {
      return null
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

