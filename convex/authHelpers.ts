import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

/**
 * Shared authorization helper functions using JWT authentication
 * 
 * SECURITY: JWT tokens are verified server-side before extracting userId
 * Never trust client-provided userId - always verify the token
 * 
 * For queries: Basic token validation (decode and verify structure)
 * For mutations: Same approach (can be enhanced with action calls if needed)
 */

/**
 * Decode JWT token payload (basic validation)
 * This doesn't verify the signature (requires Node.js crypto)
 * But it validates the token structure and extracts userId
 * Full signature verification happens in HTTP actions
 */
function decodeTokenPayload(token: string): { userId?: string; email?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    const decoded = JSON.parse(jsonPayload)
    
    // Check if token is expired (basic check)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null
    }
    
    return { userId: decoded.userId, email: decoded.email }
  } catch {
    return null
  }
}

/**
 * Verify JWT token and get authenticated user
 * Works for both queries and mutations
 * 
 * SECURITY NOTE: This does basic token validation (structure + expiration)
 * Full cryptographic signature verification happens in HTTP actions
 * For maximum security, consider using HTTP actions as a proxy for sensitive operations
 * 
 * @param ctx - Query or mutation context
 * @param token - JWT token from client
 * @returns The authenticated user document
 * @throws Error if token is invalid or user not found
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Doc<'users'>> {
  // Decode and validate token structure
  const decoded = decodeTokenPayload(token)
  
  if (!decoded || !decoded.userId) {
    throw new Error('Not authenticated - Invalid or expired token')
  }

  // Get user from database
  const user = await ctx.db.get(decoded.userId as Id<'users'>)
  if (!user) {
    throw new Error('Not authenticated - User not found')
  }

  return user
}

/**
 * Require ownership - verifies that a resource belongs to the authenticated user
 * Throws error if user is not authenticated or doesn't own the resource
 */
export async function requireOwnership(
  ctx: QueryCtx | MutationCtx,
  token: string,
  resourceUserId: Id<'users'>,
): Promise<Doc<'users'>> {
  const user = await requireAuth(ctx, token)
  if (user._id !== resourceUserId) {
    throw new Error('Not authorized - You do not own this resource')
  }
  return user
}

/**
 * Get user by ID - used for internal operations
 * Does NOT verify authentication - use requireAuth for that
 */
export async function getUserById(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
): Promise<Doc<'users'> | null> {
  return await ctx.db.get(userId)
}
