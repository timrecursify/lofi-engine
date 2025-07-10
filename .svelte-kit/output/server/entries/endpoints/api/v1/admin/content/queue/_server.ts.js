import{j as t}from"../../../../../../../chunks/index.js";import{r as i}from"../../../../../../../chunks/auth.js";const p=async({locals:u,platform:n})=>{try{if(!await i())return t({error:"Unauthorized"},{status:401});const a=n?.env?.DB;if(!a)return console.warn("Database not available, using mock data"),t({success:!0,data:{queue:d()}});try{const o=(await a.prepare(`
        SELECT 
          id,
          title,
          category,
          content_type,
          status,
          priority,
          progress,
          estimated_time,
          source_id,
          error_message,
          created_at,
          updated_at,
          started_at,
          completed_at
        FROM content_generation_queue
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'normal' THEN 2 
            WHEN 'low' THEN 3 
          END,
          created_at ASC
      `).all()).results?.map(e=>({id:e.id,title:e.title,category:e.category,contentType:e.content_type,status:e.status,priority:e.priority,progress:e.progress||0,estimatedTime:e.estimated_time||0,sourceId:e.source_id,errorMessage:e.error_message,createdAt:e.created_at,updatedAt:e.updated_at,startedAt:e.started_at,completedAt:e.completed_at}))||[];return t({success:!0,data:{queue:o}})}catch(r){return console.error("Database error:",r),t({success:!0,data:{queue:d()}})}}catch(s){return console.error("Failed to load generation queue:",s),t({error:"Failed to load generation queue"},{status:500})}},m=async({url:u,locals:n,platform:s})=>{try{if(!await i())return t({error:"Unauthorized"},{status:401});const r=u.searchParams.get("id");if(!r)return t({error:"No item ID provided"},{status:400});const o=s?.env?.DB;if(!o)return console.warn("Database not available, simulating deletion"),t({success:!0,data:{deleted:1,itemId:r}});try{const e=await o.prepare(`
        DELETE FROM content_generation_queue 
        WHERE id = ? AND status IN ('queued', 'failed')
      `).bind(r).run();return t({success:!0,data:{deleted:e.changes||0,itemId:r}})}catch(e){return console.error("Database error:",e),t({error:"Failed to delete queue item"},{status:500})}}catch(a){return console.error("Failed to delete queue item:",a),t({error:"Failed to delete queue item"},{status:500})}};function d(){return[{id:"1",title:"Breaking: Technology News Update",category:"news",contentType:"automated",status:"processing",priority:"high",progress:75,estimatedTime:120,sourceId:"1",errorMessage:null,createdAt:"2024-01-09T11:15:00Z",updatedAt:"2024-01-09T11:17:00Z",startedAt:"2024-01-09T11:16:00Z",completedAt:null},{id:"2",title:"Daily Weather Update",category:"weather",contentType:"automated",status:"queued",priority:"normal",progress:0,estimatedTime:180,sourceId:"2",errorMessage:null,createdAt:"2024-01-09T11:10:00Z",updatedAt:"2024-01-09T11:10:00Z",startedAt:null,completedAt:null},{id:"3",title:"Educational: Space Exploration Facts",category:"education",contentType:"manual",status:"queued",priority:"low",progress:0,estimatedTime:240,sourceId:null,errorMessage:null,createdAt:"2024-01-09T11:05:00Z",updatedAt:"2024-01-09T11:05:00Z",startedAt:null,completedAt:null},{id:"4",title:"Entertainment: Movie Reviews",category:"entertainment",contentType:"automated",status:"failed",priority:"normal",progress:25,estimatedTime:0,sourceId:"4",errorMessage:"TTS service temporarily unavailable",createdAt:"2024-01-09T10:45:00Z",updatedAt:"2024-01-09T10:50:00Z",startedAt:"2024-01-09T10:47:00Z",completedAt:null},{id:"5",title:"Manual Content: Product Launch News",category:"news",contentType:"manual",status:"completed",priority:"high",progress:100,estimatedTime:0,sourceId:null,errorMessage:null,createdAt:"2024-01-09T10:30:00Z",updatedAt:"2024-01-09T10:35:00Z",startedAt:"2024-01-09T10:31:00Z",completedAt:"2024-01-09T10:35:00Z"}]}export{m as DELETE,p as GET};
