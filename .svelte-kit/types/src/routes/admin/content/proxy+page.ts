// @ts-nocheck
import { requireSuperAdmin } from '$lib/auth'
import type { PageLoad } from './$types'

export const load = async ({ parent }: Parameters<PageLoad>[0]) => {
  const { user } = await parent()
  
  // Verify super admin access
  await requireSuperAdmin()
  
  return {
    user
  }
} 