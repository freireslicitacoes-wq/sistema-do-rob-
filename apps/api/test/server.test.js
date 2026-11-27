import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server.js";

async function withServer(app, run) {
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  const address = app.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => app.close((error) => error ? reject(error) : resolve()));
  }
}

test("GET /health reports API and unconfigured database", async () => {
  await withServer(createAppServer({ env: { SERVICE_NAME: "test-api" } }), async (base) => {
    const response = await fetch(`${base}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "test-api");
    assert.equal(body.database, "not_configured");
  });
});

test("unknown routes return 404", async () => {
  await withServer(createAppServer(), async (base) => {
    const response = await fetch(`${base}/missing`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "not_found");
  });
});

test("campaign creation uses parameterized SQL and default timezone", async () => {
  const calls = [];
  const database = {
    check: async () => true,
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows: [{ id: "campaign-1", name: values[0], mode: values[1], timezone: values[3] }] };
    }
  };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(`${base}/api/campaigns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Biblioteca", mode: "bulk_library" })
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.item.timezone, "America/Belem");
    assert.deepEqual(calls[0].values, ["Biblioteca", "bulk_library", null, "America/Belem"]);
    assert.match(calls[0].sql, /\$1/);
  });
});

test("invalid campaign mode is rejected", async () => {
  const database = { query: async () => { throw new Error("query should not run"); } };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(`${base}/api/campaigns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Teste", mode: "unknown" })
    });
    assert.equal(response.status, 400);
  });
});

test("database errors do not expose internal details", async () => {
  const database = { query: async () => { throw new Error("secret database detail"); } };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(`${base}/api/campaigns`);
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.message, "Não foi possível concluir a operação.");
    assert.doesNotMatch(JSON.stringify(body), /secret database detail/);
  });
});

test("dashboard is served from the API root", async () => {
  await withServer(createAppServer(), async (base) => {
    const response = await fetch(base + "/");
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(html, /TikTok Auto Publisher AI/);
  });
});

test("library status returns visual categories and counts", async () => {
  const rows = [
    { id: "a", original_name: "01.mp4", visual_status: "not_published", publication_status: null },
    { id: "b", original_name: "02.mp4", visual_status: "pending_today", publication_status: "scheduled" },
    { id: "c", original_name: "03.mp4", visual_status: "published", publication_status: "published" }
  ];
  let sqlSeen = "";
  const database = { query: async (sql) => { sqlSeen = sql; return { rows }; } };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(base + "/api/library/status");
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.summary, { not_published: 1, pending_today: 1, published: 1 });
    assert.equal(body.items[1].visual_status, "pending_today");
    assert.match(sqlSeen, /LEFT JOIN LATERAL/);
    assert.doesNotMatch(sqlSeen, /pi\.timezone\s*=\s*pi\.timezone/);
  });
});


test("dashboard exposes desktop upload and public Google Drive import forms", async () => {
  await withServer(createAppServer(), async (base) => {
    const response = await fetch(base + "/");
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /id="uploadForm"/);
    assert.match(html, /\/api\/media-assets\/upload/);
    assert.match(html, /id="driveForm"/);
    assert.match(html, /\/api\/media-assets\/import-google-drive/);
    assert.match(html, /qualquer pessoa com o link/i);
    assert.match(html, /não deve ser exposta à internet/i);
  });
});
