import{j as d}from"../../../../../../chunks/index.js";import{l as o}from"../../../../../../chunks/logger.js";const T=async({request:s,platform:a})=>{try{const e=a?.env?.CLERK_WEBHOOK_SECRET;if(!e)return o.error("CLERK_WEBHOOK_SECRET not found in environment","clerk-webhook",{platform:!!a,env:!!a?.env}),d({error:"Service Configuration Error",message:"Webhook service not properly configured"},{status:500});const r=await s.text(),i=s.headers.get("svix-signature");if(!i)return d({error:"Bad Request",message:"Missing signature header"},{status:400});if(!await _(r,i,e))return o.error("Invalid webhook signature","clerk-webhook",{hasSignature:!!i,hasSecret:!!e}),d({error:"Unauthorized",message:"Invalid webhook signature"},{status:401});let t;try{t=JSON.parse(r)}catch{return d({error:"Bad Request",message:"Invalid JSON payload"},{status:400})}const n=a?.env?.DB;if(!n)return o.error("D1 database not available","clerk-webhook",{platform:!!a,env:!!a?.env}),d({error:"Service Unavailable",message:"Database service temporarily unavailable"},{status:503});switch(t.type){case"user.created":await m(t,n);break;case"user.updated":await f(t,n);break;case"user.deleted":await E(t,n);break;default:return o.info(`Unhandled webhook event type: ${t.type}`,"clerk-webhook",{eventType:t.type,userId:t.data.id}),d({received:!0,message:`Event type ${t.type} not handled`})}return d({received:!0,message:"Webhook processed successfully"})}catch(e){return o.error("Webhook processing error","clerk-webhook",{error:e instanceof Error?e.message:String(e),stack:e instanceof Error?e.stack:void 0}),d({error:"Internal Server Error",message:"Failed to process webhook"},{status:500})}};async function m(s,a){const e=s.data,r=e.email_addresses.find(n=>n.email_address)?.email_address||"",i=e.email_addresses.some(n=>n.verification?.status==="verified"),t=[e.first_name,e.last_name].filter(Boolean).join(" ")||null;await a.prepare(`
    INSERT OR REPLACE INTO users (
      id, email, clerk_id, full_name, image_url, 
      email_verified, plan, created_at, updated_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(e.id,r,e.id,t,e.image_url||null,i?1:0).run(),o.info(`User created in database: ${e.id} (${r})`,"clerk-webhook",{userId:e.id,email:r,emailVerified:i,hasFullName:!!t})}async function f(s,a){const e=s.data,r=e.email_addresses.find(n=>n.email_address)?.email_address||"",i=e.email_addresses.some(n=>n.verification?.status==="verified"),t=[e.first_name,e.last_name].filter(Boolean).join(" ")||null;await a.prepare(`
    UPDATE users 
    SET 
      email = ?,
      full_name = ?,
      image_url = ?,
      email_verified = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE clerk_id = ?
  `).bind(r,t,e.image_url||null,i?1:0,e.id).run(),o.info(`User updated in database: ${e.id} (${r})`,"clerk-webhook",{userId:e.id,email:r,emailVerified:i,hasFullName:!!t})}async function E(s,a){const e=s.data;await a.prepare(`
    UPDATE users 
    SET 
      email = ?,
      full_name = 'Deleted User',
      image_url = NULL,
      updated_at = CURRENT_TIMESTAMP,
      last_seen_at = CURRENT_TIMESTAMP
    WHERE clerk_id = ?
  `).bind(`deleted-${e.id}@deleted.local`,e.id).run(),await a.prepare(`
    UPDATE user_preferences 
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(e.id).run(),o.info(`User soft-deleted in database: ${e.id}`,"clerk-webhook",{userId:e.id,deletedEmail:`deleted-${e.id}@deleted.local`})}async function _(s,a,e){try{const r=a.split(",");if(r.length!==2||!r[0].startsWith("v1"))return!1;const i=r[1],t=new TextEncoder().encode(e),n=await crypto.subtle.importKey("raw",t,{name:"HMAC",hash:"SHA-256"},!1,["sign"]),l=new TextEncoder().encode(s),c=await crypto.subtle.sign("HMAC",n,l),u=btoa(String.fromCharCode(...new Uint8Array(c)));return g(i,u)}catch(r){return o.error("Signature verification error","clerk-webhook",{error:r instanceof Error?r.message:String(r),stack:r instanceof Error?r.stack:void 0}),!1}}function g(s,a){if(s.length!==a.length)return!1;let e=0;for(let r=0;r<s.length;r++)e|=s.charCodeAt(r)^a.charCodeAt(r);return e===0}const k=async()=>new Response(null,{status:200,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, svix-signature","Access-Control-Max-Age":"86400"}});export{k as OPTIONS,T as POST};
