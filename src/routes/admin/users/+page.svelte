<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Icon from '$lib/components/Icon.svelte';

  interface User {
    id: string;
    email: string;
    name?: string;
    plan: 'free' | 'pro';
    status: 'active' | 'banned' | 'suspended';
    emailVerified: boolean;
    createdAt: string;
    lastSeenAt?: string;
    subscription?: {
      id: string;
      status: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    };
    stats: {
      totalPlays: number;
      totalSessions: number;
      favoriteTopics: string[];
    };
  }

  let users: User[] = [];
  let filteredUsers: User[] = [];
  let loading = true;
  let error: string | null = null;
  
  // Filters and pagination
  let searchTerm = '';
  let planFilter = 'all'; // all, free, pro
  let statusFilter = 'all'; // all, active, banned, suspended
  let sortBy = 'createdAt'; // createdAt, lastSeenAt, email, plan
  let sortOrder: 'asc' | 'desc' = 'desc';
  let currentPage = 1;
  let pageSize = 20;
  let totalUsers = 0;

  // Modal states
  let selectedUser: User | null = null;
  let showUserModal = false;
  let showBanModal = false;
  let showSubscriptionModal = false;
  let showNotesModal = false;
  let actionLoading = false;

  // Form states
  let banReason = '';
  let subscriptionOverride = {
    plan: 'pro',
    expiresAt: '',
    reason: ''
  };
  let userNotes = '';

  // Load users from API
  async function loadUsers() {
    try {
      loading = true;
      error = null;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
        plan: planFilter,
        status: statusFilter,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/v1/admin/users?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        users = result.data.users;
        totalUsers = result.data.total;
        applyFilters();
      } else {
        throw new Error(result.error || 'Failed to load users');
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  // Apply local filters
  function applyFilters() {
    filteredUsers = users.filter(user => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matches = 
          user.email.toLowerCase().includes(searchLower) ||
          user.name?.toLowerCase().includes(searchLower) ||
          user.id.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      // Plan filter
      if (planFilter !== 'all' && user.plan !== planFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;

      return true;
    });

    // Sort
    filteredUsers.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'email':
          aVal = a.email;
          bVal = b.email;
          break;
        case 'plan':
          aVal = a.plan;
          bVal = b.plan;
          break;
        case 'lastSeenAt':
          aVal = a.lastSeenAt || '1970-01-01';
          bVal = b.lastSeenAt || '1970-01-01';
          break;
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }

  // User actions
  async function banUser(userId: string, reason: string) {
    try {
      actionLoading = true;
      
      const response = await fetch(`/api/v1/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        await loadUsers();
        showBanModal = false;
        banReason = '';
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to ban user');
      }
    } catch (err) {
      console.error('Failed to ban user:', err);
      error = err instanceof Error ? err.message : 'Failed to ban user';
    } finally {
      actionLoading = false;
    }
  }

  async function unbanUser(userId: string) {
    try {
      actionLoading = true;
      
      const response = await fetch(`/api/v1/admin/users/${userId}/unban`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadUsers();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to unban user');
      }
    } catch (err) {
      console.error('Failed to unban user:', err);
      error = err instanceof Error ? err.message : 'Failed to unban user';
    } finally {
      actionLoading = false;
    }
  }

  async function updateSubscription(userId: string, override: any) {
    try {
      actionLoading = true;
      
      const response = await fetch(`/api/v1/admin/users/${userId}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(override)
      });

      if (response.ok) {
        await loadUsers();
        showSubscriptionModal = false;
        subscriptionOverride = { plan: 'pro', expiresAt: '', reason: '' };
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update subscription');
      }
    } catch (err) {
      console.error('Failed to update subscription:', err);
      error = err instanceof Error ? err.message : 'Failed to update subscription';
    } finally {
      actionLoading = false;
    }
  }

  async function resetTrial(userId: string) {
    try {
      actionLoading = true;
      
      const response = await fetch(`/api/v1/admin/users/${userId}/reset-trial`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadUsers();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reset trial');
      }
    } catch (err) {
      console.error('Failed to reset trial:', err);
      error = err instanceof Error ? err.message : 'Failed to reset trial';
    } finally {
      actionLoading = false;
    }
  }

  async function impersonateUser(userId: string) {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/impersonate`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Redirect to main app as the impersonated user
          window.location.href = '/?impersonating=' + userId;
        }
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to impersonate user');
      }
    } catch (err) {
      console.error('Failed to impersonate user:', err);
      error = err instanceof Error ? err.message : 'Failed to impersonate user';
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#1DB954';
      case 'banned': return '#FF6B6B';
      case 'suspended': return '#FFA500';
      default: return '#888888';
    }
  }

  function getPlanColor(plan: string): string {
    return plan === 'pro' ? '#1DB954' : '#888888';
  }

  // Handle filter changes
  function handleFilterChange() {
    currentPage = 1;
    loadUsers();
  }

  // Handle pagination
  function goToPage(page: number) {
    currentPage = page;
    loadUsers();
  }

  function openUserModal(user: User) {
    selectedUser = user;
    showUserModal = true;
  }

  function openBanModal(user: User) {
    selectedUser = user;
    banReason = '';
    showBanModal = true;
  }

  function openSubscriptionModal(user: User) {
    selectedUser = user;
    subscriptionOverride = {
      plan: user.plan === 'pro' ? 'free' : 'pro',
      expiresAt: '',
      reason: ''
    };
    showSubscriptionModal = true;
  }

  onMount(() => {
    loadUsers();
  });

  // Reactive statements for filtering
  $: if (searchTerm || planFilter || statusFilter || sortBy || sortOrder) {
    handleFilterChange();
  }

  $: totalPages = Math.ceil(totalUsers / pageSize);
</script>

<div class="user-management">
  <!-- Header -->
  <div class="dashboard-header">
    <div class="header-left">
      <h1 class="dashboard-title">User Management</h1>
      <p class="dashboard-subtitle">{totalUsers} total users</p>
    </div>
    
    <div class="header-actions">
      <button class="refresh-btn" on:click={loadUsers} disabled={loading}>
        <Icon name="refresh-cw" size={16} class={loading ? 'spinning' : ''} />
        Refresh
      </button>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters-section">
    <div class="search-box">
      <Icon name="search" size={16} />
      <input
        type="text"
        placeholder="Search users by email, name, or ID..."
        bind:value={searchTerm}
        class="search-input"
      />
    </div>

    <div class="filter-controls">
      <select bind:value={planFilter} class="filter-select">
        <option value="all">All Plans</option>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>

      <select bind:value={statusFilter} class="filter-select">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="banned">Banned</option>
        <option value="suspended">Suspended</option>
      </select>

      <select bind:value={sortBy} class="filter-select">
        <option value="createdAt">Created Date</option>
        <option value="lastSeenAt">Last Seen</option>
        <option value="email">Email</option>
        <option value="plan">Plan</option>
      </select>

      <button
        class="sort-order-btn"
        on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
      >
        <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={16} />
      </button>
    </div>
  </div>

  {#if error}
    <div class="error-message">
      <Icon name="alert-circle" size={20} />
      <span>Error: {error}</span>
      <button on:click={loadUsers} class="retry-btn">Retry</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading-state">
      <Icon name="loader" size={24} class="spinning" />
      <span>Loading users...</span>
    </div>
  {:else if filteredUsers.length === 0}
    <div class="empty-state">
      <Icon name="users" size={48} />
      <h3>No users found</h3>
      <p>Try adjusting your search criteria or filters.</p>
    </div>
  {:else}
    <!-- Users Table -->
    <div class="users-table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Created</th>
            <th>Last Seen</th>
            <th>Stats</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredUsers as user}
            <tr class="user-row">
              <td class="user-info">
                <div class="user-details">
                  <div class="user-primary">
                    <span class="user-email">{user.email}</span>
                    {#if !user.emailVerified}
                      <Icon name="alert-triangle" size={14} color="#FFA500" />
                    {/if}
                  </div>
                  {#if user.name}
                    <div class="user-name">{user.name}</div>
                  {/if}
                  <div class="user-id">{user.id}</div>
                </div>
              </td>
              
              <td class="user-plan">
                <span class="plan-badge" style="color: {getPlanColor(user.plan)}">
                  {user.plan.toUpperCase()}
                </span>
                {#if user.subscription}
                  <div class="subscription-info">
                    <span class="subscription-status">{user.subscription.status}</span>
                    {#if user.subscription.cancelAtPeriodEnd}
                      <span class="cancel-notice">Canceling</span>
                    {/if}
                  </div>
                {/if}
              </td>
              
              <td class="user-status">
                <span class="status-badge" style="color: {getStatusColor(user.status)}">
                  {user.status.toUpperCase()}
                </span>
              </td>
              
              <td class="created-date">
                {formatDate(user.createdAt)}
              </td>
              
              <td class="last-seen">
                {user.lastSeenAt ? formatDate(user.lastSeenAt) : 'Never'}
              </td>
              
              <td class="user-stats">
                <div class="stat-item">
                  <Icon name="play" size={12} />
                  {user.stats.totalPlays}
                </div>
                <div class="stat-item">
                  <Icon name="clock" size={12} />
                  {user.stats.totalSessions}
                </div>
              </td>
              
              <td class="user-actions">
                <div class="action-buttons">
                  <button
                    class="action-btn view"
                    on:click={() => openUserModal(user)}
                    title="View details"
                  >
                    <Icon name="eye" size={14} />
                  </button>
                  
                  <button
                    class="action-btn subscription"
                    on:click={() => openSubscriptionModal(user)}
                    title="Manage subscription"
                  >
                    <Icon name="credit-card" size={14} />
                  </button>
                  
                  {#if user.status === 'active'}
                    <button
                      class="action-btn ban"
                      on:click={() => openBanModal(user)}
                      title="Ban user"
                    >
                      <Icon name="user-x" size={14} />
                    </button>
                  {:else if user.status === 'banned'}
                    <button
                      class="action-btn unban"
                      on:click={() => unbanUser(user.id)}
                      title="Unban user"
                      disabled={actionLoading}
                    >
                      <Icon name="user-check" size={14} />
                    </button>
                  {/if}
                  
                  <button
                    class="action-btn impersonate"
                    on:click={() => impersonateUser(user.id)}
                    title="Impersonate user"
                  >
                    <Icon name="external-link" size={14} />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pagination">
        <button
          class="page-btn"
          disabled={currentPage === 1}
          on:click={() => goToPage(currentPage - 1)}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        
        {#each Array(Math.min(5, totalPages)) as _, i}
          {@const page = Math.max(1, currentPage - 2) + i}
          {#if page <= totalPages}
            <button
              class="page-btn"
              class:active={page === currentPage}
              on:click={() => goToPage(page)}
            >
              {page}
            </button>
          {/if}
        {/each}
        
        <button
          class="page-btn"
          disabled={currentPage === totalPages}
          on:click={() => goToPage(currentPage + 1)}
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    {/if}
  {/if}
</div>

<!-- User Details Modal -->
{#if showUserModal && selectedUser}
  <div class="modal-overlay" on:click={() => showUserModal = false}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>User Details</h3>
        <button class="close-btn" on:click={() => showUserModal = false}>
          <Icon name="x" size={20} />
        </button>
      </div>
      
      <div class="modal-content">
        <div class="user-detail-grid">
          <div class="detail-section">
            <h4>Basic Information</h4>
            <div class="detail-item">
              <span class="label">ID:</span>
              <span class="value">{selectedUser.id}</span>
            </div>
            <div class="detail-item">
              <span class="label">Email:</span>
              <span class="value">{selectedUser.email}</span>
            </div>
            {#if selectedUser.name}
              <div class="detail-item">
                <span class="label">Name:</span>
                <span class="value">{selectedUser.name}</span>
              </div>
            {/if}
            <div class="detail-item">
              <span class="label">Plan:</span>
              <span class="value plan">{selectedUser.plan.toUpperCase()}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="value status">{selectedUser.status.toUpperCase()}</span>
            </div>
          </div>

          <div class="detail-section">
            <h4>Activity</h4>
            <div class="detail-item">
              <span class="label">Created:</span>
              <span class="value">{formatDate(selectedUser.createdAt)}</span>
            </div>
            <div class="detail-item">
              <span class="label">Last Seen:</span>
              <span class="value">
                {selectedUser.lastSeenAt ? formatDate(selectedUser.lastSeenAt) : 'Never'}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">Total Plays:</span>
              <span class="value">{selectedUser.stats.totalPlays}</span>
            </div>
            <div class="detail-item">
              <span class="label">Sessions:</span>
              <span class="value">{selectedUser.stats.totalSessions}</span>
            </div>
          </div>
        </div>

        {#if selectedUser.subscription}
          <div class="detail-section">
            <h4>Subscription</h4>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span class="value">{selectedUser.subscription.status}</span>
            </div>
            <div class="detail-item">
              <span class="label">Current Period End:</span>
              <span class="value">{formatDate(selectedUser.subscription.currentPeriodEnd)}</span>
            </div>
            <div class="detail-item">
              <span class="label">Cancel at Period End:</span>
              <span class="value">{selectedUser.subscription.cancelAtPeriodEnd ? 'Yes' : 'No'}</span>
            </div>
          </div>
        {/if}

        <div class="modal-actions">
          <button class="action-btn-modal reset-trial" on:click={() => resetTrial(selectedUser.id)}>
            Reset Trial
          </button>
          <button class="action-btn-modal impersonate" on:click={() => impersonateUser(selectedUser.id)}>
            Impersonate User
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Ban User Modal -->
{#if showBanModal && selectedUser}
  <div class="modal-overlay" on:click={() => showBanModal = false}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Ban User</h3>
        <button class="close-btn" on:click={() => showBanModal = false}>
          <Icon name="x" size={20} />
        </button>
      </div>
      
      <div class="modal-content">
        <p>Are you sure you want to ban <strong>{selectedUser.email}</strong>?</p>
        
        <div class="form-group">
          <label for="ban-reason">Reason for ban:</label>
          <textarea
            id="ban-reason"
            bind:value={banReason}
            placeholder="Enter reason for banning this user..."
            class="form-textarea"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => showBanModal = false}>
            Cancel
          </button>
          <button 
            class="btn-danger" 
            on:click={() => banUser(selectedUser.id, banReason)}
            disabled={actionLoading || !banReason.trim()}
          >
            {actionLoading ? 'Banning...' : 'Ban User'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Subscription Override Modal -->
{#if showSubscriptionModal && selectedUser}
  <div class="modal-overlay" on:click={() => showSubscriptionModal = false}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Manage Subscription</h3>
        <button class="close-btn" on:click={() => showSubscriptionModal = false}>
          <Icon name="x" size={20} />
        </button>
      </div>
      
      <div class="modal-content">
        <p>Manage subscription for <strong>{selectedUser.email}</strong></p>
        
        <div class="form-group">
          <label for="plan-override">Plan:</label>
          <select id="plan-override" bind:value={subscriptionOverride.plan} class="form-select">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>

        <div class="form-group">
          <label for="expires-at">Expires At (leave empty for permanent):</label>
          <input
            id="expires-at"
            type="datetime-local"
            bind:value={subscriptionOverride.expiresAt}
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label for="subscription-reason">Reason:</label>
          <textarea
            id="subscription-reason"
            bind:value={subscriptionOverride.reason}
            placeholder="Enter reason for subscription change..."
            class="form-textarea"
          ></textarea>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => showSubscriptionModal = false}>
            Cancel
          </button>
          <button 
            class="btn-primary" 
            on:click={() => updateSubscription(selectedUser.id, subscriptionOverride)}
            disabled={actionLoading || !subscriptionOverride.reason.trim()}
          >
            {actionLoading ? 'Updating...' : 'Update Subscription'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .user-management {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .dashboard-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--color-secondary);
    margin: 0 0 0.5rem 0;
  }

  .dashboard-subtitle {
    color: var(--color-muted);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    border-color: var(--color-primary);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .filters-section {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 300px;
  }

  .search-box :global(svg) {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted);
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem 0.5rem 2.5rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .filter-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .filter-select {
    padding: 0.5rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .sort-order-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sort-order-btn:hover {
    border-color: var(--color-primary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 107, 107, 0.1);
    border: 2px solid #FF6B6B;
    border-radius: 0.5rem;
    color: #FF6B6B;
    margin-bottom: 1.5rem;
  }

  .retry-btn {
    padding: 0.25rem 0.75rem;
    background: #FF6B6B;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: var(--color-muted);
    text-align: center;
  }

  .empty-state h3 {
    margin: 0;
    color: var(--color-secondary);
  }

  .users-table-container {
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.75rem;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
  }

  .users-table th {
    background: var(--color-bg);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-secondary);
    border-bottom: 2px solid var(--color-accent);
  }

  .users-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--color-accent);
  }

  .user-row:hover {
    background: rgba(29, 185, 84, 0.05);
  }

  .user-info {
    min-width: 200px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .user-primary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .user-email {
    font-weight: 600;
    color: var(--color-secondary);
  }

  .user-name {
    font-size: 0.875rem;
    color: var(--color-muted);
  }

  .user-id {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-family: monospace;
  }

  .plan-badge, .status-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: rgba(255, 255, 255, 0.1);
  }

  .subscription-info {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin-top: 0.25rem;
  }

  .cancel-notice {
    color: #FFA500;
    font-weight: 600;
  }

  .user-stats {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 0.25rem;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .action-btn.ban:hover {
    border-color: #FF6B6B;
    color: #FF6B6B;
  }

  .action-btn.unban:hover {
    border-color: #1DB954;
    color: #1DB954;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    align-items: center;
  }

  .page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--color-primary);
  }

  .page-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.75rem;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 2px solid var(--color-accent);
  }

  .modal-header h3 {
    margin: 0;
    color: var(--color-secondary);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
  }

  .close-btn:hover {
    color: var(--color-secondary);
  }

  .modal-content {
    padding: 1.5rem;
  }

  .user-detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .detail-section {
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .detail-section h4 {
    margin: 0 0 1rem 0;
    color: var(--color-primary);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .detail-item:last-child {
    margin-bottom: 0;
  }

  .detail-item .label {
    color: var(--color-muted);
  }

  .detail-item .value {
    color: var(--color-secondary);
    font-weight: 500;
  }

  .detail-item .value.plan {
    color: var(--color-primary);
  }

  .detail-item .value.status {
    color: var(--color-primary);
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-secondary);
    font-weight: 600;
    font-size: 0.875rem;
  }

  .form-input, .form-select, .form-textarea {
    width: 100%;
    padding: 0.5rem;
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
  }

  .form-textarea {
    min-height: 80px;
    resize: vertical;
  }

  .form-input:focus, .form-select:focus, .form-textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .btn-primary, .btn-secondary, .btn-danger, .action-btn-modal {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid;
  }

  .btn-primary {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .btn-secondary {
    background: var(--color-surface);
    border-color: var(--color-accent);
    color: var(--color-secondary);
  }

  .btn-secondary:hover {
    border-color: var(--color-primary);
  }

  .btn-danger {
    background: #FF6B6B;
    border-color: #FF6B6B;
    color: white;
  }

  .btn-danger:hover {
    background: #FF5252;
    border-color: #FF5252;
  }

  .action-btn-modal {
    background: var(--color-bg);
    border-color: var(--color-accent);
    color: var(--color-secondary);
  }

  .action-btn-modal:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .btn-primary:disabled, .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.spinning) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .filters-section {
      flex-direction: column;
      align-items: stretch;
    }

    .search-box {
      min-width: unset;
    }

    .filter-controls {
      justify-content: space-between;
    }

    .users-table-container {
      overflow-x: auto;
    }

    .users-table {
      min-width: 800px;
    }

    .user-detail-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
    }

    .modal-actions {
      flex-direction: column-reverse;
    }
  }
</style> 