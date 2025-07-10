import { writable, derived, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { authState } from './auth';

// Types
export interface ClipMeta {
  id: string;
  topic: string;
  title: string;
  duration: number; // seconds
  storageType: 'kv' | 'r2';
  storageKey: string;
  createdAt: Date;
  expiresAt?: Date;
  voiceId?: string;
  sourceUrl?: string;
}

export interface User {
  id: string | null;
  email: string | null;
  name?: string | null;
  imageUrl?: string | null;
  plan: 'free' | 'pro';
  locale: string;
  preferences: Preferences;
  stripeCustomerId?: string;
  // Clerk-specific fields
  clerkId?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  lastSignInAt?: Date;
}

export interface Preferences {
  volumes: {
    music: number; // 0-1
    voice: number; // 0-1
    effects: number; // 0-1
    ads: number; // 0-1
  };
  narrationSpeed: number; // 0.8-1.5
  enabledTopics: string[];
  theme: 'dark' | 'light' | 'amoled' | 'sepia';
  scene: 'auto' | 'city' | 'nature' | 'space' | 'underwater';
  vinylFx: boolean;
  // Server sync metadata
  lastSyncedAt?: Date;
  version?: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrack: string | null;
  currentVoice: ClipMeta | null;
  isDucking: boolean;
  musicVolume: number; // Current actual volume (may be ducked)
  activeEffects: string[]; // ['rain', 'campfire', etc]
}

export interface TopicInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  isPro: boolean;
  clipLengthRange: [number, number]; // [min, max] in seconds
  updateFrequency: string; // "Every 15 min", "Hourly", etc
}

// Server sync state
export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  pendingChanges: boolean;
}

// Default values
const defaultPreferences: Preferences = {
  volumes: { music: 0.7, voice: 0.8, effects: 0.5, ads: 0.5 },
  narrationSpeed: 1.0,
  enabledTopics: ['world-news', 'local-news', 'weather', 'sports', 'education', 'health'],
  theme: 'dark',
  scene: 'auto',
  vinylFx: false,
  version: 1
};

const defaultUser: User = {
  id: null,
  email: null,
  plan: 'free',
  locale: 'auto',
  preferences: defaultPreferences
};

const defaultSyncState: SyncState = {
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  pendingChanges: false
};

// Available topics from PRD
export const AVAILABLE_TOPICS: TopicInfo[] = [
  {
    id: 'world-news',
    name: 'World News',
    icon: '🌍',
    description: 'Global news updates from Reuters and AP',
    isPro: false,
    clipLengthRange: [90, 120],
    updateFrequency: 'Every 15 minutes'
  },
  {
    id: 'local-news',
    name: 'Local News',
    icon: '📍',
    description: 'News from your area',
    isPro: false,
    clipLengthRange: [60, 90],
    updateFrequency: 'Every 20 minutes'
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: '🌤️',
    description: 'Current conditions and forecasts',
    isPro: false,
    clipLengthRange: [30, 45],
    updateFrequency: 'Every 30 minutes'
  },
  {
    id: 'markets',
    name: 'Markets',
    icon: '📈',
    description: 'Stock market updates and analysis',
    isPro: true,
    clipLengthRange: [60, 90],
    updateFrequency: 'Every 30 minutes'
  },
  {
    id: 'crypto',
    name: 'Crypto',
    icon: '₿',
    description: 'Cryptocurrency news and prices',
    isPro: true,
    clipLengthRange: [45, 60],
    updateFrequency: 'Every 30 minutes'
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: '⚽',
    description: 'Sports scores and highlights',
    isPro: false,
    clipLengthRange: [60, 90],
    updateFrequency: 'Hourly'
  },
  {
    id: 'twitter',
    name: 'Twitter/X Trending',
    icon: '𝕏',
    description: "What's trending on Twitter/X",
    isPro: true,
    clipLengthRange: [30, 45],
    updateFrequency: 'Every 20 minutes'
  },
  {
    id: 'reddit',
    name: 'Reddit Hot',
    icon: '🔥',
    description: 'Popular posts from Reddit',
    isPro: true,
    clipLengthRange: [45, 60],
    updateFrequency: 'Every 30 minutes'
  },
  {
    id: 'education',
    name: 'Education',
    icon: '🎓',
    description: 'Learn something new',
    isPro: false,
    clipLengthRange: [120, 180],
    updateFrequency: 'Every 2 hours'
  },
  {
    id: 'health',
    name: 'Health Tips',
    icon: '💪',
    description: 'Wellness and health advice',
    isPro: false,
    clipLengthRange: [90, 120],
    updateFrequency: 'Every 2 hours'
  }
];

