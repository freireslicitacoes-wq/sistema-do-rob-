import test from "node:test";
import assert from "node:assert/strict";
import { createAlertManager } from "../src/alerts.js";

test("alert manager detects paused imports and clip jobs needing attention", async () => {
  const queries=[];
  const database={query:async(sql,values)=>{
    queries.push({sql,values});
    if(sql.includes("FROM storage_policies"))return {rows:[{imports_paused:true,pause_reason:"high_watermark",capacity_guard_enabled:true,min_free_bytes:"1024"}]};
    if(sql.includes("FROM media_assets"))return {rows:[{id:"123e4567-e89b-42d3-a456-426614174000",original_name:"video.mp4",storage_last_error:"permission denied"}]};
    if(sql.includes("FROM clip_jobs")&&sql.includes("lease_expires_at"))return {rows:[]};
    if(sql.includes("FROM clip_jobs"))return {rows:[{id:"223e4567-e89b-42d3-a456-426614174000",status:"needs_attention",last_error:"engine unavailable"}]};
    if(sql.includes("FROM publication_items pi"))return {rows:[]};
    if(sql.includes("FROM publication_items"))return {rows:[]};
    return {rows:[]};
  }};
  const manager=createAlertManager({database});
  const alerts=await manager.collect();
  assert.ok(alerts.some(a=>a.alert_type==="storage_imports_paused"));
  assert.ok(alerts.some(a=>a.alert_type==="storage_cleanup_failed"));
  assert.ok(alerts.some(a=>a.alert_type==="clip_job_failed"));
});

test("alert refresh upserts active alerts and resolves alerts no longer present", async()=>{
  const statements=[];
  const database={query:async(sql,values)=>{
    statements.push({sql,values});
    if(sql.includes("FROM storage_policies"))return {rows:[{imports_paused:false}]};
    return {rows:[]};
  }};
  const manager=createAlertManager({database});
  await manager.refresh();
  assert.ok(statements.some(x=>x.sql.includes("ON CONFLICT (dedupe_key)")));
  assert.ok(statements.some(x=>x.sql.includes("SET status='resolved'")));
});

test("acknowledge only updates an active alert",async()=>{
  const database={query:async(sql,values)=>{
    assert.match(sql,/status='acknowledged'/);
    assert.equal(values[0],"323e4567-e89b-42d3-a456-426614174000");
    return {rows:[{id:values[0],status:"acknowledged"}]};
  }};
  const item=await createAlertManager({database}).acknowledge("323e4567-e89b-42d3-a456-426614174000");
  assert.equal(item.status,"acknowledged");
});
