'use node'

import { httpAction } from '../_generated/server'
import { verifyToken } from '../users/jwt'

/**
 * Upload photo endpoint
 * Requires JWT authentication via Authorization header
 */
export const uploadPhoto = httpAction(async (ctx, request) => {
  // Get JWT token from Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized - Missing or invalid token', { status: 401 })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const decoded = verifyToken(token)

  if (!decoded || !decoded.userId) {
    return new Response('Unauthorized - Invalid token', { status: 401 })
  }

  // Verify user exists
  const user = await ctx.runQuery(
    (await import('../_generated/api')).internal.users.getByIdInternal as any,
    { userId: decoded.userId as any },
  )

  if (!user) {
    return new Response('Unauthorized - User not found', { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return new Response('No file provided', { status: 400 })
  }

  // Validate file type (images only)
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return new Response('Invalid file type. Only images are allowed.', {
      status: 400,
    })
  }

  // Store file
  const fileId = await ctx.storage.store(file)

  return new Response(JSON.stringify({ fileId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
