import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server.js";
import { createDatabase } from "../src/db.js";

const databaseUrl = process.env.DATABASE_URL;

test("PostgreSQL integration: library status query matches the real schema", { skip: !databaseUrl }, async () => {
  const database = createDatabase({ connectionString: databaseUrl, max: 2 });
  const suffix = Date.now().toString();
  let assetId;
  let campaignId;
  let server;

  try {
    const asset = await database.query(
      `INSERT INTO media_assets
        (source_type, original_name, storage_reference, natural_sort_number)
       VALUES ('upload', $1, $2, 1)
       RETURNING id`,
      [`integration-${suffix}.mp4`, `test://integration-${suffix}`]
    );
    assetId = asset.rows[0].id;

    const campaign = await database.query(
      `INSERT INTO campaigns (name, mode, timezone)
       VALUES ($1, 'bulk_library', 'America/Belem')
       RETURNING id`,
      [`integration-${suffix}`]
    );
    campaignId = campaign.rows[0].id;

    await database.query(
      `INSERT INTO publication_items
        (campaign_id, media_asset_id, sequence_number, status)
       VALUES ($1, $2, 1, 'imported')`,
      [campaignId, assetId]
    );

    server = createAppServer({ database });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/library/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    const item = body.items.find((entry) => entry.id === assetId);
    assert.ok(item, "the inserted asset should be returned by the library query");
    assert.equal(item.original_name, `integration-${suffix}.mp4`);
    assert.equal(item.visual_status, "not_published");
    assert.equal(body.summary.not_published >= 1, true);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (campaignId) await database.query("DELETE FROM publication_items WHERE campaign_id = $1", [campaignId]);
    if (campaignId) await database.query("DELETE FROM campaigns WHERE id = $1", [campaignId]);
    if (assetId) await database.query("DELETE FROM media_assets WHERE id = $1", [assetId]);
    await database.close();
  }
});
