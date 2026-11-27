import pg from "pg";

const { Pool } = pg;

export function createDatabase({ connectionString, max = 10 } = {}) {
  if (!connectionString) throw new Error("DATABASE_URL não foi configurada.");
  const pool = new Pool({
    connectionString, max, connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000, application_name: "tiktok-auto-publisher-api"
  });
  return {
    query: (text, values) => pool.query(text, values),
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await callback({ query: (text, values) => client.query(text, values) });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async withAdvisoryLock(key, callback) {
      const client = await pool.connect();
      let acquired = false;
      try {
        const result = await client.query("SELECT pg_try_advisory_lock($1::bigint) AS acquired", [key]);
        acquired = result.rows[0]?.acquired === true;
        if (!acquired) return { acquired: false };
        return { acquired: true, result: await callback() };
      } finally {
        if (acquired) { try { await client.query("SELECT pg_advisory_unlock($1::bigint)", [key]); } finally { client.release(); } }
        else client.release();
      }
    },
    async check() { await pool.query("SELECT 1"); return true; },
    close: () => pool.end()
  };
}
