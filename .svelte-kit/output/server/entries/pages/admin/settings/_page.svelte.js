import{c as m,v as a,e as t,d as n,f as i}from"../../../../chunks/index3.js";import{I as o}from"../../../../chunks/Icon.js";import{E as g}from"../../../../chunks/ErrorBoundary.js";const y=m((r,l,d,p)=>{let{data:c}=l,s={featureFlags:{contentGeneration:!0,voiceClips:!0,proFeatures:!0,analytics:!0,maintenance:!1},system:{maxConcurrentUsers:1e3,clipRetentionDays:30,maxClipsPerUser:50,ttsRateLimit:100},content:{autoGenerateContent:!0,contentModerationEnabled:!0,defaultTopics:["world-news","weather","education"],proOnlyTopics:["markets","crypto","twitter","reddit"]}};return l.data===void 0&&d.data&&c!==void 0&&d.data(c),`${r.head+=`<!-- HEAD_svelte-1u6jl0m_START -->${r.title="<title>Settings - Admin Dashboard</title>",""}<!-- HEAD_svelte-1u6jl0m_END -->`,""}

${a(g,"ErrorBoundary").$$render(r,{componentName:"AdminSettings",fallbackMessage:"Admin settings page encountered an error"},{},{default:()=>`<div class="min-h-screen bg-gray-900 text-white p-6"><div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-8"><div><h1 class="text-3xl font-bold text-white">Settings</h1>
          <p class="text-gray-400 mt-2">Manage feature flags and system configuration</p></div>
        <div class="flex space-x-4"><button disabled class="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors">${a(o,"Icon").$$render(r,{name:"refresh",class:"w-4 h-4 mr-2 animate-spin"},{},{})}
            ${t("Loading...")}</button>
          <button disabled class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">${a(o,"Icon").$$render(r,{name:"save",class:"w-4 h-4 mr-2"},{},{})}
            ${t("Save Changes")}</button></div></div>

      
      <div class="bg-gray-800 rounded-lg border border-gray-700 mb-8"><div class="p-6 border-b border-gray-700"><h3 class="text-lg font-semibold text-white">Feature Flags</h3>
          <p class="text-gray-400 text-sm">Enable or disable features across the platform</p></div>
        <div class="p-6"><div class="grid grid-cols-1 md:grid-cols-2 gap-6">${n(Object.entries(s.featureFlags),([e,u])=>`<div class="flex items-center justify-between p-4 bg-gray-750 rounded-lg"><div><h4 class="font-medium text-white capitalize">${t(e.replace(/([A-Z])/g," $1").trim())}</h4>
                  <p class="text-sm text-gray-400">${t(e==="contentGeneration"?"Automatic content generation pipeline":e==="voiceClips"?"Voice clip playback and TTS synthesis":e==="proFeatures"?"Pro subscription features and content":e==="analytics"?"Analytics tracking and reporting":e==="maintenance"?"Maintenance mode (blocks normal usage)":"Feature description")}
                  </p></div>
                <button class="${"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 "+t(u?"bg-blue-600":"bg-gray-600",!0)}"><span class="${"inline-block h-4 w-4 transform rounded-full bg-white transition-transform "+t(u?"translate-x-6":"translate-x-1",!0)}"></span></button>
              </div>`)}</div></div></div>

      
      <div class="bg-gray-800 rounded-lg border border-gray-700 mb-8"><div class="p-6 border-b border-gray-700"><h3 class="text-lg font-semibold text-white">System Configuration</h3>
          <p class="text-gray-400 text-sm">Core system limits and performance settings</p></div>
        <div class="p-6"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label for="maxConcurrentUsers" class="block text-sm font-medium text-gray-300 mb-2">Max Concurrent Users
              </label>
              <input id="maxConcurrentUsers" type="number" min="1" max="10000" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"${i("value",s.system.maxConcurrentUsers,0)}>
              <p class="text-xs text-gray-400 mt-1">Maximum number of concurrent active users</p></div>
            
            <div><label for="clipRetentionDays" class="block text-sm font-medium text-gray-300 mb-2">Clip Retention (Days)
              </label>
              <input id="clipRetentionDays" type="number" min="1" max="365" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"${i("value",s.system.clipRetentionDays,0)}>
              <p class="text-xs text-gray-400 mt-1">How long to keep generated content clips</p></div>
            
            <div><label for="maxClipsPerUser" class="block text-sm font-medium text-gray-300 mb-2">Max Clips Per User
              </label>
              <input id="maxClipsPerUser" type="number" min="1" max="1000" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"${i("value",s.system.maxClipsPerUser,0)}>
              <p class="text-xs text-gray-400 mt-1">Maximum clips a user can have in queue</p></div>
            
            <div><label for="ttsRateLimit" class="block text-sm font-medium text-gray-300 mb-2">TTS Rate Limit (per hour)
              </label>
              <input id="ttsRateLimit" type="number" min="1" max="1000" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"${i("value",s.system.ttsRateLimit,0)}>
              <p class="text-xs text-gray-400 mt-1">TTS API requests per hour per user</p></div></div></div></div>

      
      <div class="bg-gray-800 rounded-lg border border-gray-700"><div class="p-6 border-b border-gray-700"><h3 class="text-lg font-semibold text-white">Content Management</h3>
          <p class="text-gray-400 text-sm">Content generation and topic configuration</p></div>
        <div class="p-6"><div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="flex items-center justify-between p-4 bg-gray-750 rounded-lg"><div><h4 class="font-medium text-white">Auto-Generate Content</h4>
                  <p class="text-sm text-gray-400">Automatically create new content clips</p></div>
                <button class="${"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 "+t("bg-blue-600",!0)}"><span class="${"inline-block h-4 w-4 transform rounded-full bg-white transition-transform "+t("translate-x-6",!0)}"></span></button></div>
              
              <div class="flex items-center justify-between p-4 bg-gray-750 rounded-lg"><div><h4 class="font-medium text-white">Content Moderation</h4>
                  <p class="text-sm text-gray-400">Filter inappropriate content automatically</p></div>
                <button class="${"relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 "+t("bg-blue-600",!0)}"><span class="${"inline-block h-4 w-4 transform rounded-full bg-white transition-transform "+t("translate-x-6",!0)}"></span></button></div></div>

            
            <div><h4 class="font-medium text-white mb-3">Default Topics (Free Users)</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">${n(["world-news","local-news","weather","sports","education","health"],e=>`<label class="flex items-center space-x-2 p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"><input type="checkbox" ${s.content.defaultTopics.includes(e)?"checked":""} class="rounded border-gray-600 text-blue-600 focus:ring-blue-500">
                    <span class="text-sm text-white capitalize">${t(e.replace("-"," "))}</span>
                  </label>`)}</div></div>

            <div><h4 class="font-medium text-white mb-3">Pro-Only Topics</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">${n(["markets","crypto","twitter","reddit"],e=>`<label class="flex items-center space-x-2 p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"><input type="checkbox" ${s.content.proOnlyTopics.includes(e)?"checked":""} class="rounded border-gray-600 text-yellow-600 focus:ring-yellow-500">
                    <span class="text-sm text-white capitalize flex items-center">${t(e.replace("-"," "))}
                      ${a(o,"Icon").$$render(r,{name:"crown",class:"w-3 h-3 ml-1 text-yellow-400"},{},{})}</span>
                  </label>`)}</div></div></div></div></div></div></div>`})}`});export{y as default};
