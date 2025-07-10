import{j as e}from"../../../../../../../../../chunks/index.js";import{r as d}from"../../../../../../../../../chunks/auth.js";const p=async({params:c,locals:l,platform:i})=>{try{if(!await d())return e({error:"Unauthorized"},{status:401});const t=c.id;if(!t)return e({error:"Source ID required"},{status:400});const o=i?.env?.DB;if(!o)return console.warn("Database not available, simulating toggle"),e({success:!0,data:{id:t,enabled:!0,status:"active"}});try{const r=await o.prepare(`
        SELECT id, enabled, status FROM content_sources WHERE id = ?
      `).bind(t).first();if(!r)return e({error:"Content source not found"},{status:404});const a=!r.enabled,n=a?"active":"disabled",u=new Date().toISOString();return await o.prepare(`
        UPDATE content_sources 
        SET enabled = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).bind(a?1:0,n,u,t).run(),e({success:!0,data:{id:t,enabled:a,status:n,updatedAt:u}})}catch(r){return console.error("Database error:",r),e({error:"Failed to toggle content source"},{status:500})}}catch(s){return console.error("Failed to toggle content source:",s),e({error:"Failed to toggle content source"},{status:500})}};export{p as POST};
