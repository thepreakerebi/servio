import { v } from 'convex/values'
import { internalMutation, internalQuery } from '../_generated/server'

/**
 * Store email-to-ticket mapping when sending an email
 */
export const storeEmailMapping = internalMutation({
  args: {
    emailId: v.string(),
    ticketId: v.id('tickets'),
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('emailMappings', {
      emailId: args.emailId,
      ticketId: args.ticketId,
      vendorId: args.vendorId,
      sentAt: Date.now(),
      status: 'sent',
    })
  },
})

/**
 * Get email mapping by email ID
 */
export const getEmailMappingByEmailId = internalQuery({
  args: { emailId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('emailMappings')
      .withIndex('by_emailId', (q) => q.eq('emailId', args.emailId))
      .first()
  },
})

/**
 * Update email mapping status
 */
export const updateEmailMappingStatus = internalMutation({
  args: {
    emailId: v.string(),
    status: v.union(
      v.literal('sent'),
      v.literal('delivered'),
      v.literal('bounced'),
      v.literal('complained'),
      v.literal('opened'),
      v.literal('clicked'),
    ),
    bounceReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query('emailMappings')
      .withIndex('by_emailId', (q) => q.eq('emailId', args.emailId))
      .first()

    if (mapping) {
      const update: any = {
        status: args.status,
        lastEventAt: Date.now(),
      }
      if (args.bounceReason !== undefined) {
        update.bounceReason = args.bounceReason
      }
      await ctx.db.patch(mapping._id, update)
    }
  },
})

/**
 * Update vendor email status
 */
export const updateVendorEmailStatus = internalMutation({
  args: {
    vendorId: v.id('vendors'),
    emailStatus: v.union(
      v.literal('valid'),
      v.literal('invalid'),
      v.literal('bounced'),
      v.literal('complained'),
      v.literal('doNotEmail'),
    ),
    lastEmailError: v.optional(v.string()),
    clearError: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const update: any = {
      emailStatus: args.emailStatus,
    }
    if (args.clearError) {
      update.lastEmailError = undefined
    } else if (args.lastEmailError !== undefined) {
      update.lastEmailError = args.lastEmailError
    }
    await ctx.db.patch(args.vendorId, update)
  },
})

