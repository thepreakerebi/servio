import { Resend } from '@convex-dev/resend'
import { httpAction } from '../_generated/server'
import { components, internal } from '../_generated/api'

const resend = new Resend((components as any).resend, {
  testMode: process.env.NODE_ENV !== 'production',
  onEmailEvent: internal.emails.handleEmailEvent,
})

/**
 * Handle Resend webhook events for outbound email status updates
 * This handles events like email.sent, email.delivered, email.bounced, etc.
 * For inbound email replies, see handleInboundEmail.ts
 */
export const handleWebhook = httpAction(async (ctx, request) => {
  return await resend.handleResendEventWebhook(ctx, request)
})
