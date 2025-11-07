'use node'

import jwt from 'jsonwebtoken'
import { v } from 'convex/values'
import { action } from '../_generated/server'

const jwtSecret = process.env.JWT_SECRET || 'FAKE_SECRET_MUST_REPLACE'

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(payload: {
  userId: string
  email: string
  name?: string
  provider: string
}): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' })
}

/**
 * Verify and decode JWT token
 * Returns null if token is invalid
 */
export function verifyToken(token: string): {
  userId: string
  email: string
  name?: string
  provider: string
} | null {
  try {
    const decoded = jwt.verify(token, jwtSecret) as any
    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      provider: decoded.provider,
    }
  } catch {
    return null
  }
}

/**
 * Internal action to verify JWT token and return user ID
 * This runs in Node.js environment and can verify tokens securely
 */
export const verifyTokenAction = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const decoded = verifyToken(args.token)
    if (!decoded || !decoded.userId) {
      throw new Error('Invalid or expired token')
    }
    return { userId: decoded.userId, email: decoded.email }
  },
})
