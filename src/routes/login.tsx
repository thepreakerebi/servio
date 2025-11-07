import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import servioLogo from '/servio-logo.svg'
import googleIcon from '/google-icon-logo.svg'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, signInWithMagicLink, isLoading, error, isAuthenticated, user } = useAuth()
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    try {
      await signInWithMagicLink(email)
      setMagicLinkSent(true)
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send magic link')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="flex flex-col gap-4 w-full max-w-md">
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
        <section className="flex flex-col gap-4">
          {magicLinkSent ? (
            <article className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-muted-foreground">
                We've sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
              </p>
            </article>
          ) : (
            <>
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
              <div className="relative flex items-center gap-4" role="separator" aria-label="Or">
                <Separator className="flex-1" />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator className="flex-1" />
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <fieldset className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-describedby={emailError ? 'email-error' : undefined}
                    aria-invalid={!!emailError}
                    disabled={isLoading}
                  />
                  {emailError && (
                    <p id="email-error" className="text-sm text-destructive" role="alert">
                      {emailError}
                    </p>
                  )}
                  {error && !emailError && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
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
            </>
          )}
        </section>
      </section>
    </main>
  )
}
