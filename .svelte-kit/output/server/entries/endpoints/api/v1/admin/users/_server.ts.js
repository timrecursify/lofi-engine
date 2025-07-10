import{j as r}from"../../../../../../chunks/index.js";import{r as S,a as U}from"../../../../../../chunks/auth.js";const v=async({url:e,locals:l,platform:n})=>{try{if(!S())return r({error:"Unauthorized"},{status:401});const s=n?.env?.DB;if(!s)return console.warn("Database not available, using mock data"),r({success:!0,data:A(e)});const d=parseInt(e.searchParams.get("page")||"1"),a=Math.min(parseInt(e.searchParams.get("limit")||"20"),100),o=e.searchParams.get("search")||"",p=e.searchParams.get("plan")||"all",c=e.searchParams.get("status")||"all",u=e.searchParams.get("sortBy")||"createdAt",T=e.searchParams.get("sortOrder")||"desc";try{const _=["1=1"],m=[];if(o){_.push("(u.email LIKE ? OR u.name LIKE ? OR u.id LIKE ?)");const t=`%${o}%`;m.push(t,t,t)}p!=="all"&&(_.push("u.plan = ?"),m.push(p)),c!=="all"&&(_.push("u.status = ?"),m.push(c));const h=_.join(" AND ");let E="u.created_at DESC";u==="email"?E=`u.email ${T.toUpperCase()}`:u==="plan"?E=`u.plan ${T.toUpperCase()}`:u==="lastSeenAt"?E=`u.last_seen_at ${T.toUpperCase()}`:E=`u.created_at ${T.toUpperCase()}`;const g=`
        SELECT COUNT(*) as total
        FROM users u
        WHERE ${h}
      `,f=(await s.prepare(g).bind(...m).first())?.total||0,P=(d-1)*a,y=`
        SELECT 
          u.*,
          s.id as subscription_id,
          s.status as subscription_status,
          s.current_period_end,
          s.cancel_at_period_end,
          COALESCE(play_stats.total_plays, 0) as total_plays,
          COALESCE(session_stats.total_sessions, 0) as total_sessions
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_plays
          FROM play_log
          GROUP BY user_id
        ) play_stats ON u.id = play_stats.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(DISTINCT session_id) as total_sessions
          FROM play_log
          GROUP BY user_id
        ) session_stats ON u.id = session_stats.user_id
        WHERE ${h}
        ORDER BY ${E}
        LIMIT ? OFFSET ?
      `,I=(await s.prepare(y).bind(...m,a,P).all()).results?.map(t=>({id:t.id,email:t.email,name:t.name,plan:t.plan,status:t.status||"active",emailVerified:t.email_verified,createdAt:t.created_at,lastSeenAt:t.last_seen_at,subscription:t.subscription_id?{id:t.subscription_id,status:t.subscription_status,currentPeriodEnd:t.current_period_end,cancelAtPeriodEnd:t.cancel_at_period_end}:null,stats:{totalPlays:t.total_plays,totalSessions:t.total_sessions,favoriteTopics:[]}}))||[];return r({success:!0,data:{users:I,total:f,page:d,limit:a,totalPages:Math.ceil(f/a)}})}catch(_){return console.error("Database error:",_),r({success:!0,data:A(e),warning:"Using mock data due to database error"})}}catch(i){return console.error("Failed to get users:",i),r({success:!1,error:"Failed to get users"},{status:500})}},D=async({request:e,locals:l,platform:n})=>{try{if(!S())return r({error:"Unauthorized"},{status:401});const s=n?.env?.DB;if(!s)return r({success:!1,error:"Database not available"},{status:503});const{action:d,userId:a,...o}=await e.json();try{switch(d){case"ban":await s.prepare(`
            UPDATE users 
            SET status = 'banned', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(a).run(),await b(s,"ban_user",a,o.reason);break;case"unban":await s.prepare(`
            UPDATE users 
            SET status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(a).run(),await b(s,"unban_user",a,"User unbanned");break;case"update_subscription":const{plan:p,expiresAt:c,reason:u}=o;await s.prepare(`
            UPDATE users 
            SET plan = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(p,a).run(),p==="pro"&&c&&await s.prepare(`
              INSERT OR REPLACE INTO subscriptions (
                id, user_id, stripe_subscription_id, plan_type, status,
                current_period_start, current_period_end, cancel_at_period_end
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(`admin_override_${a}_${Date.now()}`,a,`admin_override_${Date.now()}`,"pro_monthly","active",new Date().toISOString(),c,!1).run(),await b(s,"update_subscription",a,u);break;case"reset_trial":await b(s,"reset_trial",a,"Trial reset by admin");break;case"add_notes":await s.prepare(`
            INSERT INTO admin_notes (user_id, note, created_by, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(a,o.notes,R()).run();break;default:return r({success:!1,error:"Invalid action"},{status:400})}return r({success:!0,message:"Action completed successfully"})}catch(p){return console.error("Database operation failed:",p),r({success:!1,error:"Database operation failed"},{status:500})}}catch(i){return console.error("Admin users action error:",i),r({success:!1,error:"Internal server error"},{status:500})}};async function b(e,l,n,i){try{await e.prepare(`
      INSERT INTO admin_actions (
        admin_id, action, target_user_id, details, timestamp
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(R(),l,n,i).run()}catch(s){console.error("Failed to log admin action:",s)}}function R(){let e;return U.subscribe(l=>e=l)(),e?.user?.id||"unknown"}function A(e){const l=parseInt(e.searchParams.get("page")||"1"),n=parseInt(e.searchParams.get("limit")||"20"),i=e.searchParams.get("search")||"",s=[{id:"user_1",email:"john.doe@example.com",name:"John Doe",plan:"pro",status:"active",emailVerified:!0,createdAt:"2024-01-15T10:30:00Z",lastSeenAt:"2024-07-08T14:22:00Z",subscription:{id:"sub_1",status:"active",currentPeriodEnd:"2024-08-15T10:30:00Z",cancelAtPeriodEnd:!1},stats:{totalPlays:342,totalSessions:28,favoriteTopics:["world-news","crypto","tech"]}},{id:"user_2",email:"jane.smith@example.com",name:"Jane Smith",plan:"free",status:"active",emailVerified:!0,createdAt:"2024-02-03T09:15:00Z",lastSeenAt:"2024-07-07T11:45:00Z",subscription:null,stats:{totalPlays:156,totalSessions:15,favoriteTopics:["local-news","health","education"]}},{id:"user_3",email:"banned.user@example.com",name:"Banned User",plan:"free",status:"banned",emailVerified:!1,createdAt:"2024-01-20T16:45:00Z",lastSeenAt:"2024-06-15T08:30:00Z",subscription:null,stats:{totalPlays:45,totalSessions:8,favoriteTopics:["world-news"]}}];let d=s;if(i){const c=i.toLowerCase();d=s.filter(u=>u.email.toLowerCase().includes(c)||u.name?.toLowerCase().includes(c)||u.id.toLowerCase().includes(c))}const a=d.length,o=(l-1)*n;return{users:d.slice(o,o+n),total:a,page:l,limit:n,totalPages:Math.ceil(a/n)}}export{v as GET,D as POST};
