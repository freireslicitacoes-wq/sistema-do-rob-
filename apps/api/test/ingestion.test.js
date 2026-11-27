import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAppServer } from "../src/server.js";

async function withServer(app, run) {
  await new Promise(resolve => app.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  try { await run(base); }
  finally { await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve())); }
}

test("desktop upload stores original bytes and registers metadata", async () => {
  const directory = await mkdtemp(join(tmpdir(), "publisher-media-"));
  const calls = [];
  const database = {
    query: async (sql, values) => {
      calls.push(values);
      return { rows: [{ id: "asset-1", original_name: values[2], file_size_bytes: values[5], sha256: values[6] }] };
    }
  };
  try {
    await withServer(createAppServer({ database, env: { MEDIA_STORAGE_DIR: directory, MAX_UPLOAD_BYTES: "1048576" } }), async base => {
      const form = new FormData();
      const bytes = new Uint8Array(16);
      bytes.set([0,0,0,24,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d]);
      form.append("video", new Blob([bytes], { type: "video/mp4" }), "video-02.mp4");
      const response = await fetch(base + "/api/media-assets/upload", { method: "POST", body: form });
      const body = await response.json();
      assert.equal(response.status, 201);
      assert.equal(body.item.id, "asset-1");
      assert.equal(calls[0][0], "upload");
      assert.equal(calls[0][2], "video-02.mp4");
      assert.equal((await readdir(directory)).length, 1);
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("upload rejects non-multipart requests", async () => {
  await withServer(createAppServer({ database: { query: async () => ({ rows: [] }) } }), async base => {
    const response = await fetch(base + "/api/media-assets/upload", { method: "POST", body: "{}" });
    assert.equal(response.status, 415);
  });
});
