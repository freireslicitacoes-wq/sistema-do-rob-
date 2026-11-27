const LOCK_KEY = "724198301";

export function createStorageCleanupScheduler({
  storage,
  database,
  enabled = false,
  intervalMs = 15 * 60 * 1000,
  batchSize = 25,
  logger = console
}) {
  let timer = null;
  let running = false;
  let lastRunAt = null;
  let lastResult = null;
  let lastError = null;

  async function tick() {
    if (!enabled || running) return { skipped: true, reason: "disabled_or_running" };
    if (typeof database?.withAdvisoryLock !== "function") {
      lastError = "PostgreSQL advisory lock is unavailable; scheduler refused to run.";
      logger.error(lastError);
      return { skipped: true, reason: "lock_unavailable" };
    }
    running = true;
    try {
      const locked = await database.withAdvisoryLock(LOCK_KEY, async () => {
        const result = await storage.cleanup({ limit: batchSize });
        lastRunAt = new Date().toISOString();
        lastResult = result;
        lastError = null;
        return result;
      });
      if (!locked.acquired) return { skipped: true, reason: "another_instance_running" };
      return { skipped: false, result: locked.result };
    } catch (error) {
      lastError = String(error?.message || "storage cleanup scheduler failed").slice(0, 1000);
      logger.error("Storage cleanup scheduler failed:", lastError);
      return { skipped: false, error: lastError };
    } finally {
      running = false;
    }
  }

  function start() {
    if (!enabled || timer) return false;
    timer = setInterval(() => { void tick(); }, intervalMs);
    timer.unref?.();
    return true;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function status() {
    return { enabled, running, interval_ms: intervalMs, batch_size: batchSize, last_run_at: lastRunAt, last_result: lastResult, last_error: lastError };
  }

  return { start, stop, tick, status };
}
