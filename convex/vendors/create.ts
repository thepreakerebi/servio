import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const create = mutation({
  args: {
    businessName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    specialty: v.string(),
    address: v.string(),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const vendorId = await ctx.db.insert('vendors', {
      businessName: args.businessName,
      email: args.email,
      phone: args.phone,
      specialty: args.specialty,
      address: args.address,
      rating: args.rating,
      jobs: [],
    })

    return vendorId
  },
})

