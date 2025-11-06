import { v } from 'convex/values'
import { query } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const list = query({
  args: {
    status: v.optional(v.string()),
    location: v.optional(v.string()),
    tag: v.optional(v.string()),
    vendorId: v.optional(v.id('vendors')),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    let tickets

    if (args.status) {
      tickets = await ctx.db
        .query('tickets')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .collect()
    } else if (args.vendorId) {
      tickets = await ctx.db
        .query('tickets')
        .withIndex('by_selectedVendorId', (q) =>
          q.eq('selectedVendorId', args.vendorId),
        )
        .collect()
    } else {
      // Only show tickets created by the authenticated user
      tickets = await ctx.db
        .query('tickets')
        .withIndex('by_createdBy', (q) => q.eq('createdBy', user._id))
        .collect()
    }

    // Filter by location and tag if provided
    let filtered = tickets
    if (args.location) {
      filtered = filtered.filter((t) => t.location === args.location)
    }
    if (args.tag) {
      filtered = filtered.filter((t) =>
        t.predictedTags.includes(args.tag!),
      )
    }

    return filtered
  },
})

