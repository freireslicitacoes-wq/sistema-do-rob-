export function createAlertManager({ database }) {
  async function collect() {
    const alerts = [];
    const add = (type, severity, title, message, key = type, entity = null, details = {}) =>
      alerts.push({ dedupe_key: key, alert_type: type, severity, title, message,
        entity_type: entity?.type || null, entity_id: entity?.id || null, details });

    const storage = await database.query(
      `SELECT imports_paused, pause_reason, capacity_guard_enabled, min_free_bytes
         FROM storage_policies WHERE id=1`
    );
    if (storage.rows[0]?.imports_paused) {
      const s = storage.rows[0];
      add("storage_imports_paused","warning","Importações pausadas",
        "O armazenamento atingiu o limite de segurança. Novas importações estão bloqueadas.",
        "storage:imports_paused",null,{ reason:s.pause_reason, min_free_bytes:s.min_free_bytes });
    }

    const cleanup = await database.query(
      `SELECT id, original_name, storage_last_error FROM media_assets
        WHERE storage_state='needs_attention' ORDER BY updated_at DESC LIMIT 50`
    );
    for (const item of cleanup.rows) add("storage_cleanup_failed","warning","Limpeza precisa de atenção",
      `Não foi possível concluir a limpeza do arquivo ${item.original_name}.`,
      "storage_cleanup:"+item.id,{type:"media_asset",id:item.id},{ error:item.storage_last_error });

    const clips = await database.query(
      `SELECT id, status, last_error FROM clip_jobs
        WHERE status IN ('failed','needs_attention') ORDER BY updated_at DESC LIMIT 50`
    );
    for (const job of clips.rows) add("clip_job_failed","warning","Processamento de vídeo precisa de atenção",
      `Um trabalho de cortes está em ${job.status} e precisa ser verificado.`,
      "clip_job:"+job.id,{type:"clip_job",id:job.id},{ status:job.status,error:job.last_error });

    const leases = await database.query(
      `SELECT id, claimed_by, lease_expires_at FROM clip_jobs
        WHERE status='running' AND lease_expires_at < now() ORDER BY lease_expires_at LIMIT 50`
    );
    for (const job of leases.rows) add("clip_job_lease_expired","critical","Processamento possivelmente interrompido",
      "Um trabalho de cortes perdeu o prazo de execução. Verifique antes de tentar novamente.",
      "clip_lease:"+job.id,{type:"clip_job",id:job.id},{ claimed_by:job.claimed_by,lease_expires_at:job.lease_expires_at });

    const publications = await database.query(
      `SELECT id,status,last_error FROM publication_items
        WHERE status IN ('failed','uploading') ORDER BY updated_at DESC LIMIT 50`
    );
    for (const item of publications.rows) add("publication_problem",
      item.status === "uploading" ? "critical" : "warning",
      item.status === "uploading" ? "Publicação com resultado a confirmar" : "Publicação falhou",
      item.status === "uploading"
        ? "O envio pode ter sido interrompido. Confirme o estado na plataforma antes de reenviar."
        : "Uma publicação falhou e precisa de revisão.",
      "publication:"+item.id,{type:"publication_item",id:item.id},{status:item.status,error:item.last_error});

    const uncertain = await database.query(
      `SELECT pi.id, pi.last_error FROM publication_items pi
        WHERE EXISTS (SELECT 1 FROM publication_attempts pa
          WHERE pa.publication_item_id=pi.id AND pa.status='uncertain')
        AND pi.status <> 'published' ORDER BY pi.updated_at DESC LIMIT 50`
    );
    for (const item of uncertain.rows) add("publication_uncertain","critical","Resultado de publicação incerto",
      "Existe uma tentativa cujo resultado não foi confirmado. Não reenvie sem verificar para evitar duplicidade.",
      "publication_uncertain:"+item.id,{type:"publication_item",id:item.id},{error:item.last_error});

    return alerts;
  }

  async function refresh() {
    const current = await collect();
    const keys = [];
    for (const alert of current) {
      keys.push(alert.dedupe_key);
      await database.query(
        `INSERT INTO system_alerts
          (dedupe_key,alert_type,severity,title,message,entity_type,entity_id,details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
         ON CONFLICT (dedupe_key) DO UPDATE SET
          severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,
          entity_type=EXCLUDED.entity_type,entity_id=EXCLUDED.entity_id,details=EXCLUDED.details,
          last_seen_at=now(),occurrences=system_alerts.occurrences+1,
          status=CASE WHEN system_alerts.status='acknowledged' THEN 'acknowledged' ELSE 'active' END,
          resolved_at=NULL`,
        [alert.dedupe_key,alert.alert_type,alert.severity,alert.title,alert.message,
         alert.entity_type,alert.entity_id,JSON.stringify(alert.details)]
      );
    }
    await database.query(
      `UPDATE system_alerts SET status='resolved',resolved_at=now()
        WHERE status IN ('active','acknowledged') AND NOT (dedupe_key = ANY($1::text[]))`,
      [keys]
    );
    return current.length;
  }

  async function list({ status = "active", limit = 100 } = {}) {
    await refresh();
    const result = await database.query(
      `SELECT id,dedupe_key,alert_type,severity,title,message,entity_type,entity_id,
              status,first_seen_at,last_seen_at,acknowledged_at,resolved_at,occurrences,details
         FROM system_alerts
        WHERE ($1='all' OR status=$1)
        ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
                 last_seen_at DESC
        LIMIT $2`,[status,limit]
    );
    return result.rows;
  }

  async function acknowledge(id) {
    const result = await database.query(
      `UPDATE system_alerts SET status='acknowledged',acknowledged_at=now()
        WHERE id=$1::uuid AND status='active'
        RETURNING id,status,acknowledged_at`,[id]
    );
    return result.rows[0] || null;
  }

  return { collect, refresh, list, acknowledge };
}
