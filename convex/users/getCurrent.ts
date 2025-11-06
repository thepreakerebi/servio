import { query } from '../_generated/server'
import { getAuthenticatedUser } from '../authHelpers'

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthenticatedUser(ctx)
  },
})

