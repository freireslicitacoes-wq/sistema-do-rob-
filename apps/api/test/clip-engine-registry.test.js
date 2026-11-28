import test from "node:test";
import assert from "node:assert/strict";
import { assessFailover, validateEngineRecord } from "../src/clip-engine-registry.js";

const primary={role:"primary",validation_status:"validated",enabled:true};
const reserve={role:"reserve",validation_status:"validated",enabled:true};

test("reserve is blocked while unvalidated",()=>{
 const result=assessFailover({jobStatus:"failed",primary,reserve:{...reserve,validation_status:"pending",enabled:false}});
 assert.equal(result.allowed,false);
 assert.equal(result.reason,"reserve_engine_not_validated");
});

test("reserve is blocked when previous attempt may still run",()=>{
 const result=assessFailover({jobStatus:"running",attemptInFlight:true,primary,reserve});
 assert.equal(result.allowed,false);
 assert.equal(result.reason,"previous_attempt_may_still_be_running");
});

test("reserve is blocked for uncertain publication",()=>{
 const result=assessFailover({jobStatus:"failed",publicationStatus:"uncertain",primary,reserve});
 assert.equal(result.allowed,false);
 assert.equal(result.reason,"publication_result_uncertain");
});

test("eligible failover is only a decision, not an execution",()=>{
 const result=assessFailover({jobStatus:"failed",primary,reserve});
 assert.equal(result.allowed,true);
 assert.equal(result.action,"reserve_may_be_selected");
});

test("engine cannot be enabled without validation",()=>{
 assert.deepEqual(validateEngineRecord({role:"reserve",enabled:true,validation_status:"pending"}),{valid:false,reason:"unvalidated_engine_cannot_be_enabled"});
});

test("validated engine requires evidence and timestamp",()=>{
 assert.equal(validateEngineRecord({role:"primary",enabled:false,validation_status:"validated",validated_at:null,validation_evidence:{}}).valid,false);
});
