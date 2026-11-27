import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStorageManager } from "../src/storage.js";

test("storage monitor persists a pause when free space is below reserve", async () => {
  const directory = await mkdtemp(join(tmpdir(), "publisher-storage-"));
  const updates = [];
  const database = {
    query: async (sql, values) => {
      if (sql.includes("FROM storage_policies")) return { rows: [{
        enabled: false, retention_hours: 72, high_watermark_percent: 85,
        resume_watermark_percent: 70, min_free_bytes: "999999999999999",
        capacity_guard_enabled: true, imports_paused: false, pause_reason: null
      }] };
      if (sql.includes("FROM media_assets")) return { rows: [{ assets: 0, tracked_bytes: "0", needs_attention: 0 }] };
      updates.push(values);
      return { rows: [] };
    }
  };
  try {
    const manager = createStorageManager({ database, directory });
    const status = await manager.inspect();
    assert.equal(status.imports_paused, true);
    assert.equal(status.pause_reason, "minimum_free_space");
    assert.equal(updates.length, 1);
    await assert.rejects(() => manager.assertImportAllowed(), error => error.statusCode === 507);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("storage monitor does not enable automatic cleanup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "publisher-storage-"));
  const database = { query: async sql => {
    if (sql.includes("FROM storage_policies")) return { rows: [{
      enabled: false, retention_hours: 72, high_watermark_percent: 85,
      resume_watermark_percent: 70, min_free_bytes: "0",
      capacity_guard_enabled: false, imports_paused: false, pause_reason: null
    }] };
    if (sql.includes("FROM media_assets")) return { rows: [{ assets: 2, tracked_bytes: "1024", needs_attention: 0 }] };
    return { rows: [] };
  } };
  try {
    const status = await createStorageManager({ database, directory }).inspect();
    assert.equal(status.cleanup_enabled, false);
    assert.equal(status.tracked_asset_count, 2);
    assert.equal(status.tracked_asset_bytes, 1024);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
