'use node'

import { OAuth2Client } from 'google-auth-library'

const clientId = process.env.GOOGLE_CLIENT_ID!
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
const redirectUri = process.env.GOOGLE_REDIRECT_URI!

const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri)

/**
 * Generate Google OAuth authorization URL
 * @param state Optional state parameter for OAuth flow
 * @returns Authorization URL
 */
export function getGoogleAuthUrl(state = '') {
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state,
  })
}

/**
 * Exchange authorization code for user info
 * @param code Authorization code from Google OAuth callback
 * @returns User info from Google
 */
export async function getGoogleUser(code: string) {
  const { tokens } = await oAuth2Client.getToken(code)
  oAuth2Client.setCredentials(tokens)
  
  const ticket = await oAuth2Client.verifyIdToken({
    idToken: tokens.id_token as string,
    audience: clientId,
  })
  
  const payload = ticket.getPayload()
  
  return {
    email: payload?.email,
    name: payload?.name,
    googleId: payload?.sub,
    emailVerified: payload?.email_verified,
    picture: payload?.picture,
  }
}

