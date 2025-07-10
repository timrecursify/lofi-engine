import{j as s}from"../../../../../../chunks/index.js";import l from"stripe";import{g}from"../../../../../../chunks/config.js";import{c as b}from"../../../../../../chunks/errorHandler.js";const T=async({request:e,platform:t})=>{try{const r=e.headers.get("stripe-signature");if(!r)return console.error("No Stripe signature found in webhook request"),s({error:"Bad Request",message:"Missing Stripe signature"},{status:400});const a=await e.text(),c=g(t);if(!c.webhookSecret)return console.error("Stripe webhook secret not configured"),s({error:"Service Configuration Error",message:"Webhook handler not properly configured"},{status:503});const d=new l(t?.env?.STRIPE_SECRET_KEY||"",{apiVersion:"2023-10-16"});let n;try{n=d.webhooks.constructEvent(a,r,c.webhookSecret)}catch(p){return console.error("Webhook signature verification failed:",p),s({error:"Bad Request",message:"Invalid webhook signature"},{status:400})}const u=t?.env?.DB;if(!u)return console.error("D1 database not available for webhook processing"),s({error:"Service Unavailable",message:"Database service temporarily unavailable"},{status:503});const i=await E(n,u);return i.success?(console.log(`Webhook processed successfully: ${n.type} (${n.id})`),s({received:!0,eventType:n.type,eventId:n.id})):(console.error("Webhook processing failed:",i.error),s({error:"Processing Error",message:i.error},{status:500}))}catch(r){console.error("Webhook handler error:",r);const a=b("UNEXPECTED_ERROR",r);return s({error:a.code,message:a.userMessage},{status:500})}};async function E(e,t){try{switch(e.type){case"customer.subscription.created":return await S(e.data.object,t);case"customer.subscription.updated":return await f(e.data.object,t);case"customer.subscription.deleted":return await _(e.data.object,t);case"invoice.payment_succeeded":return await m(e.data.object,t);case"invoice.payment_failed":return await w(e.data.object,t);case"customer.subscription.trial_will_end":return await y(e.data.object,t);default:return console.log(`Unhandled webhook event type: ${e.type}`),{success:!0}}}catch(r){return console.error("Error processing webhook event:",r),{success:!1,error:r instanceof Error?r.message:"Unknown error"}}}async function S(e,t){try{const r=o(e);return await t.prepare(`
      INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, 
        stripe_price_id, status, current_period_start, 
        current_period_end, cancel_at_period_end, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(r.userId,r.customerId,r.subscriptionId,r.priceId,r.status,new Date(r.currentPeriodStart*1e3).toISOString(),new Date(r.currentPeriodEnd*1e3).toISOString(),r.cancelAtPeriodEnd?1:0,JSON.stringify(r.metadata),new Date().toISOString(),new Date().toISOString()).run(),await t.prepare(`
      UPDATE users 
      SET plan = 'pro', updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(),r.userId).run(),console.log(`Subscription created for user: ${r.userId}`),{success:!0}}catch(r){return console.error("Error handling subscription created:",r),{success:!1,error:r instanceof Error?r.message:"Database error"}}}async function f(e,t){try{const r=o(e);await t.prepare(`
      UPDATE subscriptions 
      SET 
        status = ?, 
        current_period_start = ?, 
        current_period_end = ?, 
        cancel_at_period_end = ?, 
        metadata = ?,
        updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(r.status,new Date(r.currentPeriodStart*1e3).toISOString(),new Date(r.currentPeriodEnd*1e3).toISOString(),r.cancelAtPeriodEnd?1:0,JSON.stringify(r.metadata),new Date().toISOString(),r.subscriptionId).run();const a=["active","trialing"].includes(r.status)?"pro":"free";return await t.prepare(`
      UPDATE users 
      SET plan = ?, updated_at = ?
      WHERE id = ?
    `).bind(a,new Date().toISOString(),r.userId).run(),console.log(`Subscription updated for user: ${r.userId}, status: ${r.status}`),{success:!0}}catch(r){return console.error("Error handling subscription updated:",r),{success:!1,error:r instanceof Error?r.message:"Database error"}}}async function _(e,t){try{const r=o(e);return await t.prepare(`
      UPDATE subscriptions 
      SET status = 'canceled', updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(new Date().toISOString(),r.subscriptionId).run(),await t.prepare(`
      UPDATE users 
      SET plan = 'free', updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(),r.userId).run(),console.log(`Subscription canceled for user: ${r.userId}`),{success:!0}}catch(r){return console.error("Error handling subscription deleted:",r),{success:!1,error:r instanceof Error?r.message:"Database error"}}}async function m(e,t){try{if(!e.subscription)return{success:!0};const r=typeof e.subscription=="string"?e.subscription:e.subscription.id;return await t.prepare(`
      INSERT INTO payments (
        stripe_invoice_id, stripe_subscription_id, amount, 
        currency, status, stripe_charge_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(e.id,r,e.amount_paid,e.currency,"succeeded",e.charge||null,new Date().toISOString()).run(),console.log(`Payment succeeded for invoice: ${e.id}`),{success:!0}}catch(r){return console.error("Error handling payment succeeded:",r),{success:!1,error:r instanceof Error?r.message:"Database error"}}}async function w(e,t){try{if(!e.subscription)return{success:!0};const r=typeof e.subscription=="string"?e.subscription:e.subscription.id;return await t.prepare(`
      INSERT INTO payments (
        stripe_invoice_id, stripe_subscription_id, amount, 
        currency, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(e.id,r,e.amount_due,e.currency,"failed",new Date().toISOString()).run(),console.log(`Payment failed for invoice: ${e.id}`),{success:!0}}catch(r){return console.error("Error handling payment failed:",r),{success:!1,error:r instanceof Error?r.message:"Database error"}}}async function y(e,t){try{const r=o(e);return console.log(`Trial will end for user: ${r.userId}`),{success:!0}}catch(r){return console.error("Error handling trial will end:",r),{success:!1,error:r instanceof Error?r.message:"Processing error"}}}function o(e){const t=e.metadata.userId;if(!t)throw new Error("User ID not found in subscription metadata");return{userId:t,customerId:e.customer,subscriptionId:e.id,priceId:e.items.data[0]?.price.id||"",status:e.status,currentPeriodStart:e.current_period_start,currentPeriodEnd:e.current_period_end,cancelAtPeriodEnd:e.cancel_at_period_end,metadata:e.metadata}}export{T as POST};
