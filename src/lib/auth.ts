// Production Clerk Authentication System with Code-Splitting
import { goto } from '$app/navigation'
import { browser } from '$app/environment'
import { writable, type Writable } from 'svelte/store'

// Lazy import type - will be loaded dynamically
let ClerkClass: any = null

// Environment variables - these should be set in your .env file:
// PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
// CLERK_SECRET_KEY=sk_test_...

// Types for Clerk integration
export interface ClerkUser {
  id: string
  email: string
  fullName?: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  emailAddresses: Array<{
    emailAddress: string
    verification?: any
  }>
  publicMetadata: {
    plan?: 'free' | 'pro'
    role?: 'user' | 'admin' | 'super-admin'
    [key: string]: any
  }
}

export interface ClerkSession {
  id: string
  status: 'active' | 'expired' | 'abandoned'
  user: ClerkUser
  createdAt: number
  updatedAt: number
}

export interface AuthState {
  isLoaded: boolean
  isSignedIn: boolean
  user: ClerkUser | null
  session: ClerkSession | null
  userId: string | null
  sessionId: string | null
  isLoading: boolean
}

// Global Clerk instance
let clerkInstance: any = null
let clerkPromise: Promise<any> | null = null

// Auth state store
const defaultAuthState: AuthState = {
  isLoaded: false,
  isSignedIn: false,
  user: null,
  session: null,
  userId: null,
  sessionId: null,
  isLoading: false
}

export const authState: Writable<AuthState> = writable(defaultAuthState)

// Lazy load Clerk - this is the key to bundle splitting
async function loadClerk(): Promise<any> {
  if (ClerkClass) return ClerkClass

  if (!clerkPromise) {
    clerkPromise = import('@clerk/clerk-js').then(module => {
      ClerkClass = module.Clerk
      return ClerkClass
    })
  }

  return clerkPromise
}

// Initialize Clerk with lazy loading
export async function initializeClerk(publishableKey?: string): Promise<any> {
  if (!browser) {
    throw new Error('Clerk can only be initialized in browser environment')
  }

  if (clerkInstance) {
    return clerkInstance
  }

  // Set loading state
  authState.update(state => ({ ...state, isLoading: true }))

  try {
    // Dynamic import - this enables code splitting
    const ClerkConstructor = await loadClerk()
    
    const key = publishableKey || import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY
    if (!key) {
      throw new Error('PUBLIC_CLERK_PUBLISHABLE_KEY is required')
    }

    clerkInstance = new ClerkConstructor(key)
    
    await clerkInstance.load({
      // Magic link configuration
      signInUrl: '/auth/signin',
      signUpUrl: '/auth/signin', // Same page for magic link
      afterSignInUrl: '/',
      afterSignUpUrl: '/',
      // Enable magic link as primary method
      appearance: {
        elements: {
          // Customize appearance if needed
        }
      }
    })

    // Listen for auth state changes
    clerkInstance.addListener(({ user, session }: any) => {
      updateAuthState(user, session)
    })

    // Initial state update
    updateAuthState(clerkInstance.user, clerkInstance.session)

    return clerkInstance
  } catch (error) {
    console.error('Failed to initialize Clerk:', error)
    authState.update(state => ({ ...state, isLoading: false }))
    throw error
  }
}

// Update auth state store
function updateAuthState(user: any, session: any) {
  const newState: AuthState = {
    isLoaded: true,
    isSignedIn: !!user && !!session,
    user: user ? mapClerkUser(user) : null,
    session: session ? mapClerkSession(session) : null,
    userId: user?.id || null,
    sessionId: session?.id || null,
    isLoading: false
  }
  
  authState.set(newState)
}

// Map Clerk user to our interface
function mapClerkUser(clerkUser: any): ClerkUser {
  return {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    fullName: clerkUser.fullName || '',
    firstName: clerkUser.firstName || '',
    lastName: clerkUser.lastName || '',
    imageUrl: clerkUser.imageUrl || '',
    emailAddresses: clerkUser.emailAddresses || [],
    publicMetadata: clerkUser.publicMetadata || { plan: 'free' }
  }
}

// Map Clerk session to our interface
function mapClerkSession(clerkSession: any): ClerkSession {
  return {
    id: clerkSession.id,
    status: clerkSession.status,
    user: mapClerkUser(clerkSession.user),
    createdAt: clerkSession.createdAt,
    updatedAt: clerkSession.updatedAt
  }
}

// Get Clerk instance (initialize if needed) - now async
export async function getClerk(): Promise<any> {
  if (!clerkInstance) {
    return await initializeClerk()
  }
  return clerkInstance
}

