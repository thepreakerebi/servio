import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import servioLogo from '/servio-logo.svg'
import googleIcon from '/google-icon-logo.svg'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, isLoading, isAuthenticated, user, error } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user && !user.onboardingCompleted) {
        navigate({ to: '/onboarding', replace: true })
      } else {
        navigate({ to: '/', replace: true })
      }
    }
  }, [isAuthenticated, isLoading, user, navigate])

  const handleGoogleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await signInWithGoogle()
    } catch (err) {
      // Error is handled in useAuth hook and displayed via error state
      console.error('Sign in error:', err)
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col p-4 gap-4">
      {/* Logo Section */}
      <section className="flex justify-center">
        <img
          src={servioLogo}
          alt="Servio Logo"
          className="h-11 w-auto"
          aria-hidden="false"
        />
      </section>

      {/* Form Section */}
      <section className="flex-1 bg-secondary flex flex-col gap-4 items-center justify-center p-4 rounded-[22px]">
        <section className="w-full max-w-[400px] space-y-4">
          <section className="flex flex-col gap-4">
            {/* Intro text */}
            <h1 className="text-2xl w-full font-semibold">
              Maintenance management made simple for hotels & restaurants
            </h1>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" appearance="light" size="sm">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Google OAuth Button */}
            <form onSubmit={handleGoogleSignIn}>
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={isLoading}
                aria-label="Sign in with Google"
                aria-busy={isLoading}
              >
                <img
                  src={googleIcon}
                  alt=""
                  className="h-5 w-5"
                  aria-hidden="true"
                />
                {isLoading ? 'Loading...' : 'Get started with Google'}
              </Button>
            </form>
          </section>
        </section>
      </section>
    </main>
  )
}
