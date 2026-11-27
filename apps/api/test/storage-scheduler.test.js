import test from "node:test";
import assert from "node:assert/strict";
import { createStorageCleanupScheduler } from "../src/storage-scheduler.js";

test("scheduler does not start or clean unless explicitly enabled", async () => {
  let cleanups = 0;
  const scheduler = createStorageCleanupScheduler({
    storage: { cleanup: async () => { cleanups++; } },
    database: { withAdvisoryLock: async (_key, callback) => ({ acquired: true, result: await callback() }) },
    enabled: false,
    logger: { error() {} }
  });
  assert.equal(scheduler.start(), false);
  assert.deepEqual(await scheduler.tick(), { skipped: true, reason: "disabled_or_running" });
  assert.equal(cleanups, 0);
  assert.equal(scheduler.status().enabled, false);
});

test("scheduler runs cleanup only while holding the shared database lock", async () => {
  let cleanups = 0;
  let lockKey;
  const scheduler = createStorageCleanupScheduler({
    storage: { cleanup: async options => { cleanups++; assert.deepEqual(options, { limit: 7 }); return { enabled: true, deleted: 2 }; } },
    database: { withAdvisoryLock: async (key, callback) => { lockKey = key; return { acquired: true, result: await callback() }; } },
    enabled: true, batchSize: 7, logger: { error() {} }
  });
  const result = await scheduler.tick();
  assert.equal(result.skipped, false);
  assert.equal(result.result.deleted, 2);
  assert.equal(cleanups, 1);
  assert.equal(lockKey, "724198301");
  assert.ok(scheduler.status().last_run_at);
  assert.equal(scheduler.status().last_error, null);
});

test("scheduler skips when another instance owns the database lock", async () => {
  let cleanups = 0;
  const scheduler = createStorageCleanupScheduler({
    storage: { cleanup: async () => { cleanups++; } },
    database: { withAdvisoryLock: async () => ({ acquired: false }) },
    enabled: true, logger: { error() {} }
  });
  assert.deepEqual(await scheduler.tick(), { skipped: true, reason: "another_instance_running" });
  assert.equal(cleanups, 0);
});

test("scheduler records failure without losing the next opportunity", async () => {
  let attempts = 0;
  const scheduler = createStorageCleanupScheduler({
    storage: { cleanup: async () => { attempts++; throw new Error("temporary failure"); } },
    database: { withAdvisoryLock: async (_key, callback) => ({ acquired: true, result: await callback() }) },
    enabled: true, logger: { error() {} }
  });
  const result = await scheduler.tick();
  assert.equal(result.error, "temporary failure");
  assert.equal(scheduler.status().last_error, "temporary failure");
  assert.equal(scheduler.status().running, false);
});
