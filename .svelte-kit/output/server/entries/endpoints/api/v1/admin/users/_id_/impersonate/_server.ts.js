import{j as e}from"../../../../../../../../chunks/index.js";import{r as m,a as p}from"../../../../../../../../chunks/auth.js";const S=async({params:s,locals:o,platform:d})=>{try{if(!m())return e({error:"Unauthorized"},{status:401});const r=s.id;if(!r)return e({error:"User ID is required"},{status:400});const n=d?.env?.DB;if(!n)return e({success:!1,error:"Database not available"},{status:503});try{const t=await n.prepare(`
        SELECT id, email, status FROM users WHERE id = ?
      `).bind(r).first();if(!t)return e({success:!1,error:"User not found"},{status:404});if(t.status==="banned")return e({success:!1,error:"Cannot impersonate banned user"},{status:400});const a=`imp_${Date.now()}_${r}_${Math.random().toString(36).substring(2)}`,u=new Date(Date.now()+60*60*1e3);return await n.prepare(`
        INSERT INTO impersonation_tokens (
          token, admin_id, user_id, expires_at, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(a,c(),r,u.toISOString()).run(),await n.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(c(),"impersonate_user",r,`Impersonation session started for user ${t.email}`).run(),e({success:!0,message:"Impersonation token created",data:{token:a,expiresAt:u.toISOString(),redirectUrl:`/?impersonate=${a}`}})}catch(t){return console.error("Failed to create impersonation token:",t),e({success:!1,error:"Failed to create impersonation token"},{status:500})}}catch(i){return console.error("Impersonate endpoint error:",i),e({success:!1,error:"Internal server error"},{status:500})}};function c(){let s;return p.subscribe(o=>s=o)(),s?.user?.id||"unknown"}export{S as POST};
