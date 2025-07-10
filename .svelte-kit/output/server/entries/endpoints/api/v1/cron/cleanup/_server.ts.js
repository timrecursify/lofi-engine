import{j as s}from"../../../../../../chunks/index.js";import{l as c}from"../../../../../../chunks/logger.js";import{Q as l}from"../../../../../../chunks/queue-orchestrator.js";const d=async({request:o,platform:e})=>{try{if(!o.headers.get("CF-Cron"))return s({error:"Forbidden",message:"This endpoint is only accessible via cron trigger"},{status:403});const r=await l.cleanupOldClips(e,86400),a=e?.env?.DB;return a&&await a.prepare(`
        DELETE FROM pipeline_jobs 
        WHERE created_at < datetime('now', '-7 days')
      `).run(),c.info(`Cleanup completed: ${r} clips deleted`,"cron-cleanup",{deletedCount:r,timestamp:new Date().toISOString()}),s({success:!0,message:`Cleanup completed: ${r} clips deleted`,deletedCount:r})}catch(t){return c.error("Cleanup cron error","cron-cleanup",{error:t instanceof Error?t.message:String(t),stack:t instanceof Error?t.stack:void 0}),s({error:"Internal Server Error",message:"Cleanup failed",details:t instanceof Error?t.message:"Unknown error"},{status:500})}},E=async({platform:o})=>{try{const e=o?.env?.DB;if(!e)return s({error:"Database Error",message:"Database not available"},{status:500});const r=await e.prepare(`
      SELECT COUNT(*) as total_clips,
             COUNT(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 END) as recent_clips
      FROM content_clips
    `).first(),n=await e.prepare(`
      SELECT COUNT(*) as total_jobs,
             COUNT(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 END) as recent_jobs
      FROM pipeline_jobs
    `).first();return s({success:!0,stats:{clips:{total:r.total_clips,recent:r.recent_clips},jobs:{total:n.total_jobs,recent:n.recent_jobs}}})}catch(e){return c.error("Cleanup status error","cron-cleanup",{error:e instanceof Error?e.message:String(e),stack:e instanceof Error?e.stack:void 0}),s({error:"Internal Server Error",message:"Status check failed"},{status:500})}},m=async()=>new Response(null,{status:200,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Max-Age":"86400"}});export{E as GET,m as OPTIONS,d as POST};
