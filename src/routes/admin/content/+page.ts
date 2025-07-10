import { requireSuperAdmin } from '$lib/auth'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ parent }) => {
  const { user } = await parent()
  
  // Verify super admin access
  await requireSuperAdmin()
  
  return {
    user
  }
} 