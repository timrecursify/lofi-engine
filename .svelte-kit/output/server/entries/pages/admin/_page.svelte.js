import{c as n,v as s}from"../../../chunks/index3.js";import{I as a}from"../../../chunks/Icon.js";const l={code:".admin-dashboard.svelte-snwa2o.svelte-snwa2o{max-width:1200px;margin:0 auto}.dashboard-header.svelte-snwa2o.svelte-snwa2o{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;padding-bottom:1rem;border-bottom:1px solid var(--color-border, #333)}.header-content.svelte-snwa2o.svelte-snwa2o{flex:1}.dashboard-title.svelte-snwa2o.svelte-snwa2o{font-size:2rem;font-weight:700;color:var(--color-text, #ffffff);margin:0 0 0.5rem 0}.dashboard-subtitle.svelte-snwa2o.svelte-snwa2o{color:var(--color-text-secondary, #888);font-size:1rem;margin:0}.header-actions.svelte-snwa2o.svelte-snwa2o{display:flex;gap:1rem}.refresh-btn.svelte-snwa2o.svelte-snwa2o{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:var(--color-primary, #3b82f6);color:white;border:none;border-radius:0.375rem;font-size:0.875rem;cursor:pointer;transition:all 0.2s}.refresh-btn.svelte-snwa2o.svelte-snwa2o:hover{background:var(--color-primary-hover, #2563eb)}.metrics-grid.svelte-snwa2o.svelte-snwa2o{display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem;margin-bottom:3rem}.metric-card.svelte-snwa2o.svelte-snwa2o{background:var(--color-bg-secondary, #1a1a1a);border:1px solid var(--color-border, #333);border-radius:0.5rem;padding:1.5rem;transition:all 0.2s}.metric-card.svelte-snwa2o.svelte-snwa2o:hover{border-color:var(--color-border-hover, #555);transform:translateY(-1px)}.metric-header.svelte-snwa2o.svelte-snwa2o{display:flex;align-items:center;gap:1rem;margin-bottom:1rem}.metric-icon.svelte-snwa2o.svelte-snwa2o{width:48px;height:48px;border-radius:0.5rem;display:flex;align-items:center;justify-content:center;flex-shrink:0}.metric-icon.active-users.svelte-snwa2o.svelte-snwa2o{background:rgba(34, 197, 94, 0.1);color:rgb(34, 197, 94)}.metric-icon.total-users.svelte-snwa2o.svelte-snwa2o{background:rgba(59, 130, 246, 0.1);color:rgb(59, 130, 246)}.metric-icon.clip-pool.svelte-snwa2o.svelte-snwa2o{background:rgba(168, 85, 247, 0.1);color:rgb(168, 85, 247)}.metric-icon.tts-spend.svelte-snwa2o.svelte-snwa2o{background:rgba(239, 68, 68, 0.1);color:rgb(239, 68, 68)}.metric-icon.ad-revenue.svelte-snwa2o.svelte-snwa2o{background:rgba(245, 158, 11, 0.1);color:rgb(245, 158, 11)}.metric-icon.system-health.svelte-snwa2o.svelte-snwa2o{background:rgba(16, 185, 129, 0.1);color:rgb(16, 185, 129)}.metric-info.svelte-snwa2o.svelte-snwa2o{flex:1;min-width:0}.metric-title.svelte-snwa2o.svelte-snwa2o{font-size:0.875rem;font-weight:600;color:var(--color-text, #ffffff);margin:0 0 0.25rem 0}.metric-subtitle.svelte-snwa2o.svelte-snwa2o{font-size:0.75rem;color:var(--color-text-secondary, #888);margin:0}.metric-value.svelte-snwa2o.svelte-snwa2o{display:flex;align-items:baseline;gap:0.5rem}.metric-value.svelte-snwa2o .value.svelte-snwa2o{font-size:1.875rem;font-weight:700;color:var(--color-text, #ffffff)}.metric-value.svelte-snwa2o .unit.svelte-snwa2o{font-size:0.875rem;color:var(--color-text-secondary, #888)}.health-value.svelte-snwa2o.svelte-snwa2o{text-transform:capitalize}.loading-value.svelte-snwa2o.svelte-snwa2o{width:80px;height:32px;background:var(--color-bg-tertiary, #333);border-radius:0.25rem;animation:svelte-snwa2o-pulse 1.5s ease-in-out infinite}@keyframes svelte-snwa2o-pulse{0%,100%{opacity:1}50%{opacity:0.5}}.quick-actions.svelte-snwa2o.svelte-snwa2o{margin-bottom:2rem}.section-title.svelte-snwa2o.svelte-snwa2o{font-size:1.25rem;font-weight:600;color:var(--color-text, #ffffff);margin:0 0 1rem 0}.action-grid.svelte-snwa2o.svelte-snwa2o{display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem}.action-card.svelte-snwa2o.svelte-snwa2o{display:flex;align-items:center;gap:0.75rem;padding:1rem;background:var(--color-bg-secondary, #1a1a1a);border:1px solid var(--color-border, #333);border-radius:0.5rem;color:var(--color-text, #ffffff);font-size:0.875rem;font-weight:500;cursor:pointer;transition:all 0.2s;text-align:left}.action-card.svelte-snwa2o.svelte-snwa2o:hover{background:var(--color-bg-tertiary, #333);border-color:var(--color-border-hover, #555);transform:translateY(-1px)}@media(max-width: 768px){.dashboard-header.svelte-snwa2o.svelte-snwa2o{flex-direction:column;gap:1rem;align-items:stretch}.metrics-grid.svelte-snwa2o.svelte-snwa2o{grid-template-columns:1fr}.action-grid.svelte-snwa2o.svelte-snwa2o{grid-template-columns:1fr}}",map:null},d=n((e,t,o,i)=>{let{data:r}=t;return t.data===void 0&&o.data&&r!==void 0&&o.data(r),e.css.add(l),`<div class="admin-dashboard svelte-snwa2o">
  <header class="dashboard-header svelte-snwa2o"><div class="header-content svelte-snwa2o"><h1 class="dashboard-title svelte-snwa2o">Admin Dashboard</h1>
      <p class="dashboard-subtitle svelte-snwa2o">System overview and management controls
      </p></div>
    
    <div class="header-actions svelte-snwa2o"><button class="refresh-btn svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"refresh",size:16},{},{})}
        Refresh
      </button></div></header>

  
  <div class="metrics-grid svelte-snwa2o">
    <div class="metric-card svelte-snwa2o"><div class="metric-header svelte-snwa2o"><div class="metric-icon active-users svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"users",size:24},{},{})}</div>
        <div class="metric-info svelte-snwa2o"><h3 class="metric-title svelte-snwa2o">Active Users</h3>
          <p class="metric-subtitle svelte-snwa2o">Currently online</p></div></div>
      
      <div class="metric-value svelte-snwa2o"><div class="loading-value svelte-snwa2o"></div></div></div>

    
    <div class="metric-card svelte-snwa2o"><div class="metric-header svelte-snwa2o"><div class="metric-icon total-users svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"user-group",size:24},{},{})}</div>
        <div class="metric-info svelte-snwa2o"><h3 class="metric-title svelte-snwa2o">Total Users</h3>
          <p class="metric-subtitle svelte-snwa2o">All registered</p></div></div>
      
      <div class="metric-value svelte-snwa2o"><div class="loading-value svelte-snwa2o"></div></div></div>

    
    <div class="metric-card svelte-snwa2o"><div class="metric-header svelte-snwa2o"><div class="metric-icon clip-pool svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"music-note",size:24},{},{})}</div>
        <div class="metric-info svelte-snwa2o"><h3 class="metric-title svelte-snwa2o">Clip Pool Depth</h3>
          <p class="metric-subtitle svelte-snwa2o">Ready clips</p></div></div>
      
      <div class="metric-value svelte-snwa2o"><div class="loading-value svelte-snwa2o"></div></div></div>

    
    <div class="metric-card svelte-snwa2o"><div class="metric-header svelte-snwa2o"><div class="metric-icon tts-spend svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"currency-dollar",size:24},{},{})}</div>
        <div class="metric-info svelte-snwa2o"><h3 class="metric-title svelte-snwa2o">TTS Spend</h3>
          <p class="metric-subtitle svelte-snwa2o">This month</p></div></div>
      
      <div class="metric-value svelte-snwa2o"><div class="loading-value svelte-snwa2o"></div></div></div>

    
    <div class="metric-card svelte-snwa2o"><div class="metric-header svelte-snwa2o"><div class="metric-icon ad-revenue svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"chart-bar",size:24},{},{})}</div>
        <div class="metric-info svelte-snwa2o"><h3 class="metric-title svelte-snwa2o">Ad Revenue</h3>
          <p class="metric-subtitle svelte-snwa2o">This month</p></div></div>
      
      <div class="metric-value svelte-snwa2o"><div class="loading-value svelte-snwa2o"></div></div></div>

    
    <div class="metric-card svelte-snwa2o"><div class="metric-header svelte-snwa2o"><div class="metric-icon system-health svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"shield-check",size:24},{},{})}</div>
        <div class="metric-info svelte-snwa2o"><h3 class="metric-title svelte-snwa2o">System Health</h3>
          <p class="metric-subtitle svelte-snwa2o">Overall status</p></div></div>
      
      <div class="metric-value svelte-snwa2o"><div class="loading-value svelte-snwa2o"></div></div></div></div>

  
  <div class="quick-actions svelte-snwa2o"><h2 class="section-title svelte-snwa2o">Quick Actions</h2>
    
    <div class="action-grid svelte-snwa2o"><button class="action-card svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"plus",size:20},{},{})}
        <span>Generate Content</span></button>
      
      <button class="action-card svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"trash",size:20},{},{})}
        <span>Clear Cache</span></button>
      
      <button class="action-card svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"toggle-left",size:20},{},{})}
        <span>Toggle Ads</span></button>
      
      <button class="action-card svelte-snwa2o">${s(a,"Icon").$$render(e,{name:"download",size:20},{},{})}
        <span>Export Logs</span></button></div></div>
</div>`});export{d as default};
