import { httpAction } from '../_generated/server'
import { auth } from '../auth'

export const uploadPhoto = httpAction(async (ctx, request) => {
  // Require authentication
  const authUserId = await auth.getUserId(ctx)
  if (!authUserId) {
    return new Response('Unauthorized', { status: 401 })
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
