import test from "node:test";
import assert from "node:assert/strict";
import { createOperationsManager } from "../src/operations-manager.js";

test("manager diagnoses alerts and never performs automatic repair",async()=>{
 const calls=[];
 const database={query:async(sql,values)=>{
  calls.push({sql,values});
  if(sql.includes("INSERT INTO manager_runs"))return {rows:[{id:"423e4567-e89b-42d3-a456-426614174000"}]};
  if(sql.includes("FROM system_alerts"))return {rows:[
   {id:"523e4567-e89b-42d3-a456-426614174000",alert_type:"publication_uncertain",severity:"critical",title:"Uncertain",status:"active",occurrences:1},
   {id:"623e4567-e89b-42d3-a456-426614174000",alert_type:"clip_job_failed",severity:"warning",title:"Clip failed",status:"active",occurrences:2}
  ]};
  return {rows:[]};
 }};
 const alerts={refresh:async()=>2};
 const report=await createOperationsManager({database,alerts}).diagnose();
 assert.equal(report.summary.critical,1);
 assert.equal(report.summary.warning,1);
 assert.equal(report.summary.automatic_repairs_performed,0);
 assert.equal(report.findings[0].proposed_action,"block_duplicate");
 assert.equal(report.findings[0].automatic_repair,false);
 assert.match(report.notice,/Nenhuma tarefa foi repetida/);
 assert.ok(calls.some(x=>x.sql.includes("UPDATE manager_runs SET status='completed'")));
});

test("manager preserves history retrieval limit",async()=>{
 let limit;
 const database={query:async(_sql,values)=>{limit=values[0];return {rows:[]}}};
 const rows=await createOperationsManager({database,alerts:{}}).history(7);
 assert.deepEqual(rows,[]);
 assert.equal(limit,7);
});

test("manager records failed diagnostics",async()=>{
 const updates=[];
 const database={query:async(sql,values)=>{
  if(sql.includes("INSERT INTO manager_runs"))return {rows:[{id:"723e4567-e89b-42d3-a456-426614174000"}]};
  if(sql.includes("UPDATE manager_runs SET status='failed'"))updates.push(values);
  throw new Error("database read failed");
 }};
 await assert.rejects(createOperationsManager({database,alerts:{refresh:async()=>{throw new Error("database read failed")}}}).diagnose(),/database read failed/);
 assert.equal(updates.length,1);
});
