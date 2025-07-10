import{j as r}from"../../../../../../../../chunks/index.js";import{r as l,a as b}from"../../../../../../../../chunks/auth.js";const f=async({params:u,request:o,locals:m,platform:i})=>{try{if(!l())return r({error:"Unauthorized"},{status:401});const s=u.id;if(!s)return r({error:"User ID is required"},{status:400});const{reason:n}=await o.json();if(!n?.trim())return r({error:"Ban reason is required"},{status:400});const t=i?.env?.DB;if(!t)return r({success:!1,error:"Database not available"},{status:503});try{await t.prepare(`
        UPDATE users 
        SET status = 'banned', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(s).run();let e;b.subscribe(d=>e=d)();const c=e?.user?.id||"unknown";return await t.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(c,"ban_user",s,n).run(),r({success:!0,message:"User banned successfully"})}catch(e){return console.error("Failed to ban user:",e),r({success:!1,error:"Failed to ban user"},{status:500})}}catch(a){return console.error("Ban user endpoint error:",a),r({success:!1,error:"Internal server error"},{status:500})}};export{f as POST};
