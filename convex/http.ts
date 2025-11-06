import { httpRouter } from 'convex/server'
import { auth } from './auth'
import { handleWebhook } from './emails/handleWebhook'
import { handleInboundEmail } from './emails/handleInboundEmail'
import { uploadPhoto } from './files/uploadPhoto'

const http = httpRouter()

// Convex Auth HTTP endpoints for OAuth callbacks and magic link verification
auth.addHttpRoutes(http)

// File upload endpoint
http.route({
  path: '/upload-photo',
  method: 'POST',
  handler: uploadPhoto,
})

// Resend webhook endpoint for outbound email status events
http.route({
  path: '/resend-webhook',
  method: 'POST',
  handler: handleWebhook,
})

// Resend inbound email endpoint for receiving email replies
// Configure this URL in Resend dashboard under "Receiving Emails"
http.route({
  path: '/resend-inbound',
  method: 'POST',
  handler: handleInboundEmail,
})

export default http

