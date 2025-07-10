import{j as r}from"../../../../../../../../chunks/index.js";import{r as c,a as d}from"../../../../../../../../chunks/auth.js";const p=async({params:n,locals:l,platform:u})=>{try{if(!c())return r({error:"Unauthorized"},{status:401});const s=n.id;if(!s)return r({error:"User ID is required"},{status:400});const t=u?.env?.DB;if(!t)return r({success:!1,error:"Database not available"},{status:503});try{await t.prepare(`
        UPDATE users 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(s).run();let e;d.subscribe(i=>e=i)();const o=e?.user?.id||"unknown";return await t.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(o,"unban_user",s,"User unbanned by admin").run(),r({success:!0,message:"User unbanned successfully"})}catch(e){return console.error("Failed to unban user:",e),r({success:!1,error:"Failed to unban user"},{status:500})}}catch(a){return console.error("Unban user endpoint error:",a),r({success:!1,error:"Internal server error"},{status:500})}};export{p as POST};
