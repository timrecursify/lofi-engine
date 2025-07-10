import{j as t}from"../../../../../../../chunks/index.js";import{r as b}from"../../../../../../../chunks/auth.js";const g=async({locals:h,platform:p})=>{try{if(!await b())return t({error:"Unauthorized"},{status:401});const r=p?.env?.DB;if(!r)return console.warn("Database not available, using mock data"),t({success:!0,data:{sources:y()}});try{const a=(await r.prepare(`
        SELECT 
          id,
          name,
          type,
          url,
          category,
          enabled,
          fetch_interval,
          max_items,
          last_fetch,
          items_generated,
          status,
          created_at,
          updated_at
        FROM content_sources
        ORDER BY created_at DESC
      `).all()).results?.map(e=>({id:e.id,name:e.name,type:e.type,url:e.url,category:e.category,enabled:!!e.enabled,fetchInterval:e.fetch_interval,maxItems:e.max_items,lastFetch:e.last_fetch,itemsGenerated:e.items_generated||0,status:e.status,createdAt:e.created_at,updatedAt:e.updated_at}))||[];return t({success:!0,data:{sources:a}})}catch(n){return console.error("Database error:",n),t({success:!0,data:{sources:y()}})}}catch(s){return console.error("Failed to load content sources:",s),t({error:"Failed to load content sources"},{status:500})}},w=async({request:h,locals:p,platform:s})=>{try{if(!await b())return t({error:"Unauthorized"},{status:401});const n=await h.json(),{name:a,type:e,url:c,category:o,enabled:l,fetchInterval:i,maxItems:m}=n;if(!a||!e||!c||!o)return t({error:"Missing required fields"},{status:400});const f=s?.env?.DB;if(!f)return console.warn("Database not available, simulating creation"),t({success:!0,data:{id:`mock-${Date.now()}`,name:a,type:e,url:c,category:o,enabled:l!==!1,fetchInterval:i||3600,maxItems:m||10,lastFetch:null,itemsGenerated:0,status:"active",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}});try{const d=`src_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,u=new Date().toISOString();return await f.prepare(`
        INSERT INTO content_sources (
          id, name, type, url, category, enabled, fetch_interval, max_items, 
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(d,a,e,c,o,l!==!1?1:0,i||3600,m||10,"active",u,u).run(),t({success:!0,data:{id:d,name:a,type:e,url:c,category:o,enabled:l!==!1,fetchInterval:i||3600,maxItems:m||10,lastFetch:null,itemsGenerated:0,status:"active",createdAt:u,updatedAt:u}})}catch(d){return console.error("Database error:",d),t({error:"Failed to create content source"},{status:500})}}catch(r){return console.error("Failed to create content source:",r),t({error:"Failed to create content source"},{status:500})}};function y(){return[{id:"1",name:"TechCrunch RSS",type:"rss",url:"https://techcrunch.com/feed/",category:"news",enabled:!0,fetchInterval:3600,maxItems:10,lastFetch:"2024-01-09T11:00:00Z",itemsGenerated:45,status:"active",createdAt:"2024-01-01T10:00:00Z",updatedAt:"2024-01-09T11:00:00Z"},{id:"2",name:"Weather API",type:"api",url:"https://api.openweathermap.org/data/2.5/weather",category:"weather",enabled:!0,fetchInterval:1800,maxItems:5,lastFetch:"2024-01-09T10:30:00Z",itemsGenerated:12,status:"active",createdAt:"2024-01-01T10:00:00Z",updatedAt:"2024-01-09T10:30:00Z"},{id:"3",name:"Educational Content Feed",type:"rss",url:"https://example.edu/feed/",category:"education",enabled:!1,fetchInterval:7200,maxItems:8,lastFetch:"2024-01-08T15:00:00Z",itemsGenerated:23,status:"disabled",createdAt:"2024-01-01T10:00:00Z",updatedAt:"2024-01-08T15:00:00Z"},{id:"4",name:"Entertainment News",type:"rss",url:"https://entertainment.com/rss",category:"entertainment",enabled:!0,fetchInterval:3600,maxItems:12,lastFetch:"2024-01-09T09:00:00Z",itemsGenerated:67,status:"active",createdAt:"2024-01-01T10:00:00Z",updatedAt:"2024-01-09T09:00:00Z"}]}export{g as GET,w as POST};
