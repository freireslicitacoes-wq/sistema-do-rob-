import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server.js";

test("GET /health returns service health", async () => {
  const server = createAppServer({ env: { SERVICE_NAME: "test-api" } });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "test-api");
    assert.ok(body.timestamp);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("unknown routes return 404", async () => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/missing`);
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.error, "not_found");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
