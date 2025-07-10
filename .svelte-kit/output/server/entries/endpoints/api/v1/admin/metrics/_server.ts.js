import{j as e}from"../../../../../../chunks/index.js";const m=async({locals:a,platform:o})=>{const{auth:s}=a;if(!s.userId)return e({error:"Unauthorized"},{status:401});const r=s.user?.publicMetadata?.role;if(!r||r!=="admin"&&r!=="super-admin")return e({error:"Forbidden"},{status:403});try{const t=o?.env?.DB;if(!t)return e({error:"Database unavailable"},{status:503});const n=new Date,p=new Date(n.getTime()-30*60*1e3),c=n.toISOString().slice(0,7),l=await t.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_preferences 
      WHERE updated_at >= ? AND is_active = TRUE
    `).bind(p.toISOString()).first(),E=await t.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at IS NOT NULL
    `).first(),R=await t.prepare(`
      SELECT COUNT(*) as count
      FROM content_clips 
      WHERE expires_at > ? AND status = 'ready'
    `).bind(n.toISOString()).first(),S=((await t.prepare(`
      SELECT COUNT(*) as clip_count
      FROM content_clips 
      WHERE created_at >= ? AND tts_cost > 0
    `).bind(c+"-01").first())?.clip_count||0)*.003,_=((await t.prepare(`
      SELECT COUNT(*) as impression_count
      FROM ad_impressions 
      WHERE created_at >= ? AND event_type = 'impression'
    `).bind(c+"-01").first())?.impression_count||0)*.001;let i="healthy";const u=R?.count||0,d=l?.count||0;u<10?i="error":(u<50||d===0)&&(i="warning");const T={activeUsers:d,totalUsers:E?.count||0,clipPoolDepth:u,ttsSpend:Math.round(S*100)/100,adRevenue:Math.round(_*100)/100,systemHealth:i,lastUpdated:n.toISOString()};return e(T)}catch(t){return console.error("Failed to fetch admin metrics:",t),e({error:"Internal server error"},{status:500})}},D=async({locals:a,platform:o})=>{const{auth:s}=a;if(!s.userId)return e({error:"Unauthorized"},{status:401});const r=s.user?.publicMetadata?.role;if(!r||r!=="admin"&&r!=="super-admin")return e({error:"Forbidden"},{status:403});try{const t=o?.env?.DB;return t?(await t.prepare(`
      UPDATE content_clips 
      SET updated_at = ?
      WHERE status = 'ready' AND expires_at > ?
    `).bind(new Date().toISOString(),new Date().toISOString()).run(),e({success:!0,message:"Metrics refreshed"})):e({error:"Database unavailable"},{status:503})}catch(t){return console.error("Failed to refresh metrics:",t),e({error:"Internal server error"},{status:500})}};export{m as GET,D as POST};
