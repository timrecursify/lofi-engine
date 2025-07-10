import{j as r}from"../../../../../../../../chunks/index.js";import{r as l,a as b}from"../../../../../../../../chunks/auth.js";const T=async({params:u,request:c,locals:m,platform:d})=>{try{if(!l())return r({error:"Unauthorized"},{status:401});const e=u.id;if(!e)return r({error:"User ID is required"},{status:400});const{plan:a,expiresAt:i,reason:o}=await c.json();if(!a||!o?.trim())return r({error:"Plan and reason are required"},{status:400});const t=d?.env?.DB;if(!t)return r({success:!1,error:"Database not available"},{status:503});try{await t.prepare(`
        UPDATE users 
        SET plan = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(a,e).run(),a==="pro"&&i&&await t.prepare(`
          INSERT OR REPLACE INTO subscriptions (
            id, user_id, stripe_subscription_id, plan_type, status,
            current_period_start, current_period_end, cancel_at_period_end
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(`admin_override_${e}_${Date.now()}`,e,`admin_override_${Date.now()}`,"pro_monthly","active",new Date().toISOString(),i,!1).run();let s;b.subscribe(_=>s=_)();const p=s?.user?.id||"unknown";return await t.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(p,"update_subscription",e,o).run(),r({success:!0,message:"Subscription updated successfully"})}catch(s){return console.error("Failed to update subscription:",s),r({success:!1,error:"Failed to update subscription"},{status:500})}}catch(n){return console.error("Subscription endpoint error:",n),r({success:!1,error:"Internal server error"},{status:500})}};export{T as POST};