// Queue Store
export const queue = writable<ClipMeta[]>([]);
export const queuePosition = writable<number>(0);
export const isGeneratingMore = writable<boolean>(false);

// Sync State Store
export const syncState = writable<SyncState>(defaultSyncState);

// User Store with Clerk integration
function createUserStore() {
  const { subscribe, set, update } = writable<User>(defaultUser);
  
  // Subscribe to auth state changes and update user accordingly
  if (browser) {
    authState.subscribe(async (auth) => {
      if (auth.isSignedIn && auth.user) {
        // Map Clerk user to our User interface
        const clerkUser = auth.user;
        const userPlan = clerkUser.publicMetadata?.plan === 'pro' ? 'pro' : 'free';
        
        // Load user preferences from server
        let userPreferences = defaultPreferences;
        try {
          const response = await fetch('/api/user/preferences', {
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            userPreferences = { ...defaultPreferences, ...data.preferences };
          }
        } catch (error) {
          console.warn('Failed to load user preferences from server:', error);
          // Fall back to localStorage preferences
          const stored = localStorage.getItem('lofi-preferences');
          if (stored) {
            userPreferences = { ...defaultPreferences, ...JSON.parse(stored) };
          }
        }

        set({
          id: clerkUser.id,
          clerkId: clerkUser.id,
          email: clerkUser.email || null,
          name: clerkUser.fullName || clerkUser.firstName || null,
          imageUrl: clerkUser.imageUrl,
          emailVerified: clerkUser.emailAddresses?.[0]?.verification?.status === 'verified',
          plan: userPlan,
          locale: 'auto',
          preferences: userPreferences
        });
      } else {
        // User signed out, reset to default
        set(defaultUser);
      }
    });
  }
  
  return { subscribe, set, update };
}

export const user = createUserStore();

// Server sync functions
async function syncPreferencesToServer(preferences: Preferences): Promise<boolean> {
  if (!browser) return false;
  
  try {
    syncState.update(state => ({ ...state, isSyncing: true, syncError: null }));
    
    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences: {
          ...preferences,
          lastSyncedAt: new Date(),
          version: (preferences.version || 0) + 1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Server sync failed: ${response.status}`);
    }

    syncState.update(state => ({
      ...state,
      isSyncing: false,
      lastSyncedAt: new Date(),
      pendingChanges: false
    }));

    return true;
  } catch (error) {
    console.error('Failed to sync preferences to server:', error);
    syncState.update(state => ({
      ...state,
      isSyncing: false,
      syncError: error instanceof Error ? error.message : 'Sync failed',
      pendingChanges: true
    }));
    return false;
  }
}

async function loadPreferencesFromServer(): Promise<Preferences | null> {
  if (!browser) return null;
  
  try {
    const response = await fetch('/api/user/preferences');
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.preferences;
  } catch (error) {
    console.error('Failed to load preferences from server:', error);
    return null;
  }
}

// Enhanced Preferences Store with server sync
function createPreferencesStore() {
  const stored = browser ? localStorage.getItem('lofi-preferences') : null;
  const initial = stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
  
  const { subscribe, set, update } = writable<Preferences>(initial);
  
  // Debounced sync to avoid excessive server calls
  let syncTimeout: NodeJS.Timeout | null = null;
  
  function debouncedSync(prefs: Preferences) {
    if (syncTimeout) clearTimeout(syncTimeout);
    
    syncTimeout = setTimeout(async () => {
      // Check if user is authenticated before syncing
      let isAuthenticated = false;
      authState.subscribe(auth => { isAuthenticated = auth.isSignedIn })();
      
      if (isAuthenticated) {
        await syncPreferencesToServer(prefs);
      }
    }, 1000); // 1 second debounce
  }
  
  return {
    subscribe,
    set: (value: Preferences) => {
      if (browser) {
        localStorage.setItem('lofi-preferences', JSON.stringify(value));
        debouncedSync(value);
      }
      set(value);
    },
    update: (updater: (value: Preferences) => Preferences) => {
      update((value) => {
        const newValue = updater(value);
        if (browser) {
          localStorage.setItem('lofi-preferences', JSON.stringify(newValue));
          debouncedSync(newValue);
        }
        return newValue;
      });
    },
    // Manually trigger server sync
    sync: async () => {
      let currentPrefs: Preferences;
      subscribe(prefs => { currentPrefs = prefs })();
      return await syncPreferencesToServer(currentPrefs!);
    },
    // Load from server and merge with local
    loadFromServer: async () => {
      const serverPrefs = await loadPreferencesFromServer();
      if (serverPrefs) {
        const merged = { ...defaultPreferences, ...serverPrefs };
        set(merged);
        if (browser) {
          localStorage.setItem('lofi-preferences', JSON.stringify(merged));
        }
      }
    }
  };
}

export const preferences = createPreferencesStore();

// Player State
export const playerState = writable<PlayerState>({
  isPlaying: false,
  currentTrack: null,
  currentVoice: null,
  isDucking: false,
  musicVolume: 0.7,
  activeEffects: []
});

// Derived stores
export const availableTopicsForUser = derived(
  [user],
  ([$user]) => {
    return AVAILABLE_TOPICS.filter(topic => 
      !topic.isPro || $user.plan === 'pro'
    );
  }
);

export const enabledTopicsForUser = derived(
  [preferences, user],
  ([$preferences, $user]) => {
    return $preferences.enabledTopics.filter(topicId => {
      const topic = AVAILABLE_TOPICS.find(t => t.id === topicId);
      return topic && (!topic.isPro || $user.plan === 'pro');
    });
  }
);

export const upcomingClips = derived(
  [queue, queuePosition],
  ([$queue, $queuePosition]) => {
    return $queue.slice($queuePosition);
  }
);

// Helper functions
export function addClipToQueue(clip: ClipMeta) {
  queue.update(q => [...q, clip]);
}

export function removeClipFromQueue(clipId: string) {
  queue.update(q => q.filter(c => c.id !== clipId));
}

export function reorderQueue(fromIndex: number, toIndex: number) {
  queue.update(q => {
    const newQueue = [...q];
    const [removed] = newQueue.splice(fromIndex, 1);
    newQueue.splice(toIndex, 0, removed);
    return newQueue;
  });
}

export function skipToNextClip() {
  queuePosition.update(pos => pos + 1);
}

export function toggleTopic(topicId: string) {
  preferences.update(prefs => {
    const enabled = prefs.enabledTopics.includes(topicId);
    return {
      ...prefs,
      enabledTopics: enabled
        ? prefs.enabledTopics.filter(id => id !== topicId)
        : [...prefs.enabledTopics, topicId]
    };
  });
}

export function setVolume(channel: keyof Preferences['volumes'], value: number) {
  preferences.update(prefs => ({
    ...prefs,
    volumes: {
      ...prefs.volumes,
      [channel]: Math.max(0, Math.min(1, value))
    }
  }));
}

export function toggleEffect(effectId: string) {
  playerState.update(state => ({
    ...state,
    activeEffects: state.activeEffects.includes(effectId)
      ? state.activeEffects.filter(id => id !== effectId)
      : [...state.activeEffects, effectId]
  }));
}

// Subscription Management
export interface SubscriptionStatus {
  id: string | null;
  customerId: string | null;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  priceId: string | null;
  lastPaymentStatus: 'succeeded' | 'failed' | null;
  isLoading: boolean;
  error: string | null;
}

const defaultSubscriptionStatus: SubscriptionStatus = {
  id: null,
  customerId: null,
  status: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEnd: null,
  priceId: null,
  lastPaymentStatus: null,
  isLoading: false,
  error: null
};

// Subscription Store
function createSubscriptionStore() {
  const { subscribe, set, update } = writable<SubscriptionStatus>(defaultSubscriptionStatus);

  return {
    subscribe,
    set,
    update,
    
    // Load subscription status from server
    async loadSubscriptionStatus(): Promise<void> {
      update(state => ({ ...state, isLoading: true, error: null }));
      
      try {
        const response = await fetch('/api/v1/user/subscription', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to load subscription status');
        }

        const data = await response.json();
        
        set({
          id: data.subscriptionId,
          customerId: data.customerId,
          status: data.status,
          currentPeriodStart: data.currentPeriodStart ? new Date(data.currentPeriodStart) : null,
          currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
          trialEnd: data.trialEnd ? new Date(data.trialEnd) : null,
          priceId: data.priceId,
          lastPaymentStatus: data.lastPaymentStatus,
          isLoading: false,
          error: null
        });

        // Update user plan based on subscription status
        if (data.status === 'active' || data.status === 'trialing') {
          (user as any).updatePlan('pro');
        } else {
          (user as any).updatePlan('free');
        }

      } catch (error) {
        console.error('Failed to load subscription status:', error);
        update(state => ({ 
          ...state, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Failed to load subscription' 
        }));
      }
    },

    // Update subscription status (called from webhook or after payment)
    updateStatus(newStatus: Partial<SubscriptionStatus>): void {
      update(state => ({ ...state, ...newStatus }));
      
      // Sync user plan with subscription status
      if (newStatus.status === 'active' || newStatus.status === 'trialing') {
        (user as any).updatePlan('pro');
      } else if (newStatus.status === 'canceled' || newStatus.status === 'past_due') {
        (user as any).updatePlan('free');
      }
    },

    // Check if subscription is active
    isActive(): boolean {
      let currentStatus: SubscriptionStatus;
      subscribe(status => { currentStatus = status; })();
      return currentStatus.status === 'active' || currentStatus.status === 'trialing';
    },

    // Reset subscription status
    reset(): void {
      set(defaultSubscriptionStatus);
    }
  };
}

export const subscription = createSubscriptionStore();

// Real-time subscription sync
let subscriptionSyncInterval: NodeJS.Timeout | null = null;

export function startSubscriptionSync() {
  if (subscriptionSyncInterval) {
    clearInterval(subscriptionSyncInterval);
  }

  // Poll subscription status every 5 minutes
  subscriptionSyncInterval = setInterval(() => {
    subscription.loadSubscriptionStatus();
  }, 5 * 60 * 1000);
}

export function stopSubscriptionSync() {
  if (subscriptionSyncInterval) {
    clearInterval(subscriptionSyncInterval);
    subscriptionSyncInterval = null;
  }
}

// Enhanced user store with subscription management
const originalUser = user;

// Track logout state to prevent infinite recursion
let isLoggingOut = false;

// Override user store methods
function enhanceUserStore(originalStore: any) {
  return {
    ...originalStore,
    
    // Update user plan and sync subscription
    updatePlan(newPlan: 'free' | 'pro'): void {
      originalStore.update((userData: User) => ({ ...userData, plan: newPlan }));
    },

    // Check if user has pro features
    hasPro(): boolean {
      let currentUser: User;
      originalStore.subscribe((u: User) => { currentUser = u; })();
      return currentUser.plan === 'pro';
    },

    // Get subscription-aware topics
    getAvailableTopics(): TopicInfo[] {
      const hasPro = this.hasPro();
      return AVAILABLE_TOPICS.filter(topic => !topic.isPro || hasPro);
    },

    // Initialize user with subscription sync
    async initialize(): Promise<void> {
      if (isLoggingOut) return; // Don't initialize if logout is in progress
      await originalStore.loadFromServer();
      await subscription.loadSubscriptionStatus();
      startSubscriptionSync();
    },

    // Cleanup on logout
    logout(): void {
      if (isLoggingOut) return; // Prevent infinite recursion
      isLoggingOut = true;
      
      try {
        originalStore.logout();
        subscription.reset();
        stopSubscriptionSync();
      } finally {
        isLoggingOut = false;
      }
    }
  };
}

// Apply enhancements to user store
Object.assign(user, enhanceUserStore(user));

// Derived store for pro features
export const isProUser = derived(
  [user, subscription],
  ([$user, $subscription]) => {
    return $user.plan === 'pro' && ($subscription.status === 'active' || $subscription.status === 'trialing');
  }
);

// Derived store for subscription alerts
export const subscriptionAlerts = derived(
  subscription,
  ($subscription) => {
    const alerts = [];
    
    if ($subscription.status === 'trialing') {
      const daysLeft = $subscription.trialEnd ? Math.ceil((new Date($subscription.trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;
      if (daysLeft <= 3) {
        alerts.push({
          type: 'warning',
          message: `Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
          action: 'upgrade'
        });
      }
    }
    
    if ($subscription.status === 'past_due') {
      alerts.push({
        type: 'error',
        message: 'Your payment is past due. Please update your payment method.',
        action: 'update_payment'
      });
    }
    
    if ($subscription.cancelAtPeriodEnd) {
      alerts.push({
        type: 'info',
        message: 'Your subscription will cancel at the end of the current period.',
        action: 'reactivate'
      });
    }
    
    return alerts;
  }
);

// Browser-only initialization
if (browser) {
  // Initialize subscription sync when user is authenticated
  authState.subscribe(auth => {
    if (auth.isSignedIn) {
      (user as any).initialize();
    } else {
      (user as any).logout();
    }
  });
} 