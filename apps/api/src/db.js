import pg from "pg";

const { Pool } = pg;

export function createDatabase({ connectionString, max = 10 } = {}) {
  if (!connectionString) {
    throw new Error("DATABASE_URL não foi configurada.");
  }

  const pool = new Pool({
    connectionString,
    max,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    application_name: "tiktok-auto-publisher-api"
  });

  return {
    query: (text, values) => pool.query(text, values),
    async check() {
      await pool.query("SELECT 1");
      return true;
    },
    close: () => pool.end()
  };
}
