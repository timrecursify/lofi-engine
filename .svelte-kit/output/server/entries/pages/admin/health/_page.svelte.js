import{c as b,o as $,v as a,e,d as y}from"../../../../chunks/index3.js";import{I as l}from"../../../../chunks/Icon.js";const x={code:".health-dashboard.svelte-1kjw32m.svelte-1kjw32m{padding:1.5rem;max-width:1400px;margin:0 auto}.dashboard-header.svelte-1kjw32m.svelte-1kjw32m{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem}.dashboard-title.svelte-1kjw32m.svelte-1kjw32m{font-size:1.875rem;font-weight:700;color:var(--color-secondary);margin:0 0 0.5rem 0}.dashboard-subtitle.svelte-1kjw32m.svelte-1kjw32m{color:var(--color-muted);margin:0}.header-actions.svelte-1kjw32m.svelte-1kjw32m{display:flex;gap:0.75rem}.refresh-btn.svelte-1kjw32m.svelte-1kjw32m{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:var(--color-surface);border:2px solid var(--color-accent);border-radius:0.375rem;color:var(--color-secondary);font-size:0.875rem;cursor:pointer;transition:all 0.2s ease}.refresh-btn.svelte-1kjw32m.svelte-1kjw32m:hover{border-color:var(--color-primary)}.refresh-btn.auto.svelte-1kjw32m.svelte-1kjw32m{background:rgba(29, 185, 84, 0.1);border-color:var(--color-primary)}.refresh-btn.svelte-1kjw32m.svelte-1kjw32m:disabled{opacity:0.5;cursor:not-allowed}.error-message.svelte-1kjw32m.svelte-1kjw32m{display:flex;align-items:center;gap:0.75rem;padding:1rem;background:rgba(255, 107, 107, 0.1);border:2px solid #FF6B6B;border-radius:0.5rem;color:#FF6B6B;margin-bottom:1.5rem}.retry-btn.svelte-1kjw32m.svelte-1kjw32m{padding:0.25rem 0.75rem;background:#FF6B6B;color:white;border:none;border-radius:0.25rem;cursor:pointer;font-size:0.875rem}.loading-state.svelte-1kjw32m.svelte-1kjw32m{display:flex;align-items:center;justify-content:center;gap:0.75rem;padding:3rem;color:var(--color-muted)}.status-overview.svelte-1kjw32m.svelte-1kjw32m{display:grid;grid-template-columns:2fr repeat(3, 1fr);gap:1rem;margin-bottom:2rem}.status-card.svelte-1kjw32m.svelte-1kjw32m{display:flex;align-items:center;gap:1rem;padding:1.5rem;background:var(--color-surface);border:2px solid var(--color-accent);border-radius:0.75rem}.status-card.main-status.svelte-1kjw32m.svelte-1kjw32m{position:relative;flex-direction:column;align-items:flex-start;text-align:left}.status-indicator.svelte-1kjw32m.svelte-1kjw32m{position:absolute;top:1rem;right:1rem;width:12px;height:12px;border-radius:50%}.status-content.svelte-1kjw32m h3.svelte-1kjw32m{font-size:1.125rem;font-weight:600;color:var(--color-secondary);margin:0 0 0.5rem 0}.status-content.svelte-1kjw32m h4.svelte-1kjw32m{font-size:0.875rem;font-weight:600;color:var(--color-muted);margin:0 0 0.25rem 0}.status-value.svelte-1kjw32m.svelte-1kjw32m{font-size:1.5rem;font-weight:700;color:var(--color-primary);margin:0 0 0.25rem 0}.status-detail.svelte-1kjw32m.svelte-1kjw32m{font-size:0.75rem;color:var(--color-muted);margin:0}.metrics-grid.svelte-1kjw32m.svelte-1kjw32m{display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1rem;margin-bottom:2rem}.metric-card.svelte-1kjw32m.svelte-1kjw32m{background:var(--color-surface);border:2px solid var(--color-accent);border-radius:0.75rem;padding:1.5rem}.metric-header.svelte-1kjw32m.svelte-1kjw32m{display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem}.metric-header.svelte-1kjw32m h3.svelte-1kjw32m{font-size:1rem;font-weight:600;color:var(--color-secondary);margin:0}.metric-content.svelte-1kjw32m.svelte-1kjw32m{display:flex;flex-direction:column;gap:0.75rem}.metric-row.svelte-1kjw32m.svelte-1kjw32m{display:flex;justify-content:space-between;align-items:center;font-size:0.875rem}.metric-row.svelte-1kjw32m span.svelte-1kjw32m:first-child{color:var(--color-muted)}.metric-value.svelte-1kjw32m.svelte-1kjw32m{font-weight:600;color:var(--color-secondary)}.alerts-section.svelte-1kjw32m.svelte-1kjw32m{background:var(--color-surface);border:2px solid var(--color-accent);border-radius:0.75rem;padding:1.5rem}.section-header.svelte-1kjw32m.svelte-1kjw32m{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}.section-header.svelte-1kjw32m h3.svelte-1kjw32m{font-size:1.125rem;font-weight:600;color:var(--color-secondary);margin:0}.alert-count.svelte-1kjw32m.svelte-1kjw32m{font-size:0.875rem;color:var(--color-muted);background:var(--color-bg);padding:0.25rem 0.75rem;border-radius:1rem}.no-alerts.svelte-1kjw32m.svelte-1kjw32m{text-align:center;padding:2rem}.no-alerts.svelte-1kjw32m h4.svelte-1kjw32m{font-size:1.125rem;font-weight:600;color:var(--color-secondary);margin:1rem 0 0.5rem 0}.no-alerts.svelte-1kjw32m p.svelte-1kjw32m{color:var(--color-muted);margin:0}.alerts-list.svelte-1kjw32m.svelte-1kjw32m{display:flex;flex-direction:column;gap:0.75rem}.alert-card.svelte-1kjw32m.svelte-1kjw32m{background:var(--color-bg);border:2px solid var(--color-accent);border-radius:0.5rem;padding:1rem;transition:all 0.2s ease}.alert-card.acknowledged.svelte-1kjw32m.svelte-1kjw32m{opacity:0.7;border-style:dashed}.alert-header.svelte-1kjw32m.svelte-1kjw32m{display:flex;align-items:flex-start;gap:0.75rem;margin-bottom:0.5rem}.alert-info.svelte-1kjw32m.svelte-1kjw32m{flex:1}.alert-info.svelte-1kjw32m h4.svelte-1kjw32m{font-size:0.875rem;font-weight:600;color:var(--color-secondary);margin:0 0 0.25rem 0}.alert-category.svelte-1kjw32m.svelte-1kjw32m{font-size:0.75rem;color:var(--color-muted);text-transform:capitalize;margin:0}.alert-actions.svelte-1kjw32m.svelte-1kjw32m{display:flex;gap:0.5rem}.alert-action-btn.svelte-1kjw32m.svelte-1kjw32m{display:flex;align-items:center;justify-content:center;width:2rem;height:2rem;background:var(--color-surface);border:1px solid var(--color-accent);border-radius:0.25rem;color:var(--color-muted);cursor:pointer;transition:all 0.2s ease}.alert-action-btn.svelte-1kjw32m.svelte-1kjw32m:hover{border-color:var(--color-primary);color:var(--color-primary)}.alert-message.svelte-1kjw32m.svelte-1kjw32m{font-size:0.875rem;color:var(--color-secondary);margin:0 0 0.5rem 0;line-height:1.4}.alert-meta.svelte-1kjw32m.svelte-1kjw32m{display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--color-muted)}.alert-ack.svelte-1kjw32m.svelte-1kjw32m{background:rgba(29, 185, 84, 0.2);color:var(--color-primary);padding:0.25rem 0.5rem;border-radius:0.25rem}.spinning{animation:svelte-1kjw32m-spin 1s linear infinite}@keyframes svelte-1kjw32m-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@media(max-width: 768px){.status-overview.svelte-1kjw32m.svelte-1kjw32m{grid-template-columns:1fr}.metrics-grid.svelte-1kjw32m.svelte-1kjw32m{grid-template-columns:1fr}.dashboard-header.svelte-1kjw32m.svelte-1kjw32m{flex-direction:column;gap:1rem}}",map:null};function z(t){const j=Math.floor(t/86400),d=Math.floor(t%86400/3600),w=Math.floor(t%3600/60);return j>0?`${j}d ${d}h ${w}m`:d>0?`${d}h ${w}m`:`${w}m`}function p(t){return t<1024?`${t.toFixed(1)} MB`:`${(t/1024).toFixed(1)} GB`}function F(t){switch(t){case"error":return"alert-circle";case"warning":return"alert-triangle";case"info":return"info";default:return"alert-circle"}}function I(t){switch(t){case"critical":return"#FF6B6B";case"high":return"#FF8E53";case"medium":return"#FFA500";case"low":return"#4ECDC4";default:return"#888888"}}const A=b((t,j,d,w)=>{let s=null,o=[],n=!0,k=null,c=null;const m={healthy:"#1DB954",warning:"#FFA500",critical:"#FF6B6B",unknown:"#888888"};function g(){if(!s)return"unknown";const r=o.filter(i=>i.severity==="critical"&&!i.resolved).length,v=o.filter(i=>i.severity==="medium"&&!i.resolved).length;return r>0?"critical":v>0||s.pipeline.successRate<95?"warning":"healthy"}async function h(){try{n=!0,k=null;const[r,v]=await Promise.all([fetch("/api/v1/admin/health"),fetch("/api/v1/admin/health/alerts")]);if(!r.ok)throw new Error(`Health API error: ${r.status}`);if(!v.ok)throw new Error(`Alerts API error: ${v.status}`);const i=await r.json(),u=await v.json();if(i.success)s=i.data.metrics;else throw new Error(i.error||"Failed to load health data");u.success?o=u.data.alerts:(console.warn("Failed to load alerts:",u.error),o=[])}catch(r){console.error("Failed to load health data:",r),k=r instanceof Error?r.message:"Unknown error"}finally{n=!1}}function f(){c&&clearInterval(c),c=setInterval(h,3e4)}return $(()=>{c&&clearInterval(c)}),t.css.add(x),f(),`<div class="health-dashboard svelte-1kjw32m">
  <div class="dashboard-header svelte-1kjw32m"><div class="header-left"><h1 class="dashboard-title svelte-1kjw32m">System Health</h1>
      <p class="dashboard-subtitle svelte-1kjw32m">Real-time monitoring and alerts</p></div>
    
    <div class="header-actions svelte-1kjw32m"><button class="${["refresh-btn svelte-1kjw32m","auto"].join(" ").trim()}" title="Toggle auto-refresh">${a(l,"Icon").$$render(t,{name:"refresh-cw",size:16},{},{})}
        ${e("Auto")}</button>
      
      <button class="refresh-btn svelte-1kjw32m" ${n?"disabled":""} title="Refresh now">${a(l,"Icon").$$render(t,{name:"refresh-cw",size:16,class:n?"spinning":""},{},{})}
        Refresh
      </button></div></div>

  ${k?`<div class="error-message svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"alert-circle",size:20},{},{})}
      <span>Error loading health data: ${e(k)}</span>
      <button class="retry-btn svelte-1kjw32m">Retry</button></div>`:""}

  ${n&&!s?`<div class="loading-state svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"loader",size:24,class:"spinning"},{},{})}
      <span>Loading health data...</span></div>`:`${s?`
    <div class="status-overview svelte-1kjw32m"><div class="status-card main-status svelte-1kjw32m"><div class="status-indicator svelte-1kjw32m" style="${"background-color: "+e(m[g()],!0)}"></div>
        <div class="status-content svelte-1kjw32m"><h3 class="svelte-1kjw32m">System Status</h3>
          <p class="status-value svelte-1kjw32m">${e(g().toUpperCase())}</p>
          <p class="status-detail svelte-1kjw32m">Uptime: ${e(z(s.system.uptime))} | 
            Environment: ${e(s.system.environment)}</p></div></div>

      <div class="status-card svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"zap",size:24,color:m.healthy},{},{})}
        <div class="status-content svelte-1kjw32m"><h4 class="svelte-1kjw32m">Pipeline Success</h4>
          <p class="status-value svelte-1kjw32m">${e(s.pipeline.successRate.toFixed(1))}%</p>
          <p class="status-detail svelte-1kjw32m">${e(s.pipeline.successfulJobs)}/${e(s.pipeline.totalJobs)} jobs</p></div></div>

      <div class="status-card svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"users",size:24,color:m.healthy},{},{})}
        <div class="status-content svelte-1kjw32m"><h4 class="svelte-1kjw32m">Active Users</h4>
          <p class="status-value svelte-1kjw32m">${e(s.performance.activeUsers)}</p>
          <p class="status-detail svelte-1kjw32m">${e(s.performance.totalRequests)} requests</p></div></div>

      <div class="status-card svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"database",size:24,color:m.healthy},{},{})}
        <div class="status-content svelte-1kjw32m"><h4 class="svelte-1kjw32m">Total Clips</h4>
          <p class="status-value svelte-1kjw32m">${e(s.storage.totalClips)}</p>
          <p class="status-detail svelte-1kjw32m">${e(p(s.storage.kvStorageUsed+s.storage.r2StorageUsed))}</p></div></div></div>

    
    <div class="metrics-grid svelte-1kjw32m">
      <div class="metric-card svelte-1kjw32m"><div class="metric-header svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"settings",size:20},{},{})}
          <h3 class="svelte-1kjw32m">Pipeline Health</h3></div>
        <div class="metric-content svelte-1kjw32m"><div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Success Rate</span>
            <span class="metric-value svelte-1kjw32m">${e(s.pipeline.successRate.toFixed(1))}%</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Average Job Time</span>
            <span class="metric-value svelte-1kjw32m">${e(s.pipeline.averageJobTime.toFixed(1))}s</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Jobs in Progress</span>
            <span class="metric-value svelte-1kjw32m">${e(s.pipeline.jobsInProgress)}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Failed Jobs</span>
            <span class="metric-value svelte-1kjw32m">${e(s.pipeline.failedJobs)}</span></div></div></div>

      
      <div class="metric-card svelte-1kjw32m"><div class="metric-header svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"activity",size:20},{},{})}
          <h3 class="svelte-1kjw32m">Performance</h3></div>
        <div class="metric-content svelte-1kjw32m"><div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Response Time</span>
            <span class="metric-value svelte-1kjw32m">${e(s.performance.averageResponseTime)}ms</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Error Rate</span>
            <span class="metric-value svelte-1kjw32m">${e(s.performance.errorRate.toFixed(1))}%</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Active Users</span>
            <span class="metric-value svelte-1kjw32m">${e(s.performance.activeUsers)}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Total Requests</span>
            <span class="metric-value svelte-1kjw32m">${e(s.performance.totalRequests)}</span></div></div></div>

      
      <div class="metric-card svelte-1kjw32m"><div class="metric-header svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"cpu",size:20},{},{})}
          <h3 class="svelte-1kjw32m">Resource Usage</h3></div>
        <div class="metric-content svelte-1kjw32m"><div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">KV Operations</span>
            <span class="metric-value svelte-1kjw32m">${e(s.resources.kvOperations)}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">R2 Operations</span>
            <span class="metric-value svelte-1kjw32m">${e(s.resources.r2Operations)}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">TTS Requests</span>
            <span class="metric-value svelte-1kjw32m">${e(s.resources.ttsRequests)}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">DB Queries</span>
            <span class="metric-value svelte-1kjw32m">${e(s.resources.dbQueries)}</span></div></div></div>

      
      <div class="metric-card svelte-1kjw32m"><div class="metric-header svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"hard-drive",size:20},{},{})}
          <h3 class="svelte-1kjw32m">Storage</h3></div>
        <div class="metric-content svelte-1kjw32m"><div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Total Clips</span>
            <span class="metric-value svelte-1kjw32m">${e(s.storage.totalClips)}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">KV Storage</span>
            <span class="metric-value svelte-1kjw32m">${e(p(s.storage.kvStorageUsed))}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">R2 Storage</span>
            <span class="metric-value svelte-1kjw32m">${e(p(s.storage.r2StorageUsed))}</span></div>
          <div class="metric-row svelte-1kjw32m"><span class="svelte-1kjw32m">Total Storage</span>
            <span class="metric-value svelte-1kjw32m">${e(p(s.storage.kvStorageUsed+s.storage.r2StorageUsed))}</span></div></div></div></div>

    
    <div class="alerts-section svelte-1kjw32m"><div class="section-header svelte-1kjw32m"><h3 class="svelte-1kjw32m">Active Alerts</h3>
        <span class="alert-count svelte-1kjw32m">${e(o.filter(r=>!r.resolved).length)} active</span></div>

      ${o.filter(r=>!r.resolved).length===0?`<div class="no-alerts svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:"check-circle",size:48,color:m.healthy},{},{})}
          <h4 class="svelte-1kjw32m">All Clear!</h4>
          <p class="svelte-1kjw32m">No active alerts at this time.</p></div>`:`<div class="alerts-list svelte-1kjw32m">${y(o.filter(r=>!r.resolved),r=>`<div class="${["alert-card svelte-1kjw32m",r.acknowledged?"acknowledged":""].join(" ").trim()}"><div class="alert-header svelte-1kjw32m">${a(l,"Icon").$$render(t,{name:F(r.type),size:20,color:I(r.severity)},{},{})}
                <div class="alert-info svelte-1kjw32m"><h4 class="svelte-1kjw32m">${e(r.title)}</h4>
                  <p class="alert-category svelte-1kjw32m">${e(r.category)} • ${e(r.severity)}</p></div>
                <div class="alert-actions svelte-1kjw32m">${r.acknowledged?"":`<button class="alert-action-btn svelte-1kjw32m" title="Acknowledge alert">${a(l,"Icon").$$render(t,{name:"check",size:16},{},{})}
                    </button>`}
                  <button class="alert-action-btn svelte-1kjw32m" title="Resolve alert">${a(l,"Icon").$$render(t,{name:"x",size:16},{},{})}</button>
                </div></div>
              <p class="alert-message svelte-1kjw32m">${e(r.message)}</p>
              <div class="alert-meta svelte-1kjw32m"><span class="alert-time">${e(new Date(r.timestamp).toLocaleString())}</span>
                ${r.acknowledged?'<span class="alert-ack svelte-1kjw32m">Acknowledged</span>':""}</div>
            </div>`)}</div>`}</div>`:""}`}
</div>`});export{A as default};
