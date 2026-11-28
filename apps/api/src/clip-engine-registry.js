const ALLOWED_ROLES = new Set(["primary","reserve"]);

export function assessFailover({
  jobStatus,
  attemptInFlight = false,
  publicationStatus = null,
  primary,
  reserve
}) {
  if (publicationStatus === "uploading" || publicationStatus === "uncertain") {
    return { allowed:false, reason:"publication_result_uncertain", action:"human_confirmation_required" };
  }
  if (attemptInFlight || jobStatus === "running") {
    return { allowed:false, reason:"previous_attempt_may_still_be_running", action:"verify_process_and_lease" };
  }
  if (!primary || primary.role !== "primary" || !ALLOWED_ROLES.has(primary.role)) {
    return { allowed:false, reason:"primary_engine_registry_invalid", action:"human_review" };
  }
  if (primary.validation_status !== "validated" || primary.enabled !== true) {
    return { allowed:false, reason:"primary_engine_not_validated", action:"human_review" };
  }
  if (!reserve || reserve.role !== "reserve" || !ALLOWED_ROLES.has(reserve.role)) {
    return { allowed:false, reason:"reserve_engine_registry_invalid", action:"human_review" };
  }
  if (reserve.validation_status !== "validated" || reserve.enabled !== true) {
    return { allowed:false, reason:"reserve_engine_not_validated", action:"keep_job_for_human" };
  }
  if (!["queued","needs_attention","failed"].includes(jobStatus)) {
    return { allowed:false, reason:"job_status_not_safe_for_failover", action:"human_review" };
  }
  return { allowed:true, reason:"both_engines_validated_and_no_attempt_in_flight", action:"reserve_may_be_selected" };
}

export function validateEngineRecord(record) {
  if (!record || !ALLOWED_ROLES.has(record.role)) return { valid:false, reason:"invalid_role" };
  if (record.enabled === true && record.validation_status !== "validated") {
    return { valid:false, reason:"unvalidated_engine_cannot_be_enabled" };
  }
  if (record.validation_status === "validated" && (!record.validated_at || !record.validation_evidence || Object.keys(record.validation_evidence).length === 0)) {
    return { valid:false, reason:"validation_evidence_required" };
  }
  return { valid:true };
}

export function createClipEngineRegistry({ database }) {
  async function list() {
    const result=await database.query(
      `SELECT engine_name,role,repository_url,license_id,validation_status,enabled,
              validated_at,validation_evidence,last_validation_error,updated_at
         FROM clip_engine_registry ORDER BY CASE role WHEN 'primary' THEN 0 ELSE 1 END,engine_name`
    );
    return result.rows;
  }
  async function getFailoverDecision({jobStatus,attemptInFlight=false,publicationStatus=null,primaryName="chopify",reserveName="peakcut"}) {
    const result=await database.query(
      `SELECT engine_name,role,validation_status,enabled FROM clip_engine_registry
        WHERE engine_name = ANY($1::text[])`,[[primaryName,reserveName]]
    );
    const records=Object.fromEntries(result.rows.map(row=>[row.engine_name,row]));
    return assessFailover({jobStatus,attemptInFlight,publicationStatus,primary:records[primaryName],reserve:records[reserveName]});
  }
  return {list,getFailoverDecision};
}
