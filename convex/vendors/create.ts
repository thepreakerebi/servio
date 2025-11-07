import { v } from 'convex/values'
import { mutation } from '../_generated/server'
import { requireAuth } from '../authHelpers'

export const create = mutation({
  args: {
    token: v.string(), // JWT token - verified server-side for security
    businessName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    specialty: v.string(),
    address: v.string(),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify token server-side and get authenticated user
    await requireAuth(ctx, args.token)
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