// Sign in with magic link (primary method)
export async function signInWithMagicLink(email: string): Promise<void> {
  if (!browser) return

  try {
    const clerk = await getClerk()
    
    // Start magic link sign-in flow
    const signIn = await clerk.client.signIn.create({
      identifier: email
    })

    // Check if magic link is available as a strategy
    const magicLinkFactor = signIn.supportedFirstFactors.find(
      (factor: any) => factor.strategy === 'email_link'
    )

    if (magicLinkFactor) {
      // Send magic link
      await signIn.prepareFirstFactor({
        strategy: 'email_link',
        emailAddressId: (magicLinkFactor as any).emailAddressId,
        redirectUrl: window.location.origin + '/auth/callback'
      })
      
      // Track analytics event - also lazy loaded
      if (browser) {
        import('$lib/services/analytics').then(({ trackEvent, AnalyticsEvent }) => {
          trackEvent(AnalyticsEvent.USER_SIGNED_IN, {
            method: 'magic_link',
            email_domain: email.split('@')[1] || 'unknown'
          })
        }).catch(() => {})
      }
      
      // Redirect to check email page
      goto('/auth/check-email')
    } else {
      throw new Error('Magic link not supported for this email')
    }
  } catch (error) {
    console.error('Magic link sign-in failed:', error)
    throw error
  }
}

// Handle magic link callback using proper Clerk method
export async function handleMagicLinkCallback(): Promise<void> {
  if (!browser) return

  try {
    const clerk = await getClerk()
    
    // Handle email link verification using the proper Clerk method
    await clerk.handleEmailLinkVerification({
      redirectUrlComplete: '/',
      redirectUrl: '/'
    })
  } catch (error) {
    console.error('Magic link callback failed:', error)
    goto('/auth/error?error=callback_failed')
  }
}

// Sign in (redirect to magic link page)
export async function signIn(email?: string): Promise<void> {
  if (!browser) return
  
  if (email) {
    await signInWithMagicLink(email)
  } else {
    goto('/auth/signin')
  }
}

// Sign out
export async function signOut(): Promise<void> {
  if (!browser) return

  try {
    // Track analytics event before signing out - lazy loaded
    if (browser) {
      import('$lib/services/analytics').then(({ trackEvent, AnalyticsEvent }) => {
        trackEvent(AnalyticsEvent.USER_SIGNED_OUT)
      }).catch(() => {})
    }

    const clerk = await getClerk()
    await clerk.signOut()
    
    // Clear local state
    authState.set(defaultAuthState)
    
    // Redirect to home
    goto('/')
  } catch (error) {
    console.error('Sign out failed:', error)
    // Force local state clear even if API call fails
    authState.set(defaultAuthState)
    goto('/')
  }
}

// Get current session
export async function getSession(): Promise<ClerkSession | null> {
  if (!browser) return null

  try {
    const clerk = await getClerk()
    const session = clerk.session
    return session ? mapClerkSession(session) : null
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
}

// Check if user has pro plan
export function isProUser(): boolean {
  let currentState: AuthState
  authState.subscribe(state => currentState = state)()
  
  return currentState?.user?.publicMetadata?.plan === 'pro'
}

// Route protection helper
export function requireAuth(): boolean {
  let currentState: AuthState
  authState.subscribe(state => currentState = state)()
  
  if (!currentState.isSignedIn) {
    goto('/auth/signin')
    return false
  }
  
  return true
}

// Route protection for pro features
export function requireProPlan(): boolean {
  if (!requireAuth()) return false
  
  if (!isProUser()) {
    goto('/upgrade') // Redirect to upgrade page
    return false
  }
  
  return true
} 

// Check if user has admin role
export function isAdmin(): boolean {
  let currentState: AuthState
  authState.subscribe(state => currentState = state)()
  
  const userRole = currentState?.user?.publicMetadata?.role
  return userRole === 'admin' || userRole === 'super-admin'
}

// Check if user has super-admin role
export function isSuperAdmin(): boolean {
  let currentState: AuthState
  authState.subscribe(state => currentState = state)()
  
  return currentState?.user?.publicMetadata?.role === 'super-admin'
}

// Route protection for admin features
export function requireAdmin(): boolean {
  if (!requireAuth()) return false
  
  if (!isAdmin()) {
    goto('/') // Redirect to home page
    return false
  }
  
  return true
}

// Route protection for super-admin features
export function requireSuperAdmin(): boolean {
  if (!requireAuth()) return false
  
  if (!isSuperAdmin()) {
    goto('/') // Redirect to home page
    return false
  }
  
  return true
} 