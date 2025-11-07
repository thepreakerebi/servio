import Google from '@auth/core/providers/google'
import Resend from '@auth/core/providers/resend'
import { convexAuth } from '@convex-dev/auth/server'
import type { MutationCtx } from './_generated/server'

/**
 * Convex Auth configuration with Google OAuth and Magic Links (Resend)
 * References:
 * - https://labs.convex.dev/auth/config/oauth/google
 * - https://labs.convex.dev/auth/config/email
 *
 * Resend provider uses AUTH_RESEND_KEY environment variable
 * Set via: npx convex env set AUTH_RESEND_KEY yourresendkey
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      profile(googleProfile) {
        return {
          id: googleProfile.sub,
          name: googleProfile.name ?? undefined,
          email: googleProfile.email ?? undefined,
          image: googleProfile.picture ?? undefined,
        }
      },
    }),
    Resend,
  ],
  /**
   * Callback: Sync user data to our custom users table after user is created/updated
   * Called after successful authentication
   */
  callbacks: {
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      args: { userId: string },
    ) {
      const authUserId = args.userId as any

      // Get auth user to access email, name
      const authUser = await ctx.db.get(authUserId)
      if (!authUser) {
        return
      }

      // Get email from auth user (stored in auth_users table)
      const email = (authUser as any).email
      if (!email) {
        return
      }

      const name = (authUser as any).name

      // Check if user already exists in our users table
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q: any) => q.eq('email', email))
        .first()

      if (existing) {
        // Update existing user
        await ctx.db.patch(existing._id, {
          name: name ?? existing.name,
        })
      } else {
        // Create new user with onboardingCompleted: false
        await ctx.db.insert('users', {
          email,
          name: name ?? undefined,
          createdAt: Date.now(),
          onboardingCompleted: false,
        })
      }
    },
  },
})
