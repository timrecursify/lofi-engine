import{j as t}from"../../../../../chunks/index.js";const d={volumes:{music:.7,voice:.8,effects:.5,ads:.5},narrationSpeed:1,enabledTopics:["world-news","local-news","weather","education","health"],theme:"dark",scene:"auto",vinylFx:!1},b=async({locals:r,platform:i})=>{try{const{auth:n}=r;if(!n.userId)return t({error:"Unauthorized",message:"User not authenticated"},{status:401});const s=i?.env?.DB;if(!s)return console.error("D1 database not available"),t({error:"Service Unavailable",message:"Database service temporarily unavailable"},{status:503});const e=await s.prepare(`
      SELECT 
        volume_music, volume_voice, volume_effects, volume_ads,
        narration_speed, theme, scene, vinyl_fx, enabled_topics,
        version, synced_at
      FROM user_preferences 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY version DESC
      LIMIT 1
    `).bind(n.userId).first();if(!e)return t({preferences:d,version:1,lastSyncedAt:new Date().toISOString()});let o;try{o=JSON.parse(e.enabled_topics)}catch{console.warn("Failed to parse enabled_topics JSON, using defaults"),o=d.enabledTopics}const a={volumes:{music:e.volume_music,voice:e.volume_voice,effects:e.volume_effects,ads:e.volume_ads},narrationSpeed:e.narration_speed,enabledTopics:o,theme:e.theme,scene:e.scene,vinylFx:!!e.vinyl_fx};return t({preferences:a,version:e.version,lastSyncedAt:e.synced_at})}catch(n){return console.error("Failed to retrieve user preferences:",n),t({error:"Internal Server Error",message:"Failed to retrieve preferences"},{status:500})}},_=async({request:r,locals:i,platform:n})=>{try{const{auth:s}=i;if(!s.userId)return t({error:"Unauthorized",message:"User not authenticated"},{status:401});const e=n?.env?.DB;if(!e)return t({error:"Service Unavailable",message:"Database service temporarily unavailable"},{status:503});let o;try{o=await r.json()}catch{return t({error:"Bad Request",message:"Invalid JSON in request body"},{status:400})}if(!o.preferences)return t({error:"Bad Request",message:"Missing preferences in request body"},{status:400});const a=o.preferences,c=p(a);if(c)return t({error:"Bad Request",message:c},{status:400});try{await e.prepare(`
        INSERT OR IGNORE INTO users (id, email, clerk_id, plan)
        VALUES (?, ?, ?, 'free')
      `).bind(s.userId,s.user?.email||"",s.userId).run(),await e.prepare(`
        UPDATE user_preferences 
        SET is_active = FALSE 
        WHERE user_id = ? AND is_active = TRUE
      `).bind(s.userId).run();const v=(await e.prepare(`
        SELECT COALESCE(MAX(version), 0) + 1 as next_version
        FROM user_preferences 
        WHERE user_id = ?
      `).bind(s.userId).first())?.next_version||1,u=new Date().toISOString(),m=JSON.stringify(a.enabledTopics);return await e.prepare(`
        INSERT INTO user_preferences (
          user_id, volume_music, volume_voice, volume_effects, volume_ads,
          narration_speed, theme, scene, vinyl_fx, enabled_topics,
          version, is_active, synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)
      `).bind(s.userId,a.volumes.music,a.volumes.voice,a.volumes.effects,a.volumes.ads,a.narrationSpeed,a.theme,a.scene,a.vinylFx?1:0,m,v,u,u,u).run(),await e.prepare(`
        UPDATE users 
        SET last_seen_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(u,u,s.userId).run(),t({preferences:a,version:v,lastSyncedAt:u})}catch(l){return console.error("Database transaction failed:",l),t({error:"Internal Server Error",message:"Failed to save preferences"},{status:500})}}catch(s){return console.error("Failed to update user preferences:",s),t({error:"Internal Server Error",message:"Failed to update preferences"},{status:500})}},E=async({locals:r,platform:i})=>{try{const{auth:n}=r;if(!n.userId)return t({error:"Unauthorized",message:"User not authenticated"},{status:401});const s=i?.env?.DB;if(!s)return t({error:"Service Unavailable",message:"Database service temporarily unavailable"},{status:503});const e=new Date().toISOString();return await s.prepare(`
      UPDATE user_preferences 
      SET is_active = FALSE, updated_at = ?
      WHERE user_id = ? AND is_active = TRUE
    `).bind(e,n.userId).run(),t({preferences:d,version:1,lastSyncedAt:e})}catch(n){return console.error("Failed to reset user preferences:",n),t({error:"Internal Server Error",message:"Failed to reset preferences"},{status:500})}};function p(r){if(!r||typeof r!="object")return"Preferences must be an object";if(!r.volumes||typeof r.volumes!="object")return"Volumes must be an object";const i=["music","voice","effects","ads"];for(const e of i){const o=r.volumes[e];if(typeof o!="number"||o<0||o>1)return`Volume.${e} must be a number between 0 and 1`}if(typeof r.narrationSpeed!="number"||r.narrationSpeed<.8||r.narrationSpeed>1.5)return"narrationSpeed must be a number between 0.8 and 1.5";if(!Array.isArray(r.enabledTopics))return"enabledTopics must be an array";if(r.enabledTopics.some(e=>typeof e!="string"))return"All enabledTopics must be strings";const n=["dark","light","amoled","sepia"];if(!n.includes(r.theme))return`theme must be one of: ${n.join(", ")}`;const s=["auto","city","nature","space","underwater"];return s.includes(r.scene)?typeof r.vinylFx!="boolean"?"vinylFx must be a boolean":null:`scene must be one of: ${s.join(", ")}`}export{E as DELETE,b as GET,_ as POST};
