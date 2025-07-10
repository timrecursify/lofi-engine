import type { PageLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load = (async ({ parent }) => {
  const { user } = await parent()
  
  // Verify super admin access
  if (!user || user.publicMetadata?.role !== 'super-admin') {
    throw redirect(302, '/')
  }
  
  return {
    user
  }
}) satisfies PageLoad 