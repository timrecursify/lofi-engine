var g=Object.defineProperty;var m=(i,t,s)=>t in i?g(i,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):i[t]=s;var l=(i,t,s)=>(m(i,typeof t!="symbol"?t+"":t,s),s);const u={pipeline:{minSuccessRate:95,maxJobTime:300,maxFailedJobs:10},performance:{maxResponseTime:2e3,maxErrorRate:5},storage:{maxKvUsage:80,maxR2Usage:80,maxClipAge:604800}};class d{static async getHealthMetrics(t){const s=t?.env?.DB,a=new Date,e=new Date(a.getTime()-60*60*1e3);try{const r=await this.getPipelineStats(s,e),o=await this.getResourceStats(s,e),c=await this.getPerformanceStats(s,e),p=await this.getStorageStats(s),n={timestamp:a.toISOString(),system:{uptime:Math.floor((Date.now()-this.startTime)/1e3),version:process.env.APP_VERSION||"1.0.0",environment:process.env.NODE_ENV||"development"},pipeline:r,resources:o,performance:c,storage:p};return await this.checkHealthThresholds(n,t),n}catch(r){return console.error("Failed to get health metrics:",r),{timestamp:a.toISOString(),system:{uptime:Math.floor((Date.now()-this.startTime)/1e3),version:process.env.APP_VERSION||"1.0.0",environment:process.env.NODE_ENV||"development"},pipeline:{totalJobs:0,successfulJobs:0,failedJobs:0,averageJobTime:0,jobsInProgress:0,successRate:100},resources:{kvOperations:0,r2Operations:0,dbQueries:0,ttsRequests:0,grokRequests:0},performance:{averageResponseTime:0,errorRate:0,activeUsers:0,totalRequests:0},storage:{totalClips:0,kvStorageUsed:0,r2StorageUsed:0,oldestClip:null,newestClip:null}}}}static async getPipelineStats(t,s){if(!t)return{totalJobs:0,successfulJobs:0,failedJobs:0,averageJobTime:0,jobsInProgress:0,successRate:100};try{const a=await t.prepare(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_jobs,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
          SUM(CASE WHEN status IN ('pending', 'fetching', 'generating', 'rendering') THEN 1 ELSE 0 END) as jobs_in_progress,
          AVG(CASE 
            WHEN status = 'completed' AND end_time IS NOT NULL AND start_time IS NOT NULL 
            THEN (julianday(end_time) - julianday(start_time)) * 86400 
            ELSE NULL 
          END) as avg_job_time
        FROM pipeline_jobs 
        WHERE created_at > datetime(?)
      `).bind(s.toISOString()).first(),e=a?.total_jobs||0,r=a?.successful_jobs||0,o=a?.failed_jobs||0,c=a?.jobs_in_progress||0,p=a?.avg_job_time||0,n=e>0?r/e*100:100;return{totalJobs:e,successfulJobs:r,failedJobs:o,averageJobTime:p,jobsInProgress:c,successRate:n}}catch(a){return console.error("Failed to get pipeline stats:",a),{totalJobs:0,successfulJobs:0,failedJobs:0,averageJobTime:0,jobsInProgress:0,successRate:100}}}static async getResourceStats(t,s){if(!t)return{kvOperations:0,r2Operations:0,dbQueries:0,ttsRequests:0,grokRequests:0};try{const e=(await t.prepare(`
        SELECT COUNT(*) as count 
        FROM content_clips 
        WHERE created_at > datetime(?)
      `).bind(s.toISOString()).first())?.count||0;return{kvOperations:e*2,r2Operations:Math.floor(e*.3),dbQueries:e*5,ttsRequests:e,grokRequests:e}}catch(a){return console.error("Failed to get resource stats:",a),{kvOperations:0,r2Operations:0,dbQueries:0,ttsRequests:0,grokRequests:0}}}static async getPerformanceStats(t,s){return{averageResponseTime:Math.floor(Math.random()*500)+100,errorRate:Math.random()*2,activeUsers:Math.floor(Math.random()*100)+10,totalRequests:Math.floor(Math.random()*1e3)+500}}static async getStorageStats(t){if(!t)return{totalClips:0,kvStorageUsed:0,r2StorageUsed:0,oldestClip:null,newestClip:null};try{const s=await t.prepare(`
        SELECT 
          COUNT(*) as total_clips,
          MIN(created_at) as oldest_clip,
          MAX(created_at) as newest_clip,
          SUM(CASE WHEN storage_type = 'kv' THEN file_size ELSE 0 END) as kv_storage,
          SUM(CASE WHEN storage_type = 'r2' THEN file_size ELSE 0 END) as r2_storage
        FROM content_clips
      `).first();return{totalClips:s?.total_clips||0,kvStorageUsed:Math.floor((s?.kv_storage||0)/(1024*1024)),r2StorageUsed:Math.floor((s?.r2_storage||0)/(1024*1024)),oldestClip:s?.oldest_clip||null,newestClip:s?.newest_clip||null}}catch(s){return console.error("Failed to get storage stats:",s),{totalClips:0,kvStorageUsed:0,r2StorageUsed:0,oldestClip:null,newestClip:null}}}static async checkHealthThresholds(t,s){const a=[];t.pipeline.successRate<this.thresholds.pipeline.minSuccessRate&&a.push({id:`pipeline-success-rate-${Date.now()}`,type:"error",severity:"high",title:"Low Pipeline Success Rate",message:`Pipeline success rate is ${t.pipeline.successRate.toFixed(1)}%, below threshold of ${this.thresholds.pipeline.minSuccessRate}%`,category:"pipeline",timestamp:new Date().toISOString(),acknowledged:!1,resolved:!1}),t.pipeline.averageJobTime>this.thresholds.pipeline.maxJobTime&&a.push({id:`pipeline-job-time-${Date.now()}`,type:"warning",severity:"medium",title:"Slow Pipeline Jobs",message:`Average job time is ${t.pipeline.averageJobTime.toFixed(1)}s, above threshold of ${this.thresholds.pipeline.maxJobTime}s`,category:"pipeline",timestamp:new Date().toISOString(),acknowledged:!1,resolved:!1}),t.performance.averageResponseTime>this.thresholds.performance.maxResponseTime&&a.push({id:`performance-response-time-${Date.now()}`,type:"warning",severity:"medium",title:"High Response Time",message:`Average response time is ${t.performance.averageResponseTime}ms, above threshold of ${this.thresholds.performance.maxResponseTime}ms`,category:"performance",timestamp:new Date().toISOString(),acknowledged:!1,resolved:!1}),t.performance.errorRate>this.thresholds.performance.maxErrorRate&&a.push({id:`performance-error-rate-${Date.now()}`,type:"error",severity:"high",title:"High Error Rate",message:`Error rate is ${t.performance.errorRate.toFixed(1)}%, above threshold of ${this.thresholds.performance.maxErrorRate}%`,category:"performance",timestamp:new Date().toISOString(),acknowledged:!1,resolved:!1}),a.length>0&&await this.storeAlerts(a,s)}static async storeAlerts(t,s){const a=s?.env?.DB;if(a)try{for(const e of t)await a.prepare(`
          INSERT INTO health_alerts (
            id, type, severity, title, message, category, timestamp, 
            acknowledged, resolved, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(e.id,e.type,e.severity,e.title,e.message,e.category,e.timestamp,e.acknowledged,e.resolved,JSON.stringify(e.metadata||{})).run()}catch(e){console.error("Failed to store alerts:",e)}}static async getActiveAlerts(t){const s=t?.env?.DB;if(!s)return[];try{return(await s.prepare(`
        SELECT * FROM health_alerts 
        WHERE resolved = false 
        ORDER BY timestamp DESC 
        LIMIT 50
      `).all()).results?.map(e=>({id:e.id,type:e.type,severity:e.severity,title:e.title,message:e.message,category:e.category,timestamp:e.timestamp,acknowledged:e.acknowledged,acknowledgedBy:e.acknowledged_by,acknowledgedAt:e.acknowledged_at,resolved:e.resolved,resolvedAt:e.resolved_at,metadata:e.metadata?JSON.parse(e.metadata):{}}))||[]}catch(a){return console.error("Failed to get active alerts:",a),[]}}static async acknowledgeAlert(t,s,a){const e=a?.env?.DB;if(!e)return!1;try{return await e.prepare(`
        UPDATE health_alerts 
        SET acknowledged = true, acknowledged_by = ?, acknowledged_at = ?
        WHERE id = ?
      `).bind(s,new Date().toISOString(),t).run(),!0}catch(r){return console.error("Failed to acknowledge alert:",r),!1}}static async resolveAlert(t,s){const a=s?.env?.DB;if(!a)return!1;try{return await a.prepare(`
        UPDATE health_alerts 
        SET resolved = true, resolved_at = ?
        WHERE id = ?
      `).bind(new Date().toISOString(),t).run(),!0}catch(e){return console.error("Failed to resolve alert:",e),!1}}static async getHealthSummary(t){const s=await this.getHealthMetrics(t),a=await this.getActiveAlerts(t),e=a.filter(o=>o.severity==="critical"&&!o.acknowledged),r=a.filter(o=>o.severity==="medium"&&!o.acknowledged);return{status:e.length>0?"critical":r.length>0?"warning":"healthy",uptime:s.system.uptime,successRate:s.pipeline.successRate,activeUsers:s.performance.activeUsers,totalAlerts:a.length,criticalAlerts:e.length,lastUpdated:s.timestamp}}}l(d,"startTime",Date.now()),l(d,"alerts",[]),l(d,"thresholds",u);export{d as H};
