import { vEmailEvent, vEmailId } from '@convex-dev/resend'
import { v } from 'convex/values'
import { internalMutation } from '../_generated/server'

export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  handler: async (ctx, args) => {
    // Handle email status events (delivered, bounced, spam complaints)
    // Update ticket/conversation status based on email events
    // This is called automatically by the Resend component when email events occur

    // Example: If email bounced, you might want to mark the vendor email as invalid
    // if (args.event.type === 'email.bounced') {
    //   // Handle bounce logic
    // }
  },
})

