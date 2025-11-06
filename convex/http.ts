import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import { handleWebhook } from './emails/handleWebhook'
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

// Resend webhook endpoint
http.route({
  path: '/resend-webhook',
  method: 'POST',
  handler: handleWebhook,
})

export default http

