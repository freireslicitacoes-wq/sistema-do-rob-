import test from "node:test";
import assert from "node:assert/strict";
import { createClipWorker } from "../src/clip-worker.js";

test("worker leaves queue idle when no job is available", async () => {
  const worker = createClipWorker({ database: { query: async () => ({ rows: [] }) } });
  assert.deepEqual(await worker.runOnce(), { status: "idle" });
});

test("worker does not activate an unvalidated primary or fallback engine", async () => {
  const calls = [];
  const job = {
    id: "11111111-1111-4111-8111-111111111111",
    lease_token: "22222222-2222-4222-8222-222222222222",
    primary_engine: "chopify", source_asset_id: "33333333-3333-4333-8333-333333333333",
    attempt_count: 1, max_clips: 5, min_score: "8.0", options: {}
  };
  const database = { query: async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes("FOR UPDATE SKIP LOCKED")) return { rows: [job] };
    return { rows: [{ id: job.id }] };
  }};
  let fallbackCalled = false;
  const worker = createClipWorker({
    database,
    engines: { peakcut: { validated: true, run: async () => { fallbackCalled = true; } } }
  });
  const result = await worker.runOnce();
  assert.equal(result.status, "needs_attention");
  assert.equal(fallbackCalled, false);
  assert.match(calls[0].sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(calls[1].sql, /needs_attention/);
});

test("worker sends a validated primary output to review_pending", async () => {
  const job = {
    id: "11111111-1111-4111-8111-111111111111",
    lease_token: "22222222-2222-4222-8222-222222222222",
    primary_engine: "chopify", source_asset_id: "33333333-3333-4333-8333-333333333333",
    attempt_count: 1, max_clips: 2, min_score: "8.0", options: {}
  };
  const calls = [];
  const database = { query: async (sql, values) => {
    calls.push({ sql, values });
    return sql.includes("FOR UPDATE SKIP LOCKED") ? { rows: [job] } : { rows: [{ id: job.id }] };
  }};
  const worker = createClipWorker({
    database,
    engines: { chopify: { validated: true, run: async () => ({ status: "succeeded", clips: ["/safe/clip.mp4"] }) } }
  });
  const result = await worker.runOnce();
  assert.equal(result.status, "review_pending");
  assert.match(calls[1].sql, /lease_token = \$2::uuid/);
  assert.equal(calls[1].values[2], "review_pending");
});
