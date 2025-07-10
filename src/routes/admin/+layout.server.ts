import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals }) => {
  const { auth } = locals
  
  // Check if user is authenticated
  if (!auth.userId) {
    throw redirect(302, '/auth/signin')
  }
  
  // Check if user has admin role
  const userRole = auth.user?.publicMetadata?.role
  if (!userRole || (userRole !== 'admin' && userRole !== 'super-admin')) {
    throw redirect(302, '/')
  }
  
  return {
    user: auth.user,
    isAdmin: userRole === 'admin' || userRole === 'super-admin',
    isSuperAdmin: userRole === 'super-admin'
  }
} 