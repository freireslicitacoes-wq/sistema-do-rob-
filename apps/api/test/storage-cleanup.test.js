import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStorageManager } from "../src/storage.js";

test("cleanup remains disabled unless policy explicitly enables it", async () => {
  const directory = await mkdtemp(join(tmpdir(), "publisher-cleanup-"));
  let unlinks = 0;
  const database = { query: async () => ({ rows: [{ enabled: false }] }) };
  try {
    const manager = createStorageManager({ database, directory, fileOps: {
      lstat: async () => ({ isFile: () => true, isSymbolicLink: () => false }),
      unlink: async () => { unlinks++; }
    }});
    const result = await manager.cleanup();
    assert.equal(result.enabled, false);
    assert.equal(result.deleted, 0);
    assert.equal(unlinks, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("cleanup claims in a transaction, unlinks only claimed local file, and audits completion", async () => {
  const directory = await mkdtemp(join(tmpdir(), "publisher-cleanup-"));
  const calls = [];
  let unlinks = 0;
  const candidate = { id: "123e4567-e89b-42d3-a456-426614174000", original_name: "old.mp4", storage_reference: "local://stored.mp4", file_size_bytes: "1024" };
  const database = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("SELECT enabled")) return { rows: [{ enabled: true }] };
      return { rows: [] };
    },
    transaction: async callback => callback({ query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("WITH candidates")) return { rows: [candidate] };
      return { rows: [] };
    }})
  };
  try {
    const manager = createStorageManager({ database, directory, fileOps: {
      lstat: async path => {
        assert.equal(path, join(directory, "stored.mp4"));
        return { isFile: () => true, isSymbolicLink: () => false };
      },
      unlink: async path => { assert.equal(path, join(directory, "stored.mp4")); unlinks++; }
    }});
    const result = await manager.cleanup({ limit: 5 });
    assert.deepEqual(result, { enabled: true, considered: 1, deleted: 1, needs_attention: 0 });
    assert.equal(unlinks, 1);
    assert.ok(calls.some(call => call.sql.includes("storage_deletion_started")));
    assert.ok(calls.some(call => call.sql.includes("storage_deletion_completed")));
    const eligibility = calls.find(call => call.sql.includes("WITH candidates")).sql;
    assert.match(eligibility, /pi\.status <> 'published'/);
    assert.match(eligibility, /pa\.status <> 'succeeded'/);
    assert.match(eligibility, /make_interval\(hours => sp\.retention_hours\)/);
    assert.match(eligibility, /SKIP LOCKED/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("cleanup refuses paths outside the media directory and records attention", async () => {
  const directory = await mkdtemp(join(tmpdir(), "publisher-cleanup-"));
  const updates = [];
  const candidate = { id: "123e4567-e89b-42d3-a456-426614174000", original_name: "bad.mp4", storage_reference: "local://../outside.mp4", file_size_bytes: "1" };
  const database = {
    query: async (sql, values) => {
      if (sql.includes("SELECT enabled")) return { rows: [{ enabled: true }] };
      updates.push({ sql, values }); return { rows: [] };
    },
    transaction: async callback => callback({ query: async sql => sql.includes("WITH candidates") ? { rows: [candidate] } : { rows: [] } })
  };
  try {
    const manager = createStorageManager({ database, directory, fileOps: {
      lstat: async () => { throw new Error("must not inspect outside path"); },
      unlink: async () => { throw new Error("must not unlink outside path"); }
    }});
    const result = await manager.cleanup();
    assert.equal(result.deleted, 0);
    assert.equal(result.needs_attention, 1);
    assert.ok(updates.some(call => call.sql.includes("storage_state='needs_attention'")));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
