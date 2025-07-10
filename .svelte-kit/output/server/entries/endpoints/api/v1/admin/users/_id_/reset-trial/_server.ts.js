import{j as e}from"../../../../../../../../chunks/index.js";import{r as d,a as l}from"../../../../../../../../chunks/auth.js";const E=async({params:n,locals:_,platform:o})=>{try{if(!d())return e({error:"Unauthorized"},{status:401});const t=n.id;if(!t)return e({error:"User ID is required"},{status:400});const s=o?.env?.DB;if(!s)return e({success:!1,error:"Database not available"},{status:503});try{const r=new Date;r.setDate(r.getDate()+14),await s.prepare(`
        INSERT OR REPLACE INTO subscriptions (
          id, user_id, stripe_subscription_id, plan_type, status,
          current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(`trial_reset_${t}_${Date.now()}`,t,`trial_reset_${Date.now()}`,"pro_trial","trialing",new Date().toISOString(),r.toISOString(),!1).run(),await s.prepare(`
        UPDATE users 
        SET plan = 'pro', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(t).run();let i;l.subscribe(c=>i=c)();const u=i?.user?.id||"unknown";return await s.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(u,"reset_trial",t,"Trial reset by admin").run(),e({success:!0,message:"Trial reset successfully",data:{trialEndsAt:r.toISOString()}})}catch(r){return console.error("Failed to reset trial:",r),e({success:!1,error:"Failed to reset trial"},{status:500})}}catch(a){return console.error("Reset trial endpoint error:",a),e({success:!1,error:"Internal server error"},{status:500})}};export{E as POST};
