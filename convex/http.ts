import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

const http = httpRouter()

/**
 * Google OAuth callback endpoint
 * Handles the redirect from Google after user authorizes
 */
http.route({
  path: '/auth/google/callback',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') || ''

    if (!code) {
      return new Response('Missing authorization code', { status: 400 })
    }

    try {
      // Import Node.js modules inside handler to avoid bundling issues
      const { getGoogleUser } = await import('./users/googleAuth')
      
      // Exchange code for user info
      const googleUser = await getGoogleUser(code)

      if (!googleUser.email || !googleUser.googleId) {
        return new Response('Failed to get user info from Google', {
          status: 400,
        })
      }

      // Find or create user using internal query
      let user = await ctx.runQuery(internal.users.findByEmailInternal as any, {
        email: googleUser.email,
      })

      if (!user) {
        // Create new user account with Google info
        const userId = await ctx.runMutation(
          internal.users.createAccountInternal as any,
          {
            email: googleUser.email,
            name: googleUser.name || googleUser.email.split('@')[0],
            googleId: googleUser.googleId,
            profilePic: googleUser.picture,
          },
        )
        user = await ctx.runQuery(internal.users.getByIdInternal as any, {
          userId: userId,
        })
      } else if (!user.googleId && googleUser.googleId) {
        // Link Google account to existing user
        await ctx.runMutation(internal.users.linkGoogleAccountInternal as any, {
          userId: user._id,
          googleId: googleUser.googleId,
          name: googleUser.name,
          profilePic: googleUser.picture,
        })
        // Refresh user data
        user = await ctx.runQuery(internal.users.getByIdInternal as any, {
          userId: user._id,
        })
      }

      if (!user) {
        return new Response('Failed to create user', { status: 500 })
      }

      // Generate JWT token
      const { generateToken } = await import('./users/jwt')
      const token = generateToken({
        userId: user._id,
        email: user.email,
        name: user.name,
        provider: 'google',
      })

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const redirectUrl = new URL('/auth/callback', frontendUrl)
      redirectUrl.searchParams.set('token', token)
      // Add onboarding flag for new users
      if (!user.onboardingCompleted) {
        redirectUrl.searchParams.set('onboarding', 'true')
      }
      if (state) {
        redirectUrl.searchParams.set('state', state)
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      })
    } catch (error: any) {
      console.error('Google OAuth callback error:', error)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const errorUrl = new URL('/login', frontendUrl)
      errorUrl.searchParams.set('error', error.message || 'Authentication failed')
      return new Response(null, {
        status: 302,
        headers: {
          Location: errorUrl.toString(),
        },
      })
    }
  }),
})

/**
 * Get Google OAuth URL endpoint
 */
http.route({
  path: '/auth/google/url',
  method: 'GET',
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url)
    const state = url.searchParams.get('state') || ''
    // Import Node.js module inside handler
    const { getGoogleAuthUrl } = await import('./users/googleAuth')
    const authUrl = getGoogleAuthUrl(state)
    return Promise.resolve(
      new Response(JSON.stringify({ url: authUrl }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  }),
})

// File upload endpoint
http.route({
  path: '/upload-photo',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Import Node.js module inside handler to avoid bundling issues
    const uploadPhotoModule = await import('./files/uploadPhoto')
    return await (uploadPhotoModule.uploadPhoto as any)(ctx, request)
  }),
})

// Resend webhook endpoint for outbound email status events
http.route({
  path: '/resend-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Import Node.js module inside handler to avoid bundling issues
    const webhookModule = await import('./emails/handleWebhook')
    return await (webhookModule.handleWebhook as any)(ctx, request)
  }),
})

// Resend inbound email endpoint for receiving email replies
// Configure this URL in Resend dashboard under "Receiving Emails"
http.route({
  path: '/resend-inbound',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Import Node.js module inside handler to avoid bundling issues
    const inboundModule = await import('./emails/handleInboundEmail')
    return await (inboundModule.handleInboundEmail as any)(ctx, request)
  }),
})

export default http

