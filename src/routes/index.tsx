import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Redirect to login if not authenticated
        navigate({ to: '/login', replace: true })
      } else if (user && !user.onboardingCompleted) {
        // Redirect to onboarding if not completed
        navigate({ to: '/onboarding', replace: true })
      }
    }
  }, [isAuthenticated, isLoading, user, navigate])

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect
  }

  if (user && !user.onboardingCompleted) {
    return null // Will redirect
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <section>
        <h1 className="text-4xl font-normal">Hello World</h1>
      </section>
    </main>
  )
}
