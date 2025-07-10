import{c as h,a as c,v as i,d as u,e as s,f as v}from"../../../chunks/index3.js";import{p as g}from"../../../chunks/stores.js";import{a as b}from"../../../chunks/auth.js";import{I as n}from"../../../chunks/Icon.js";const x={code:".admin-layout.svelte-10qmmz0{display:flex;min-height:100vh;background:#0f172a}.admin-sidebar.svelte-10qmmz0{width:280px;background:#1e293b;border-right:1px solid #334155;display:flex;flex-direction:column}.sidebar-header.svelte-10qmmz0{padding:1.5rem;border-bottom:1px solid #334155}.logo.svelte-10qmmz0{display:flex;align-items:center;gap:0.75rem}.sidebar-nav.svelte-10qmmz0{flex:1;padding:1rem 0}.nav-item.svelte-10qmmz0{display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1.5rem;color:#94a3b8;text-decoration:none;transition:all 0.2s ease;border-left:3px solid transparent}.nav-item.svelte-10qmmz0:hover{background:#334155;color:#e2e8f0}.nav-item.active.svelte-10qmmz0{background:#1e40af;color:white;border-left-color:#3b82f6}.nav-content.svelte-10qmmz0{display:flex;flex-direction:column;gap:0.125rem}.nav-label.svelte-10qmmz0{font-weight:500;font-size:0.875rem}.nav-description.svelte-10qmmz0{font-size:0.75rem;opacity:0.8}.sidebar-footer.svelte-10qmmz0{padding:1.5rem;border-top:1px solid #334155;display:flex;flex-direction:column;gap:1rem}.footer-link.svelte-10qmmz0{display:flex;align-items:center;gap:0.5rem;color:#94a3b8;text-decoration:none;font-size:0.875rem;transition:color 0.2s ease}.footer-link.svelte-10qmmz0:hover{color:#e2e8f0}.user-info.svelte-10qmmz0{display:flex;align-items:center;gap:0.75rem}.user-avatar.svelte-10qmmz0{width:2rem;height:2rem;background:#374151;border-radius:50%;display:flex;align-items:center;justify-content:center}.user-details.svelte-10qmmz0{flex:1}.admin-main.svelte-10qmmz0{flex:1;overflow:auto}@media(max-width: 768px){.admin-sidebar.svelte-10qmmz0{position:fixed;left:-280px;top:0;height:100vh;z-index:50;transition:left 0.3s ease}.admin-main.svelte-10qmmz0{width:100%}}",map:null},k=h((a,z,q,r)=>{let l,m,o,t,d;o=c(g,e=>m=e),d=c(b,e=>t=e);const p=[{href:"/admin",label:"Dashboard",icon:"home",description:"System overview and metrics"},{href:"/admin/content",label:"Content",icon:"music-note",description:"Manage clips and sources"},{href:"/admin/users",label:"Users",icon:"users",description:"User management and support"},{href:"/admin/health",label:"Health",icon:"shield-check",description:"System health monitoring"},{href:"/admin/analytics",label:"Analytics",icon:"chart-bar",description:"Usage analytics and insights"},{href:"/admin/settings",label:"Settings",icon:"cog",description:"Feature flags and configuration"}];function f(e){return e==="/admin"?l==="/admin":l.startsWith(e)}return a.css.add(x),l=m.url.pathname,o(),d(),`${a.head+=`<!-- HEAD_svelte-7fkwry_START -->${a.title="<title>Admin Dashboard</title>",""}<!-- HEAD_svelte-7fkwry_END -->`,""}

<div class="admin-layout svelte-10qmmz0">
  <nav class="admin-sidebar svelte-10qmmz0"><div class="sidebar-header svelte-10qmmz0"><div class="logo svelte-10qmmz0">${i(n,"Icon").$$render(a,{name:"shield-check",class:"w-8 h-8 text-blue-400"},{},{})}
        <div><h1 class="text-lg font-bold text-white">Admin Panel</h1>
          <p class="text-xs text-gray-400">ChillCast.fm</p></div></div></div>

    <div class="sidebar-nav svelte-10qmmz0">${u(p,e=>`<a${v("href",e.href,0)} class="${"nav-item "+s(f(e.href)?"active":"",!0)+" svelte-10qmmz0"}" data-sveltekit-preload-data>${i(n,"Icon").$$render(a,{name:e.icon,class:"w-5 h-5"},{},{})}
          <div class="nav-content svelte-10qmmz0"><span class="nav-label svelte-10qmmz0">${s(e.label)}</span>
            <span class="nav-description svelte-10qmmz0">${s(e.description)}</span></div>
        </a>`)}</div>

    <div class="sidebar-footer svelte-10qmmz0"><a href="/" class="footer-link svelte-10qmmz0" data-sveltekit-preload-data>${i(n,"Icon").$$render(a,{name:"arrow-left",class:"w-4 h-4"},{},{})}
        Back to App
      </a>
      
      <div class="user-info svelte-10qmmz0"><div class="user-avatar svelte-10qmmz0">${t.user?.imageUrl?`<img${v("src",t.user.imageUrl,0)} alt="Profile" class="w-8 h-8 rounded-full">`:`${i(n,"Icon").$$render(a,{name:"user",class:"w-5 h-5 text-gray-400"},{},{})}`}</div>
        <div class="user-details svelte-10qmmz0"><p class="text-sm font-medium text-white">${s(t.user?.firstName)} ${s(t.user?.lastName)}</p>
          <p class="text-xs text-gray-400">Super Admin</p></div></div></div></nav>

  
  <main class="admin-main svelte-10qmmz0">${r.default?r.default({}):""}</main>
</div>`});export{k as default};
