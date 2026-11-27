import { statfs, lstat, unlink } from "node:fs/promises";
import { resolve, relative, basename, isAbsolute, sep } from "node:path";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function localFilePath(root, reference) {
  if (typeof reference !== "string" || !reference.startsWith("local://")) {
    throw new Error("Referência de armazenamento não é local; exclusão automática bloqueada.");
  }
  const filename = reference.slice("local://".length);
  if (!filename || filename !== basename(filename) || filename.includes("\\") || filename === "." || filename === "..") {
    throw new Error("Caminho de arquivo inválido; exclusão automática bloqueada.");
  }
  const target = resolve(root, filename);
  const rel = relative(root, target);
  if (!rel || rel.startsWith(".."+sep) || rel === ".." || isAbsolute(rel)) {
    throw new Error("Caminho fora da pasta de mídia; exclusão automática bloqueada.");
  }
  return target;
}

export function createStorageManager({ database, directory, fileOps = { lstat, unlink } }) {
  const root = resolve(directory);

  async function inspect() {
    const [fs, policyResult, usageResult] = await Promise.all([
      statfs(root),
      database.query(
        `SELECT enabled, retention_hours, high_watermark_percent, resume_watermark_percent,
                min_free_bytes, capacity_guard_enabled, imports_paused, pause_reason
           FROM storage_policies WHERE id = 1`
      ),
      database.query(
        `SELECT count(*)::int AS assets,
                COALESCE(sum(file_size_bytes) FILTER (WHERE storage_state <> 'deleted'), 0)::bigint AS tracked_bytes,
                count(*) FILTER (WHERE storage_state = 'needs_attention')::int AS needs_attention
           FROM media_assets`
      )
    ]);
    const policy = policyResult.rows[0];
    if (!policy) throw new Error("Política de armazenamento não encontrada.");
    const blockSize = asNumber(fs.bsize);
    const totalBytes = asNumber(fs.blocks) * blockSize;
    const freeBytes = asNumber(fs.bavail) * blockSize;
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    const usedPercent = totalBytes > 0 ? Number((usedBytes / totalBytes * 100).toFixed(2)) : 100;
    const minFreeBytes = asNumber(policy.min_free_bytes);
    let paused = Boolean(policy.imports_paused);
    let reason = policy.pause_reason || null;
    if (policy.capacity_guard_enabled) {
      if (!paused && (usedPercent >= Number(policy.high_watermark_percent) || freeBytes < minFreeBytes)) {
        paused = true;
        reason = freeBytes < minFreeBytes ? "minimum_free_space" : "high_watermark";
      } else if (paused && usedPercent <= Number(policy.resume_watermark_percent) && freeBytes >= minFreeBytes) {
        paused = false;
        reason = null;
      }
      await database.query(
        `UPDATE storage_policies SET imports_paused=$1, pause_reason=$2,
          last_capacity_check_at=now(), updated_at=now() WHERE id=1`,
        [paused, reason]
      );
    }
    return {
      directory: root, total_bytes: totalBytes, free_bytes: freeBytes,
      used_bytes: usedBytes, used_percent: usedPercent,
      tracked_asset_count: usageResult.rows[0]?.assets ?? 0,
      tracked_asset_bytes: asNumber(usageResult.rows[0]?.tracked_bytes),
      files_needing_attention: usageResult.rows[0]?.needs_attention ?? 0,
      import_guard_enabled: Boolean(policy.capacity_guard_enabled),
      imports_paused: paused, pause_reason: reason,
      cleanup_enabled: Boolean(policy.enabled), retention_hours: Number(policy.retention_hours),
      high_watermark_percent: Number(policy.high_watermark_percent),
      resume_watermark_percent: Number(policy.resume_watermark_percent), min_free_bytes: minFreeBytes
    };
  }

  async function assertImportAllowed(expectedBytes = 0) {
    const status = await inspect();
    if (status.imports_paused || status.free_bytes - asNumber(expectedBytes) < status.min_free_bytes) {
      const error = new Error("Importação pausada para proteger o espaço disponível. Libere espaço ou aguarde a limpeza segura.");
      error.statusCode = 507; error.code = "storage_capacity_reached"; error.storage = status;
      throw error;
    }
    return status;
  }

  async function claimDeletionBatch(limit) {
    if (typeof database.transaction !== "function") throw new Error("Banco não oferece transações; limpeza bloqueada.");
    return database.transaction(async tx => {
      const result = await tx.query(
        `WITH candidates AS (
           SELECT ma.id
             FROM media_assets ma
            WHERE ma.preserve_storage = FALSE
              AND ma.storage_state IN ('active','deletion_pending')
              AND EXISTS (SELECT 1 FROM publication_items pi WHERE pi.media_asset_id=ma.id)
              AND NOT EXISTS (
                SELECT 1 FROM publication_items pi
                 WHERE pi.media_asset_id=ma.id AND
                   (pi.status <> 'published' OR pi.published_at IS NULL)
              )
              AND NOT EXISTS (
                SELECT 1 FROM publication_attempts pa
                JOIN publication_items pi ON pi.id=pa.publication_item_id
                 WHERE pi.media_asset_id=ma.id AND pa.status <> 'succeeded'
              )
              AND (SELECT max(pi.published_at) FROM publication_items pi
                    WHERE pi.media_asset_id=ma.id) + make_interval(hours => sp.retention_hours) <= now()
            CROSS JOIN storage_policies sp
            WHERE sp.id = 1
            ORDER BY ma.delete_after NULLS FIRST, ma.created_at
            FOR UPDATE OF ma SKIP LOCKED
            LIMIT $1
         )
         UPDATE media_assets ma
            SET storage_state='deletion_pending', updated_at=now()
           FROM candidates c WHERE ma.id=c.id
         RETURNING ma.id, ma.original_name, ma.storage_reference, ma.file_size_bytes`,
        [limit]
      );
      for (const item of result.rows) {
        await tx.query(
          `INSERT INTO audit_events(entity_type,entity_id,event_type,details)
           VALUES ('media_asset',$1::uuid,'storage_deletion_started',$2::jsonb)`,
          [item.id, JSON.stringify({ original_name: item.original_name, file_size_bytes: item.file_size_bytes })]
        );
      }
      return result.rows;
    });
  }

  async function cleanup({ limit = 25 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      const error = new Error("O limite de limpeza deve estar entre 1 e 100.");
      error.statusCode = 400; throw error;
    }
    const policyResult = await database.query("SELECT enabled FROM storage_policies WHERE id=1");
    if (!policyResult.rows[0]?.enabled) {
      return { enabled: false, deleted: 0, needs_attention: 0, message: "Limpeza automática desativada; nenhum arquivo foi alterado." };
    }
    const claimed = await claimDeletionBatch(limit);
    let deleted = 0;
    let needsAttention = 0;
    for (const item of claimed) {
      try {
        const target = localFilePath(root, item.storage_reference);
        try {
          const info = await fileOps.lstat(target);
          if (!info.isFile() || info.isSymbolicLink()) throw new Error("O destino não é um arquivo regular; exclusão bloqueada.");
          await fileOps.unlink(target);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        await database.query(
          `UPDATE media_assets SET storage_state='deleted', storage_deleted_at=now(),
             storage_last_error=NULL, updated_at=now() WHERE id=$1::uuid AND storage_state='deletion_pending'`,
          [item.id]
        );
        await database.query(
          `INSERT INTO audit_events(entity_type,entity_id,event_type,details)
           VALUES ('media_asset',$1::uuid,'storage_deletion_completed',$2::jsonb)`,
          [item.id, JSON.stringify({ original_name: item.original_name })]
        );
        deleted++;
      } catch (error) {
        await database.query(
          `UPDATE media_assets SET storage_state='needs_attention', storage_last_error=$2,
             updated_at=now() WHERE id=$1::uuid AND storage_state='deletion_pending'`,
          [item.id, String(error.message || "storage deletion failed").slice(0, 1000)]
        );
        await database.query(
          `INSERT INTO audit_events(entity_type,entity_id,event_type,details)
           VALUES ('media_asset',$1::uuid,'storage_deletion_failed',$2::jsonb)`,
          [item.id, JSON.stringify({ error: String(error.message || "storage deletion failed").slice(0, 500) })]
        );
        needsAttention++;
      }
    }
    return { enabled: true, considered: claimed.length, deleted, needs_attention: needsAttention };
  }

  async function setPreserve(assetId, preserve) {
    const result = await database.query(
      `UPDATE media_assets SET preserve_storage=$2,
         storage_state=CASE WHEN $2 THEN 'active' ELSE storage_state END,
         storage_last_error=CASE WHEN $2 THEN NULL ELSE storage_last_error END,
         updated_at=now() WHERE id=$1::uuid
       RETURNING id, original_name, preserve_storage, storage_state`,
      [assetId, preserve]
    );
    return result.rows[0] || null;
  }

  return { inspect, assertImportAllowed, cleanup, setPreserve };
}
