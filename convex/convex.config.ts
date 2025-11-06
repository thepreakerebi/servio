import { defineApp } from 'convex/server'
import resend from '@convex-dev/resend/convex.config'
import { internal } from './_generated/api'

const app = defineApp()

app.use(
  resend({
    testMode: process.env.NODE_ENV !== 'production',
    onEmailEvent: internal.emails.handleEmailEvent,
  }),
)

export default app

