import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createIngestionHandler } from "./ingestion.js";
import { createStorageManager } from "./storage.js";
import { createStorageCleanupScheduler } from "./storage-scheduler.js";
import { createAlertManager } from "./alerts.js";
import { createOperationsManager } from "./operations-manager.js";
import { createClipEngineRegistry } from "./clip-engine-registry.js";

const JSON_LIMIT_BYTES = 1024 * 1024;

function send(response, status, body) {
  response.writeHead(status);
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > JSON_LIMIT_BYTES) {
      const error = new Error("Corpo da requisição excede 1 MB.");
      error.statusCode = 413;
      throw error;
    }
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("JSON inválido.");
    error.statusCode = 400;
    throw error;
  }
}

function requiredString(value, field, max = 500) {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    const error = new Error(`${field} é obrigatório e deve ter até ${max} caracteres.`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}

function optionalNonNegativeInteger(value, field) {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) {
    const error = new Error(`${field} deve ser um inteiro maior ou igual a zero.`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

export function createAppServer({ env = process.env, database = null } = {}) {
  const serviceName = env.SERVICE_NAME || "tiktok-auto-publisher-api";
  const handleIngestion = createIngestionHandler({ database, env });
  const storage = database ? createStorageManager({ database, directory: env.MEDIA_STORAGE_DIR || "./var/media" }) : null;
  const alerts = database ? createAlertManager({ database }) : null;
  const operationsManager = database ? createOperationsManager({ database, alerts }) : null;
  const clipEngineRegistry = database ? createClipEngineRegistry({ database }) : null;
  const cleanupScheduler = storage ? createStorageCleanupScheduler({
    storage, database,
    enabled: env.STORAGE_CLEANUP_SCHEDULER_ENABLED === "true",
    intervalMs: Math.max(60_000, Number(env.STORAGE_CLEANUP_INTERVAL_MS || 900_000)),
    batchSize: Math.min(100, Math.max(1, Number(env.STORAGE_CLEANUP_BATCH_SIZE || 25)))
  }) : null;

  const server = createServer(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("cache-control", "no-store");

    try {
      const url = new URL(request.url, "http://localhost");
      if (await handleIngestion(request, response, url.pathname)) return;

      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = await readFile(new URL("../../web/index.html", import.meta.url));
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
        return;
      }

      if (request.method === "GET" && url.pathname === "/health") {
        let databaseStatus = "not_configured";
        if (database) {
          try {
            await database.check();
            databaseStatus = "connected";
          } catch {
            databaseStatus = "unavailable";
          }
        }
        const healthy = databaseStatus !== "unavailable";
        send(response, healthy ? 200 : 503, {
          status: healthy ? "ok" : "degraded",
          service: serviceName,
          database: databaseStatus,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!database) {
        send(response, 503, { error: "database_not_configured", message: "Banco de dados não configurado." });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/manager/history") {
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));
        send(response,200,{items:await operationsManager.history(limit)});
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/manager/status") {
        send(response,200,{manager:{available:true,mode:"diagnostic_only",automatic_repairs:false,primary_engine_validation_required:true,fallback_engine_validation_required:true,publication_retry_automatic:false}});
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/manager/diagnose") {
        const report = await operationsManager.diagnose();
        send(response,200,{report});
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/alerts") {
        const status = url.searchParams.get("status") || "active";
        if (!["active","acknowledged","resolved","all"].includes(status)) { send(response,400,{error:"invalid_alert_status",message:"Filtro de alertas inválido."}); return; }
        const items = await alerts.list({ status, limit: Math.min(200,Math.max(1,Number(url.searchParams.get("limit")||100))) });
        send(response,200,{items,summary:{active:items.filter(a=>a.status==="active").length,acknowledged:items.filter(a=>a.status==="acknowledged").length,resolved:items.filter(a=>a.status==="resolved").length}});
        return;
      }

      const acknowledgeMatch = url.pathname.match(/^\\/api\\/alerts\\/([0-9a-f-]{36})\\/acknowledge$/i);
      if (request.method === "POST" && acknowledgeMatch) {
        const item = await alerts.acknowledge(acknowledgeMatch[1]);
        if (!item) { send(response,404,{error:"alert_not_found_or_inactive",message:"Alerta não encontrado ou já não está ativo."}); return; }
        send(response,200,{item});
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/storage/maintenance") {
        send(response, 200, { scheduler: cleanupScheduler?.status() || { enabled: false, reason: "storage_not_configured" } });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/storage/status") {
        if (!storage) { send(response, 503, { error: "storage_not_configured", message: "Armazenamento não configurado." }); return; }
        await (await import("node:fs/promises")).mkdir(env.MEDIA_STORAGE_DIR || "./var/media", { recursive: true });
        send(response, 200, { storage: await storage.inspect() });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/storage/cleanup") {
        if (!storage) { send(response, 503, { error: "storage_not_configured", message: "Armazenamento não configurado." }); return; }
        const body = await readJson(request);
        const limit = body.limit === undefined ? 25 : body.limit;
        const result = await storage.cleanup({ limit });
        send(response, result.enabled ? 200 : 409, { cleanup: result });
        return;
      }

      const preserveMatch = url.pathname.match(/^\\/api\\/media-assets\\/([0-9a-f-]{36})\\/preserve$/i);
      if (request.method === "POST" && preserveMatch) {
        const body = await readJson(request);
        if (typeof body.preserve !== "boolean") { send(response, 400, { error: "invalid_preserve_value", message: "Informe preserve como true ou false." }); return; }
        const item = await storage.setPreserve(preserveMatch[1], body.preserve);
        if (!item) { send(response, 404, { error: "media_asset_not_found", message: "Vídeo não encontrado." }); return; }
        send(response, 200, { item });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/media-assets") {
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
        const result = await database.query(
          `SELECT id, source_type, source_reference, original_name, storage_reference,
                  mime_type, file_size_bytes, duration_ms, sha256, natural_sort_number,
                  import_position, status, validation_message, created_at, updated_at
             FROM media_assets
            ORDER BY natural_sort_number NULLS LAST, original_name, import_position
            LIMIT $1`,
          [limit]
        );
        send(response, 200, { items: result.rows });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/media-assets") {
        const body = await readJson(request);
        const sourceType = requiredString(body.source_type, "source_type", 40);
        if (!["upload", "google_drive", "authorized_url"].includes(sourceType)) {
          send(response, 400, { error: "invalid_source_type", message: "source_type inválido." });
          return;
        }
        const originalName = requiredString(body.original_name, "original_name");
        const storageReference = requiredString(body.storage_reference, "storage_reference", 2000);
        const sourceReference = body.source_reference == null ? null : requiredString(body.source_reference, "source_reference", 2000);
        const mimeType = body.mime_type == null ? null : requiredString(body.mime_type, "mime_type", 150);
        const fileSize = optionalNonNegativeInteger(body.file_size_bytes, "file_size_bytes");
        const duration = optionalNonNegativeInteger(body.duration_ms, "duration_ms");
        const sortNumber = optionalNonNegativeInteger(body.natural_sort_number, "natural_sort_number");
        const result = await database.query(
          `INSERT INTO media_assets
             (source_type, source_reference, original_name, storage_reference, mime_type,
              file_size_bytes, duration_ms, natural_sort_number)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, source_type, source_reference, original_name, storage_reference,
                     mime_type, file_size_bytes, duration_ms, natural_sort_number,
                     import_position, status, created_at`,
          [sourceType, sourceReference, originalName, storageReference, mimeType, fileSize, duration, sortNumber]
        );
        send(response, 201, { item: result.rows[0] });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/library/status") {
        const result = await database.query(
          `SELECT ma.id, ma.original_name, ma.file_size_bytes, ma.status AS asset_status,
                  pi.status AS publication_status, pi.scheduled_at, pi.published_at,
                  pi.timezone,
                  CASE
                    WHEN pi.status = 'published' THEN 'published'
                    WHEN pi.status = 'scheduled'
                     AND pi.scheduled_at IS NOT NULL
                     AND (pi.scheduled_at AT TIME ZONE pi.timezone)::date =
                         (now() AT TIME ZONE pi.timezone)::date
                    THEN 'pending_today'
                    ELSE 'not_published'
                  END AS visual_status
             FROM media_assets ma
             LEFT JOIN LATERAL (
               SELECT item.status, item.scheduled_at, item.published_at, item.sequence_number, campaign.timezone
                 FROM publication_items item
                 JOIN campaigns campaign ON campaign.id = item.campaign_id
                WHERE item.media_asset_id = ma.id
                ORDER BY item.updated_at DESC, item.sequence_number DESC
                LIMIT 1
             ) pi ON TRUE
            ORDER BY ma.natural_sort_number NULLS LAST, ma.original_name, ma.import_position
            LIMIT 500`
        );
        const items = result.rows;
        const summary = {
          not_published: items.filter((item) => item.visual_status === "not_published").length,
          pending_today: items.filter((item) => item.visual_status === "pending_today").length,
          published: items.filter((item) => item.visual_status === "published").length
        };
        send(response, 200, { summary, items });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/clip-jobs") {
        const body = await readJson(request);
        const assetId = requiredString(body.media_asset_id, "media_asset_id", 36);
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(assetId)) { send(response, 400, { error: "invalid_media_asset_id", message: "Identificador do vídeo inválido." }); return; }
        const maxClips = body.max_clips === undefined ? 5 : body.max_clips;
        const minScore = body.min_score === undefined ? 8 : body.min_score;
        if (!Number.isInteger(maxClips) || maxClips < 1 || maxClips > 50 || typeof minScore !== "number" || !Number.isFinite(minScore) || minScore < 0 || minScore > 10) {
          send(response, 400, { error: "invalid_clip_options", message: "max_clips deve ser 1–50 e min_score de 0–10." }); return;
        }
        const result = await database.query(
          `INSERT INTO clip_jobs (source_asset_id, max_clips, min_score)
           SELECT id, $2, $3 FROM media_assets WHERE id = $1::uuid AND status IN ('imported', 'ready')
           RETURNING id, source_asset_id, status, primary_engine, fallback_engine, active_engine, max_clips, min_score, created_at`,
          [assetId, maxClips, minScore]
        );
        if (!result.rows.length) { send(response, 422, { error: "asset_not_available", message: "Vídeo não encontrado ou indisponível para gerar cortes." }); return; }
        send(response, 202, { job: result.rows[0], message: "Trabalho registrado na fila; o processamento será iniciado pelo worker." }); return;
      }

      if (request.method === "GET" && url.pathname === "/api/clip-jobs") {
        const result = await database.query(
          `SELECT j.id, j.source_asset_id, m.original_name, j.status, j.primary_engine, j.fallback_engine,
                  j.active_engine, j.max_clips, j.min_score, j.last_error, j.created_at, j.started_at, j.finished_at
             FROM clip_jobs j JOIN media_assets m ON m.id = j.source_asset_id
            ORDER BY j.created_at DESC LIMIT 100`
        );
        send(response, 200, { items: result.rows }); return;
      }

      const clipJobMatch = url.pathname.match(/^\\/api\\/clip-jobs\\/([0-9a-f-]{36})(\\/cancel)?$/i);
      if (request.method === "GET" && clipJobMatch && !clipJobMatch[2]) {
        const result = await database.query(
          `SELECT j.*, m.original_name,
                  COALESCE(json_agg(json_build_object('id', a.id, 'engine_name', a.engine_name,
                    'attempt_number', a.attempt_number, 'status', a.status, 'error_code', a.error_code,
                    'error_summary', a.error_summary, 'started_at', a.started_at, 'finished_at', a.finished_at)
                    ORDER BY a.started_at) FILTER (WHERE a.id IS NOT NULL), '[]'::json) AS attempts
             FROM clip_jobs j JOIN media_assets m ON m.id = j.source_asset_id
             LEFT JOIN clip_job_attempts a ON a.clip_job_id = j.id
            WHERE j.id = $1::uuid GROUP BY j.id, m.original_name`, [clipJobMatch[1]]
        );
        if (!result.rows.length) { send(response, 404, { error: "clip_job_not_found", message: "Trabalho não encontrado." }); return; }
        send(response, 200, { job: result.rows[0] }); return;
      }

      if (request.method === "POST" && clipJobMatch && clipJobMatch[2] === "/cancel") {
        const result = await database.query(
          `UPDATE clip_jobs SET status = 'cancelled', updated_at = now()
            WHERE id = $1::uuid AND status = 'queued' RETURNING id, status`, [clipJobMatch[1]]
        );
        if (!result.rows.length) { send(response, 409, { error: "clip_job_not_cancellable", message: "Só é possível cancelar um trabalho que ainda esteja aguardando na fila." }); return; }
        send(response, 200, { job: result.rows[0] }); return;
      }

      if (request.method === "GET" && url.pathname === "/api/campaigns") {
        const result = await database.query(
          `SELECT id, name, mode, status, daily_target, timezone, created_at, updated_at
             FROM campaigns ORDER BY created_at DESC LIMIT 100`
        );
        send(response, 200, { items: result.rows });
        return;
      }


      if (request.method === "POST" && url.pathname === "/api/campaigns/from-library") {
        const body = await readJson(request);
        const name = requiredString(body.name, "name", 200);
        const mode = body.mode === undefined ? "bulk_library" : requiredString(body.mode, "mode", 40);
        if (!["bulk_library", "clips", "live_monitor"].includes(mode)) {
          send(response, 400, { error: "invalid_campaign_mode", message: "mode inválido." }); return;
        }
        const ids = body.media_asset_ids;
        if (!Array.isArray(ids) || ids.length < 1 || ids.length > 500) {
          send(response, 400, { error: "invalid_selection", message: "Selecione de 1 a 500 vídeos." }); return;
        }
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (ids.some(id => typeof id !== "string" || !uuidPattern.test(id)) || new Set(ids).size !== ids.length) {
          send(response, 400, { error: "invalid_selection", message: "A seleção contém identificadores inválidos ou repetidos." }); return;
        }
        const dailyTarget = optionalNonNegativeInteger(body.daily_target, "daily_target");
        if (dailyTarget === 0) { send(response, 400, { error: "invalid_daily_target", message: "daily_target deve ser maior que zero." }); return; }
        const timezone = body.timezone === undefined ? "America/Belem" : requiredString(body.timezone, "timezone", 100);
        try { new Intl.DateTimeFormat("pt-BR", { timeZone: timezone }); }
        catch { send(response, 400, { error: "invalid_timezone", message: "Fuso horário inválido." }); return; }
        const result = await database.query(
          `WITH eligible AS MATERIALIZED (
             SELECT id, natural_sort_number, original_name, import_position
               FROM media_assets WHERE id = ANY($5::uuid[]) AND status IN ('imported', 'ready')
           ), valid_selection AS (
             SELECT count(*) = cardinality($5::uuid[]) AS is_valid FROM eligible
           ), new_campaign AS (
             INSERT INTO campaigns (name, mode, daily_target, timezone)
             SELECT $1, $2, $3, $4 WHERE (SELECT is_valid FROM valid_selection) RETURNING id
           ), numbered AS (
             SELECT eligible.id, row_number() OVER (
               ORDER BY eligible.natural_sort_number NULLS LAST, eligible.original_name, eligible.import_position
             ) AS sequence_number FROM eligible
           ), inserted_items AS (
             INSERT INTO publication_items (campaign_id, media_asset_id, sequence_number)
             SELECT new_campaign.id, numbered.id, numbered.sequence_number
               FROM numbered CROSS JOIN new_campaign RETURNING id
           )
           SELECT new_campaign.id AS campaign_id, (SELECT count(*) FROM inserted_items)::int AS item_count
             FROM new_campaign`,
          [name, mode, dailyTarget, timezone, ids]
        );
        if (!result.rows.length) {
          send(response, 422, { error: "selection_not_available", message: "Um ou mais vídeos não existem ou não estão disponíveis para uma campanha." }); return;
        }
        send(response, 201, { campaign: result.rows[0], status: "draft" }); return;
      }

      if (request.method === "POST" && url.pathname === "/api/campaigns") {
        const body = await readJson(request);
        const name = requiredString(body.name, "name", 200);
        const mode = requiredString(body.mode, "mode", 40);
        if (!["bulk_library", "clips", "live_monitor"].includes(mode)) {
          send(response, 400, { error: "invalid_campaign_mode", message: "mode inválido." });
          return;
        }
        const dailyTarget = optionalNonNegativeInteger(body.daily_target, "daily_target");
        if (dailyTarget === 0) {
          send(response, 400, { error: "invalid_daily_target", message: "daily_target deve ser maior que zero." });
          return;
        }
        const timezone = body.timezone === undefined ? "America/Belem" : requiredString(body.timezone, "timezone", 100);
        const result = await database.query(
          `INSERT INTO campaigns (name, mode, daily_target, timezone)
           VALUES ($1,$2,$3,$4)
           RETURNING id, name, mode, status, daily_target, timezone, created_at`,
          [name, mode, dailyTarget, timezone]
        );
        send(response, 201, { item: result.rows[0] });
        return;
      }

      send(response, 404, { error: "not_found", message: "Rota não encontrada." });
    } catch (error) {
      const status = error.statusCode || (error.code === "23505" ? 409 : 500);
      if (status >= 500) {
        console.error("Erro ao processar requisição:", error.message);
      }
      send(response, status, {
        error: status === 500 ? "internal_error" : status === 409 ? "conflict" : "invalid_request",
        message: status === 500 ? "Não foi possível concluir a operação." : error.message
      });
    }
  });
  server.storageCleanupScheduler = cleanupScheduler;
  return server;
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  const port = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT deve ser um número entre 1 e 65535.");
  }

  const database = process.env.DATABASE_URL
    ? (await import("./db.js")).createDatabase({ connectionString: process.env.DATABASE_URL })
    : null;
  const server = createAppServer({ database });

  if (server.storageCleanupScheduler?.start()) {
    console.log("Agendador de limpeza de armazenamento ativado (configuração explícita).");
  }

  const shutdown = async () => {
    server.storageCleanupScheduler?.stop();
    server.close();
    if (database) await database.close();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(port, "0.0.0.0", () => {
    console.log(`API disponível na porta ${port}`);
  });
}
