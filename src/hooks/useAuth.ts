import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'

/**
 * Custom hook for authentication state and actions
 * Uses Convex Auth for sign in/out and queries user data
 * 
 * Note: Uses TanStack Query integration pattern for TanStack Start
 * See: https://docs.convex.dev/quickstart/tanstack-start
 */
export function useAuth() {
  const { signIn, signOut } = useAuthActions()
  const { data: user, isPending: isQueryPending } = useQuery(
    convexQuery(api.users.getCurrent as any, {}),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await signIn('google')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithMagicLink = async (email: string) => {
    try {
      setIsLoading(true)
      setError(null)
      await signIn('resend', { email })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user: user ?? null,
    isAuthenticated: user !== null && user !== undefined,
    isLoading: isLoading || isQueryPending,
    error,
    signInWithGoogle,
    signInWithMagicLink,
    signOut: handleSignOut,
  }
}