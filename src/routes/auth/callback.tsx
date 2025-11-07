import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setAuthToken } = useAuth()

  useEffect(() => {
    // Get token and onboarding flag from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const onboarding = urlParams.get('onboarding')
    const error = urlParams.get('error')

    if (error) {
      // Redirect to login with error
      navigate({
        to: '/login',
        search: { error },
        replace: true,
      })
      return
    }

    if (token) {
      // Store token
      setAuthToken(token)
      
      // Redirect to onboarding if first-time user, otherwise to home
      if (onboarding === 'true') {
        navigate({ to: '/onboarding', replace: true })
      } else {
        navigate({ to: '/', replace: true })
      }
    } else {
      // No token, redirect to login
      navigate({ to: '/login', replace: true })
    }
  }, [navigate, setAuthToken])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>Completing authentication...</p>
    </main>
  )
}
