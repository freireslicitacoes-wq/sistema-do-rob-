import { randomUUID } from "node:crypto";

const LEASE_SECONDS = 300;

export function createClipWorker({
  database,
  workerId = "clip-worker",
  engines = {},
  leaseSeconds = LEASE_SECONDS
}) {
  if (!database?.query) throw new Error("database.query é obrigatório.");

  async function claimNext() {
    const token = randomUUID();
    const result = await database.query(
      `WITH candidate AS (
         SELECT id FROM clip_jobs
          WHERE status = 'queued'
          ORDER BY created_at, id
          FOR UPDATE SKIP LOCKED
          LIMIT 1
       ), claimed AS (
         UPDATE clip_jobs j
            SET status = 'running', claimed_by = $1, lease_token = $2::uuid,
                lease_expires_at = now() + ($3::text || ' seconds')::interval,
                heartbeat_at = now(), started_at = COALESCE(started_at, now()),
                active_engine = primary_engine, attempt_count = attempt_count + 1,
                updated_at = now()
           FROM candidate c
          WHERE j.id = c.id
          RETURNING j.*
       ), attempt AS (
         INSERT INTO clip_job_attempts (clip_job_id, engine_name, attempt_number, status)
         SELECT id, primary_engine, attempt_count, 'started' FROM claimed
         RETURNING id
       )
       SELECT claimed.*, (SELECT id FROM attempt) AS attempt_id
         FROM claimed`,
      [workerId, token, leaseSeconds]
    );
    return result.rows[0] || null;
  }

  async function finish(job, outcome) {
    const success = outcome?.status === "succeeded" &&
      Array.isArray(outcome.clips) && outcome.clips.length > 0;
    const attemptStatus = success ? "succeeded" : "failed";
    const jobStatus = success ? "review_pending" : "needs_attention";
    const result = await database.query(
      `WITH owned AS (
         UPDATE clip_jobs
            SET status = $3, result_summary = $4::jsonb,
                last_error = $5, finished_at = now(), updated_at = now(),
                lease_expires_at = NULL, heartbeat_at = now()
          WHERE id = $1::uuid AND lease_token = $2::uuid AND status = 'running'
          RETURNING id, attempt_count
       ), attempt AS (
         UPDATE clip_job_attempts a
            SET status = $6, output_manifest = $4::jsonb,
                error_code = CASE WHEN $6 = 'failed' THEN 'engine_failed' END,
                error_summary = $5, finished_at = now()
           FROM owned o
          WHERE a.clip_job_id = o.id AND a.attempt_number = o.attempt_count
          RETURNING a.id
       )
       SELECT owned.id FROM owned`,
      [job.id, job.lease_token, jobStatus,
       JSON.stringify(outcome || {}), success ? null : String(outcome?.message || "Motor não confirmou cortes válidos."),
       attemptStatus]
    );
    return result.rows.length === 1;
  }

  async function runOnce() {
    const job = await claimNext();
    if (!job) return { status: "idle" };

    const engine = engines[job.primary_engine];
    if (!engine || engine.validated !== true || typeof engine.run !== "function") {
      await finish(job, {
        status: "unavailable",
        message: `Motor principal "${job.primary_engine}" ainda não está instalado e validado. Nenhum motor reserva será acionado sem validação.`
      });
      return { status: "needs_attention", job_id: job.id, reason: "primary_engine_unavailable" };
    }

    try {
      const outcome = await engine.run({
        job_id: job.id,
        source_asset_id: job.source_asset_id,
        max_clips: job.max_clips,
        min_score: Number(job.min_score),
        options: job.options || {}
      });
      const saved = await finish(job, outcome);
      return { status: saved ? (outcome.status === "succeeded" ? "review_pending" : "needs_attention") : "lease_lost", job_id: job.id };
    } catch (error) {
      const saved = await finish(job, { status: "failed", message: error?.message || "Falha não identificada no motor." });
      return { status: saved ? "needs_attention" : "lease_lost", job_id: job.id };
    }
  }

  return { claimNext, runOnce };
}
