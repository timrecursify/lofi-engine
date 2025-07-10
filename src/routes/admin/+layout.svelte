<script lang="ts">
  import { page } from '$app/stores'
  import { authState } from '$lib/auth'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { trackEvent, AnalyticsEvent } from '$lib/services/analytics'

  // Check admin access
  onMount(() => {
    if (!$authState.isSignedIn || $authState.user?.publicMetadata?.role !== 'super-admin') {
      goto('/')
      return
    }

    // Track admin access
    trackEvent(AnalyticsEvent.ADMIN_DASHBOARD_VIEWED, {
      user_role: $authState.user?.publicMetadata?.role,
      user_id: $authState.user?.id
    })
  })

  $: currentPath = $page.url.pathname

  const navItems = [
    {
      href: '/admin',
      label: 'Dashboard',
      icon: 'home',
      description: 'System overview and metrics'
    },
    {
      href: '/admin/content',
      label: 'Content',
      icon: 'music-note',
      description: 'Manage clips and sources'
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: 'users',
      description: 'User management and support'
    },
    {
      href: '/admin/health',
      label: 'Health',
      icon: 'shield-check',
      description: 'System health monitoring'
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      icon: 'chart-bar',
      description: 'Usage analytics and insights'
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: 'cog',
      description: 'Feature flags and configuration'
    }
  ]

  function isActivePath(href: string): boolean {
    if (href === '/admin') {
      return currentPath === '/admin'
    }
    return currentPath.startsWith(href)
  }
</script>

<svelte:head>
  <title>Admin Dashboard</title>
</svelte:head>

<div class="admin-layout">
  <!-- Sidebar Navigation -->
  <nav class="admin-sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <Icon name="shield-check" class="w-8 h-8 text-blue-400" />
        <div>
          <h1 class="text-lg font-bold text-white">Admin Panel</h1>
          <p class="text-xs text-gray-400">ChillCast.fm</p>
        </div>
      </div>
    </div>

    <div class="sidebar-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-item {isActivePath(item.href) ? 'active' : ''}"
          data-sveltekit-preload-data
        >
          <Icon name={item.icon} class="w-5 h-5" />
          <div class="nav-content">
            <span class="nav-label">{item.label}</span>
            <span class="nav-description">{item.description}</span>
          </div>
        </a>
      {/each}
    </div>

    <div class="sidebar-footer">
      <a
        href="/"
        class="footer-link"
        data-sveltekit-preload-data
      >
        <Icon name="arrow-left" class="w-4 h-4" />
        Back to App
      </a>
      
      <div class="user-info">
        <div class="user-avatar">
          {#if $authState.user?.imageUrl}
            <img src={$authState.user.imageUrl} alt="Profile" class="w-8 h-8 rounded-full" />
          {:else}
            <Icon name="user" class="w-5 h-5 text-gray-400" />
          {/if}
        </div>
        <div class="user-details">
          <p class="text-sm font-medium text-white">{$authState.user?.firstName} {$authState.user?.lastName}</p>
          <p class="text-xs text-gray-400">Super Admin</p>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="admin-main">
    <slot />
  </main>
</div>

<style>
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: #0f172a;
  }

  .admin-sidebar {
    width: 280px;
    background: #1e293b;
    border-right: 1px solid #334155;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid #334155;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sidebar-nav {
    flex: 1;
    padding: 1rem 0;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    color: #94a3b8;
    text-decoration: none;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
  }

  .nav-item:hover {
    background: #334155;
    color: #e2e8f0;
  }

  .nav-item.active {
    background: #1e40af;
    color: white;
    border-left-color: #3b82f6;
  }

  .nav-content {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .nav-label {
    font-weight: 500;
    font-size: 0.875rem;
  }

  .nav-description {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  .sidebar-footer {
    padding: 1.5rem;
    border-top: 1px solid #334155;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .footer-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #94a3b8;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s ease;
  }

  .footer-link:hover {
    color: #e2e8f0;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 2rem;
    height: 2rem;
    background: #374151;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-details {
    flex: 1;
  }

  .admin-main {
    flex: 1;
    overflow: auto;
  }

  @media (max-width: 768px) {
    .admin-sidebar {
      position: fixed;
      left: -280px;
      top: 0;
      height: 100vh;
      z-index: 50;
      transition: left 0.3s ease;
    }

    .admin-sidebar.open {
      left: 0;
    }

    .admin-main {
      width: 100%;
    }
  }
</style> 