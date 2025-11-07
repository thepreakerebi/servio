import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import servioLogo from '/servio-logo.svg'
import googleIcon from '/google-icon-logo.svg'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, isLoading, error, isAuthenticated, user } = useAuth()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

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
    await signInWithGoogle()
  }

  const handleMagicLinkSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setEmailError(null)

    // Validate empty email
    if (!email || email.trim() === '') {
      setEmailError('Email address is required')
      // Auto-clear error after 5 seconds
      setTimeout(() => setEmailError(null), 5000)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address')
      // Auto-clear error after 5 seconds
      setTimeout(() => setEmailError(null), 5000)
      return
    }

    try {
      await signInWithMagicLink(email.trim())
      setMagicLinkSent(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send magic link'
      setEmailError(errorMessage)
      // Auto-clear error after 5 seconds
      setTimeout(() => setEmailError(null), 5000)
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
          {magicLinkSent ? (
            <article className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-muted-foreground">
                We've sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
              </p>
            </article>
          ) : (
            <section className="flex flex-col gap-4">

              {/* Intro text */}
              <h1 className="text-2xl w-full font-semibold">Maintenance management made simple for hotels & restaurants</h1>
              
              {/* Google OAuth Button */}
              <form onSubmit={handleGoogleSignIn}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  aria-label="Sign in with Google"
                >
                  <img
                    src={googleIcon}
                    alt=""
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                  Get started with Google
                </Button>
              </form>

              {/* Separator */}
              <section className="relative flex items-center gap-4" role="separator" aria-label="Or">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </section>

              {/* Magic Link Form - Temporarily disabled */}
              {/* 
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <fieldset className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError(null)
                    }}
                    aria-describedby={emailError ? 'email-error' : undefined}
                    aria-invalid={!!emailError}
                    disabled={isLoading}
                    className={emailError ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {emailError && (
                    <Alert id="email-error" variant="destructive" appearance="light" size="sm">
                      <AlertDescription>{emailError}</AlertDescription>
                    </Alert>
                  )}
                  {error && !emailError && (
                    <Alert variant="destructive" appearance="light" size="sm">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </fieldset>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Continue with email'}
                </Button>
              </form>
              */}
            </section>
          )}
          </section>
        </section>
    </main>
  )
}
