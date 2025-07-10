import{j as e}from"../../../../../../chunks/index.js";import{c as p}from"../../../../../../chunks/errorHandler.js";const h=async({locals:a,platform:s})=>{try{const{auth:i}=a;if(!i.userId)return e({error:"Unauthorized",message:"Authentication required"},{status:401});const t=s?.env?.DB;if(!t)return e({error:"Service Unavailable",message:"Database service temporarily unavailable"},{status:503});try{const r=await t.prepare(`
        SELECT 
          s.stripe_subscription_id,
          s.stripe_customer_id,
          s.status,
          s.current_period_start,
          s.current_period_end,
          s.cancel_at_period_end,
          s.trial_end,
          s.stripe_price_id,
          u.plan,
          u.subscription_status,
          u.trial_ends_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id 
          AND s.status IN ('active', 'trialing', 'past_due', 'unpaid')
        WHERE u.id = ? AND u.is_active = TRUE
      `).bind(i.userId).first();if(!r)return e({error:"Not Found",message:"User not found"},{status:404});let n=null;r.stripe_subscription_id&&(n=(await t.prepare(`
          SELECT status
          FROM payments
          WHERE stripe_subscription_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(r.stripe_subscription_id).first())?.status||null);let u=null;const o=r.trial_end||r.trial_ends_at;if(o&&r.status==="trialing"){const c=new Date(o),E=new Date,m=c.getTime()-E.getTime(),d=Math.ceil(m/(1e3*60*60*24));u=d>0?d:0}const l=["active","trialing"].includes(r.status||""),_=r.status==="trialing",b={subscriptionId:r.stripe_subscription_id||null,customerId:r.stripe_customer_id||null,status:r.status||null,currentPeriodStart:r.current_period_start||null,currentPeriodEnd:r.current_period_end||null,cancelAtPeriodEnd:!!r.cancel_at_period_end,trialEnd:o||null,priceId:r.stripe_price_id||null,lastPaymentStatus:n,plan:r.plan||"free",isActive:l,isTrialing:_,daysUntilTrialEnd:u};return e(b)}catch(r){return console.error("Database error retrieving subscription:",r),e({error:"Internal Server Error",message:"Failed to retrieve subscription status"},{status:500})}}catch(i){console.error("Subscription status endpoint error:",i);const t=p("UNEXPECTED_ERROR",i);return e({error:t.code,message:t.userMessage},{status:500})}},S=async({request:a,locals:s,platform:i})=>{try{const{auth:t}=s;if(!t.userId)return e({error:"Unauthorized",message:"Authentication required"},{status:401});let r;try{r=await a.json()}catch{return e({error:"Bad Request",message:"Invalid JSON in request body"},{status:400})}const n=i?.env?.DB;if(!n)return e({error:"Service Unavailable",message:"Database service temporarily unavailable"},{status:503});switch(r.action){case"cancel_subscription":return await f(t.userId,n,r.metadata);case"reactivate_subscription":return await g(t.userId,n,r.metadata);case"update_payment_method":return await v(t.userId,n,r.metadata);default:return e({error:"Bad Request",message:"Invalid action specified"},{status:400})}}catch(t){console.error("Subscription update endpoint error:",t);const r=p("UNEXPECTED_ERROR",t);return e({error:r.code,message:r.userMessage},{status:500})}};async function f(a,s,i){try{const t=await s.prepare(`
      SELECT stripe_subscription_id, status 
      FROM subscriptions 
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `).bind(a).first();return t?(await s.prepare(`
      UPDATE subscriptions 
      SET cancel_at_period_end = TRUE, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
    `).bind(t.stripe_subscription_id).run(),e({success:!0,message:"Subscription will be canceled at the end of the current period"})):e({error:"Not Found",message:"No active subscription found"},{status:404})}catch(t){return console.error("Cancel subscription error:",t),e({error:"Internal Server Error",message:"Failed to cancel subscription"},{status:500})}}async function g(a,s,i){try{const t=await s.prepare(`
      SELECT stripe_subscription_id, status 
      FROM subscriptions 
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `).bind(a).first();return t?(await s.prepare(`
      UPDATE subscriptions 
      SET cancel_at_period_end = FALSE, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
    `).bind(t.stripe_subscription_id).run(),e({success:!0,message:"Subscription reactivated successfully"})):e({error:"Not Found",message:"No active subscription found"},{status:404})}catch(t){return console.error("Reactivate subscription error:",t),e({error:"Internal Server Error",message:"Failed to reactivate subscription"},{status:500})}}async function v(a,s,i){try{return await s.prepare(`
      SELECT stripe_subscription_id, stripe_customer_id 
      FROM subscriptions 
      WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due')
    `).bind(a).first()?e({success:!0,message:"Payment method update initiated",updateUrl:"/billing/update-payment-method"}):e({error:"Not Found",message:"No active subscription found"},{status:404})}catch(t){return console.error("Update payment method error:",t),e({error:"Internal Server Error",message:"Failed to update payment method"},{status:500})}}export{h as GET,S as POST};
