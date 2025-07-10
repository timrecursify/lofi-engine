import{c as v,v as r,e,d as o}from"../../../../chunks/index3.js";import{I as i}from"../../../../chunks/Icon.js";import{E as g}from"../../../../chunks/ErrorBoundary.js";function p(t){const d=Math.floor(t/60),n=Math.floor(t%60);return d>0?`${d}h ${n}m`:`${n}m`}function x(t){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(t)}const f=v((t,d,n,m)=>{let{data:c}=d,a={overview:{totalUsers:0,activeUsers:0,totalListenTime:0,avgSessionDuration:0},growth:[],userEngagement:{dailyActiveUsers:[],sessionDurations:[],contentInteraction:[]},revenue:{subscriptions:0,revenue:0,conversionRate:0}};return d.data===void 0&&n.data&&c!==void 0&&n.data(c),`${t.head+=`<!-- HEAD_svelte-17h5ev1_START -->${t.title="<title>Analytics - Admin Dashboard</title>",""}<!-- HEAD_svelte-17h5ev1_END -->`,""}

${r(g,"ErrorBoundary").$$render(t,{componentName:"Analytics",fallbackMessage:"Analytics dashboard encountered an error"},{},{default:()=>`<div class="min-h-screen bg-gray-900 text-white p-6"><div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8"><div><h1 class="text-3xl font-bold text-white">Analytics</h1>
          <p class="text-gray-400 mt-2">Usage insights and performance metrics</p></div>
        <div class="flex space-x-4"><select class="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"><option value="1d">Last 24 Hours</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option></select>
          <button disabled class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">${r(i,"Icon").$$render(t,{name:"refresh",class:"w-4 h-4 mr-2 animate-spin"},{},{})}
            ${e("Loading...")}</button></div></div>

      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"><div class="bg-gray-800 rounded-lg p-6 border border-gray-700"><div class="flex items-center justify-between"><div><p class="text-gray-400 text-sm">Total Users</p>
              <p class="text-2xl font-bold text-white">${e(a.overview.totalUsers.toLocaleString())}</p></div>
            ${r(i,"Icon").$$render(t,{name:"users",class:"w-8 h-8 text-blue-400"},{},{})}</div></div>
        
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700"><div class="flex items-center justify-between"><div><p class="text-gray-400 text-sm">Active Users</p>
              <p class="text-2xl font-bold text-white">${e(a.overview.activeUsers.toLocaleString())}</p></div>
            ${r(i,"Icon").$$render(t,{name:"activity",class:"w-8 h-8 text-green-400"},{},{})}</div></div>
        
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700"><div class="flex items-center justify-between"><div><p class="text-gray-400 text-sm">Total Listen Time</p>
              <p class="text-2xl font-bold text-white">${e(p(a.overview.totalListenTime))}</p></div>
            ${r(i,"Icon").$$render(t,{name:"clock",class:"w-8 h-8 text-purple-400"},{},{})}</div></div>
        
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700"><div class="flex items-center justify-between"><div><p class="text-gray-400 text-sm">Avg Session</p>
              <p class="text-2xl font-bold text-white">${e(a.overview.avgSessionDuration.toFixed(1))}m</p></div>
            ${r(i,"Icon").$$render(t,{name:"timer",class:"w-8 h-8 text-yellow-400"},{},{})}</div></div></div>

      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div class="bg-gray-800 rounded-lg border border-gray-700"><div class="p-6 border-b border-gray-700"><h3 class="text-lg font-semibold text-white">User Growth</h3>
            <p class="text-gray-400 text-sm">Daily active users and sessions</p></div>
          <div class="p-6"><div class="space-y-4">${o(a.growth,(s,l)=>`<div class="flex items-center justify-between"><span class="text-sm text-gray-400">${e(new Date(s.date).toLocaleDateString("en-US",{month:"short",day:"numeric"}))}</span>
                  <div class="flex items-center space-x-4"><div class="flex items-center space-x-2"><div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <span class="text-sm text-white">${e(s.users)} users</span></div>
                    <div class="flex items-center space-x-2"><div class="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span class="text-sm text-white">${e(s.sessions)} sessions</span>
                    </div></div>
                </div>`)}</div></div></div>

        
        <div class="bg-gray-800 rounded-lg border border-gray-700"><div class="p-6 border-b border-gray-700"><h3 class="text-lg font-semibold text-white">Session Duration</h3>
            <p class="text-gray-400 text-sm">How long users stay engaged</p></div>
          <div class="p-6"><div class="space-y-4">${o(a.userEngagement.sessionDurations,s=>`<div class="flex items-center justify-between"><span class="text-sm text-gray-300">${e(s.range)}</span>
                  <div class="flex items-center space-x-3"><div class="w-32 bg-gray-700 rounded-full h-2"><div class="bg-blue-400 h-2 rounded-full transition-all duration-300" style="${"width: "+e(s.count/Math.max(...a.userEngagement.sessionDurations.map(l=>l.count))*100,!0)+"%"}"></div></div>
                    <span class="text-sm text-white font-medium">${e(s.count)}</span></div>
                </div>`)}</div></div></div></div>

      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-gray-800 rounded-lg border border-gray-700"><div class="p-6 border-b border-gray-700"><h3 class="text-lg font-semibold text-white">Content Performance</h3>
            <p class="text-gray-400 text-sm">Most engaging topics and content</p></div>
          <div class="p-6"><div class="space-y-4">${o(a.userEngagement.contentInteraction,s=>`<div class="flex items-center justify-between"><div class="flex items-center space-x-3"><div class="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center"><span class="text-xs">${e(s.topic==="world-news"?"🌍":s.topic==="weather"?"🌤️":s.topic==="education"?"🎓":s.topic==="sports"?"⚽":s.topic==="health"?"💪":"📰")}
                      </span></div>
                    <div><p class="text-sm font-medium text-white">${e(s.topic.replace("-"," ").replace(/\b\w/g,l=>l.toUpperCase()))}</p>
                      <p class="text-xs text-gray-400">${e(s.plays)} plays</p>
                    </div></div>
                  <div class="text-right"><p class="text-sm font-medium text-green-400">${e(s.engagement.toFixed(1))}%</p>
                    <p class="text-xs text-gray-400">engagement</p></div>
                </div>`)}</div></div></div>

        
        <div class="bg-gray-800 rounded-lg border border-gray-700"><div class="p-6 border-b border-gray-700"><h3 class="text-lg font-semibold text-white">Revenue Metrics</h3>
            <p class="text-gray-400 text-sm">Subscription performance</p></div>
          <div class="p-6"><div class="space-y-6"><div class="flex items-center justify-between"><div><p class="text-gray-400 text-sm">Active Subscriptions</p>
                  <p class="text-xl font-bold text-white">${e(a.revenue.subscriptions)}</p></div>
                ${r(i,"Icon").$$render(t,{name:"credit-card",class:"w-6 h-6 text-blue-400"},{},{})}</div>
              
              <div class="flex items-center justify-between"><div><p class="text-gray-400 text-sm">Monthly Revenue</p>
                  <p class="text-xl font-bold text-green-400">${e(x(a.revenue.revenue))}</p></div>
                ${r(i,"Icon").$$render(t,{name:"trending-up",class:"w-6 h-6 text-green-400"},{},{})}</div>
              
              <div class="flex items-center justify-between"><div><p class="text-gray-400 text-sm">Conversion Rate</p>
                  <p class="text-xl font-bold text-purple-400">${e(a.revenue.conversionRate.toFixed(1))}%</p></div>
                ${r(i,"Icon").$$render(t,{name:"target",class:"w-6 h-6 text-purple-400"},{},{})}</div></div></div></div></div></div></div>`})}`});export{f as default};
