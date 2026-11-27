import { createServer } from "node:http";
import { createIngestionHandler } from "./ingestion.js";

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

  return createServer(async (request, response) => {
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("cache-control", "no-store");

    try {
      const url = new URL(request.url, "http://localhost");
      if (await handleIngestion(request, response, url.pathname)) return;

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
                  c.timezone,
                  CASE
                    WHEN pi.status = 'published' THEN 'published'
                    WHEN pi.status = 'scheduled'
                     AND pi.scheduled_at IS NOT NULL
                     AND (pi.scheduled_at AT TIME ZONE c.timezone)::date =
                         (now() AT TIME ZONE c.timezone)::date
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
             LEFT JOIN campaigns c ON c.timezone = pi.timezone
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

      if (request.method === "GET" && url.pathname === "/api/campaigns") {
        const result = await database.query(
          `SELECT id, name, mode, status, daily_target, timezone, created_at, updated_at
             FROM campaigns ORDER BY created_at DESC LIMIT 100`
        );
        send(response, 200, { items: result.rows });
        return;
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

  const shutdown = async () => {
    server.close();
    if (database) await database.close();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  server.listen(port, "0.0.0.0", () => {
    console.log(`API disponível na porta ${port}`);
  });
}
