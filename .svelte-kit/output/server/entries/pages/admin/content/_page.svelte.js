import{c as u,v as a,e as t,d as g}from"../../../../chunks/index3.js";import{I as o}from"../../../../chunks/Icon.js";import{E as p}from"../../../../chunks/ErrorBoundary.js";function b(e){return new Date(e).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}function m(e){const s=Math.floor(e/60),n=e%60;return`${s}:${n.toString().padStart(2,"0")}`}function y(e){return`${e.toFixed(1)} MB`}function h(e){switch(e){case"published":return"text-green-400 bg-green-900/20";case"generating":return"text-yellow-400 bg-yellow-900/20";case"processing":return"text-blue-400 bg-blue-900/20";case"queued":return"text-gray-400 bg-gray-900/20";case"failed":return"text-red-400 bg-red-900/20";case"active":return"text-green-400 bg-green-900/20";case"disabled":return"text-gray-400 bg-gray-900/20";default:return"text-gray-400 bg-gray-900/20"}}const C=u((e,s,n,f)=>{let{data:d}=s,c=[],l=[],x=[],i=new Set;return s.data===void 0&&n.data&&d!==void 0&&n.data(d),`${e.head+=`<!-- HEAD_svelte-13ii2l5_START -->${e.title="<title>Content Management - Admin Dashboard</title>",""}<!-- HEAD_svelte-13ii2l5_END -->`,""}

${a(p,"ErrorBoundary").$$render(e,{componentName:"ContentManagement",fallbackMessage:"Content management interface encountered an error"},{},{default:()=>`<div class="min-h-screen bg-gray-900 text-white p-6"><div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8"><div><h1 class="text-3xl font-bold text-white">Content Management</h1>
          <p class="text-gray-400 mt-2">Manage clips, sources, and content generation</p></div>
        <div class="flex space-x-4"><button class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">${a(o,"Icon").$$render(e,{name:"plus",class:"w-4 h-4 mr-2"},{},{})}
            Add Source
          </button>
          <button class="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">${a(o,"Icon").$$render(e,{name:"microphone",class:"w-4 h-4 mr-2"},{},{})}
            Generate Content
          </button>
          <button disabled class="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white rounded-lg transition-colors">${a(o,"Icon").$$render(e,{name:"refresh",class:"w-4 h-4 mr-2 animate-spin"},{},{})}
            ${t("Loading...")}</button></div></div>

      
      <div class="border-b border-gray-700 mb-6"><nav class="flex space-x-8"><button class="${"py-2 px-1 border-b-2 font-medium text-sm transition-colors "+t("border-blue-500 text-blue-400",!0)}">Content Clips (${t(c.length)})
          </button>
          <button class="${"py-2 px-1 border-b-2 font-medium text-sm transition-colors "+t("border-transparent text-gray-400 hover:text-gray-300",!0)}">Content Sources (${t(l.length)})
          </button>
          <button class="${"py-2 px-1 border-b-2 font-medium text-sm transition-colors "+t("border-transparent text-gray-400 hover:text-gray-300",!0)}">Generation Queue (${t(x.length)})
          </button></nav></div>

      
      ${`<div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-6 border-b border-gray-700"><div class="flex justify-between items-center"><h3 class="text-lg font-semibold text-white">Content Clips</h3>
              <div class="flex space-x-2">${i.size>0?`<button class="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">${a(o,"Icon").$$render(e,{name:"trash",class:"w-4 h-4 mr-1"},{},{})}
                    Delete (${t(i.size)})
                  </button>`:""}</div></div></div>

          
          <div class="overflow-x-auto"><table class="w-full"><thead class="bg-gray-750"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"><input type="checkbox" class="rounded border-gray-600 bg-gray-700 text-blue-600"></th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Content</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plays</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th></tr></thead>
              <tbody class="divide-y divide-gray-700">${g(c,r=>`<tr class="hover:bg-gray-750"><td class="px-6 py-4 whitespace-nowrap"><input type="checkbox" class="rounded border-gray-600 bg-gray-700 text-blue-600" ${i.has(r.id)?"checked":""}></td>
                    <td class="px-6 py-4"><div class="max-w-xs"><div class="text-sm font-medium text-white truncate">${t(r.title)}</div>
                        <div class="text-xs text-gray-400">Voice: ${t(r.voice)} • ${t(y(r.size))}</div>
                      </div></td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 capitalize">${t(r.category)}
                      </span></td>
                    <td class="px-6 py-4 whitespace-nowrap"><span class="${"px-2 py-1 text-xs font-medium rounded-full "+t(h(r.status),!0)}">${t(r.status.toUpperCase())}
                      </span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${t(m(r.duration))}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${t(r.playCount.toLocaleString())}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${t(b(r.createdAt))}</td>
                  </tr>`)}</tbody></table></div>

          
          </div>`}

      
      

      
      </div></div>

  
  

  
  `})}`});export{C as default};
