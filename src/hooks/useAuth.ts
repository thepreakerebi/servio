import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'

const TOKEN_KEY = 'servio_auth_token'

/**
 * Get Convex URL from environment variable
 */
function getConvexUrl(): string {
  const url = (import.meta as any).env?.VITE_CONVEX_URL
  if (!url) {
    console.error('VITE_CONVEX_URL environment variable is not set')
    throw new Error('Convex URL is not configured. Please set VITE_CONVEX_URL in your .env file.')
  }
  return url
}

/**
 * Decode JWT token to get user ID (client-side only, for UI purposes)
 * Note: Server-side verification is required for security
 */
function decodeToken(token: string): { userId?: string; email?: string; name?: string } | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/**
 * Custom hook for authentication state and actions
 * Uses JWT tokens stored in localStorage
 * 
 * SECURITY: Always pass the full token to backend functions
 * The backend verifies the token server-side - never trust client-side userId
 */
export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [decodedToken, setDecodedToken] = useState<{ userId?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken) {
      setToken(storedToken)
      const decoded = decodeToken(storedToken)
      setDecodedToken(decoded)
    }
    setIsLoading(false)
  }, [])

  // Query current user using token (verified server-side)
  const { data: user, isPending: isQueryPending } = useQuery({
    ...convexQuery(api.users.getCurrent as any, {
      token: token || '', // Pass full token for server-side verification
    }),
    enabled: !!token,
  })

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get Google OAuth URL from backend
      const CONVEX_URL = getConvexUrl()
      console.log('Fetching OAuth URL from:', `${CONVEX_URL}/auth/google/url`)
      
      const response = await fetch(`${CONVEX_URL}/auth/google/url`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', response.status, errorText)
        throw new Error(`Failed to get Google OAuth URL: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('OAuth URL response:', data)
      
      if (!data.url) {
        throw new Error('No OAuth URL returned from server')
      }
      
      // Redirect to Google OAuth
      window.location.href = data.url
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate Google sign in'
      console.error('Failed to initiate Google sign in:', err)
      setError(errorMessage)
      setIsLoading(false)
      throw err
    }
  }

  const handleSignOut = () => {
    try {
      setIsLoading(true)
      localStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setDecodedToken(null)
      setError(null)
      // Redirect to login
      window.location.href = '/login'
    } catch (err) {
      console.error('Failed to sign out:', err)
      setError('Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to set token (called from OAuth callback)
  const setAuthToken = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    setToken(newToken)
    const decoded = decodeToken(newToken)
    setDecodedToken(decoded)
    setError(null)
  }

  return {
    user: user ?? null,
    token: token ?? null, // Expose token for API calls - backend verifies it
    userId: decodedToken?.userId ?? null, // For UI purposes only
    isAuthenticated: !!token && !!decodedToken?.userId && user !== null && user !== undefined,
    isLoading: isLoading || isQueryPending,
    error,
    signInWithGoogle,
    signOut: handleSignOut,
    setAuthToken, // Expose for OAuth callback
  }
}
