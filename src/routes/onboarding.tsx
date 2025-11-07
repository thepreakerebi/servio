import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, user } = useAuth()

  // Redirect if not authenticated or already completed onboarding
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate({ to: '/login', replace: true })
      } else if (user && user.onboardingCompleted) {
        navigate({ to: '/', replace: true })
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

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="max-w-2xl w-full">
        <article className="text-center space-y-4">
          <h1 className="text-3xl font-semibold">Onboarding</h1>
          <p className="text-muted-foreground">
            Welcome to Servio! Complete your profile to get started.
          </p>
        </article>
      </section>
    </main>
  )
}
