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

test("campaign detail returns its associated videos in sequence", async () => {
  const campaign = {
    id: "123e4567-e89b-42d3-a456-426614174000",
    name: "Campanha teste",
    status: "draft",
    videos: [{ sequence_number: 1, video_name: "video.mp4", publication_status: "draft" }]
  };
  let sqlSeen = "";
  const database = { query: async (sql, values) => {
    sqlSeen = sql;
    assert.deepEqual(values, [campaign.id]);
    return { rows: [campaign] };
  } };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(base + "/api/campaigns/" + campaign.id);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.campaign.videos[0].video_name, "video.mp4");
    assert.match(sqlSeen, /LEFT JOIN publication_items/);
    assert.match(sqlSeen, /ORDER BY pi\.sequence_number/);
  });
});

test("campaign detail returns 404 when campaign does not exist", async () => {
  const database = { query: async () => ({ rows: [] }) };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(base + "/api/campaigns/123e4567-e89b-42d3-a456-426614174000");
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "campaign_not_found");
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

test("campaign from library creates a draft with a validated selection", async () => {
  const calls = [];
  const database = { query: async (sql, values) => { calls.push({sql,values}); return {rows:[{campaign_id:"campaign-1",item_count:2}]}; } };
  const ids = ["123e4567-e89b-42d3-a456-426614174000","123e4567-e89b-42d3-a456-426614174001"];
  await withServer(createAppServer({database}), async base => {
    const response = await fetch(base+"/api/campaigns/from-library", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Lote de vídeos",media_asset_ids:ids})});
    const body = await response.json();
    assert.equal(response.status,201); assert.equal(body.status,"draft"); assert.equal(body.campaign.item_count,2);
    assert.deepEqual(calls[0].values,["Lote de vídeos","bulk_library",null,"America/Belem",ids]);
    assert.match(calls[0].sql,/row_number\(\) OVER/);
  });
});
test("campaign from library rejects empty and duplicate selections", async () => {
  const database={query:async()=>{throw new Error("query should not run");}};
  await withServer(createAppServer({database}),async base=>{
    for(const ids of [[],["123e4567-e89b-42d3-a456-426614174000","123e4567-e89b-42d3-a456-426614174000"]]){
      const response=await fetch(base+"/api/campaigns/from-library",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Teste",media_asset_ids:ids})});
      assert.equal(response.status,400);
    }
  });
});
test("campaign from library returns 422 if a selected asset is unavailable", async () => {
  const database={query:async()=>({rows:[]})};
  await withServer(createAppServer({database}),async base=>{
    const response=await fetch(base+"/api/campaigns/from-library",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Teste",media_asset_ids:["123e4567-e89b-42d3-a456-426614174000"]})});
    assert.equal(response.status,422);
  });
});

test("clip job creation queues an asset with primary and fallback engines", async () => {
  const calls = [];
  const database = { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [{ id: "job-1", source_asset_id: values[0], status: "queued", primary_engine: "chopify", fallback_engine: "peakcut" }] }; } };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(base + "/api/clip-jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ media_asset_id: "123e4567-e89b-42d3-a456-426614174000" }) });
    const body = await response.json();
    assert.equal(response.status, 202); assert.equal(body.job.status, "queued");
    assert.equal(body.job.primary_engine, "chopify"); assert.equal(body.job.fallback_engine, "peakcut");
    assert.deepEqual(calls[0].values, ["123e4567-e89b-42d3-a456-426614174000", 5, 8]);
  });
});

test("clip job creation validates options before database access", async () => {
  const database = { query: async () => { throw new Error("should not query"); } };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(base + "/api/clip-jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ media_asset_id: "123e4567-e89b-42d3-a456-426614174000", max_clips: 100 }) });
    assert.equal(response.status, 400);
  });
});

test("queued clip job can be cancelled safely", async () => {
  const database = { query: async (sql, values) => { assert.match(sql, /status = 'queued'/); return { rows: [{ id: values[0], status: "cancelled" }] }; } };
  await withServer(createAppServer({ database }), async (base) => {
    const response = await fetch(base + "/api/clip-jobs/123e4567-e89b-42d3-a456-426614174000/cancel", { method: "POST" });
    assert.equal(response.status, 200); assert.equal((await response.json()).job.status, "cancelled");
  });
});
