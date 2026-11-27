import { statfs } from "node:fs/promises";
import { resolve } from "node:path";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export function createStorageManager({ database, directory }) {
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
        `UPDATE storage_policies
            SET imports_paused = $1, pause_reason = $2, last_capacity_check_at = now(), updated_at = now()
          WHERE id = 1`,
        [paused, reason]
      );
    }

    return {
      directory: root,
      total_bytes: totalBytes,
      free_bytes: freeBytes,
      used_bytes: usedBytes,
      used_percent: usedPercent,
      tracked_asset_count: usageResult.rows[0]?.assets ?? 0,
      tracked_asset_bytes: asNumber(usageResult.rows[0]?.tracked_bytes),
      files_needing_attention: usageResult.rows[0]?.needs_attention ?? 0,
      import_guard_enabled: Boolean(policy.capacity_guard_enabled),
      imports_paused: paused,
      pause_reason: reason,
      cleanup_enabled: Boolean(policy.enabled),
      retention_hours: Number(policy.retention_hours),
      high_watermark_percent: Number(policy.high_watermark_percent),
      resume_watermark_percent: Number(policy.resume_watermark_percent),
      min_free_bytes: minFreeBytes
    };
  }

  async function assertImportAllowed(expectedBytes = 0) {
    const status = await inspect();
    if (status.imports_paused || status.free_bytes - asNumber(expectedBytes) < status.min_free_bytes) {
      const error = new Error("Importação pausada para proteger o espaço disponível. Libere espaço ou aguarde a limpeza segura.");
      error.statusCode = 507;
      error.code = "storage_capacity_reached";
      error.storage = status;
      throw error;
    }
    return status;
  }

  return { inspect, assertImportAllowed };
}
