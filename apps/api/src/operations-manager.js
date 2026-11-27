const RULES = {
 storage_imports_paused: { action:"pause_imports", recommendation:"Liberar espaço com segurança ou aumentar a capacidade. Não apagar arquivos que não cumpram a política de retenção." },
 storage_cleanup_failed: { action:"human_review", recommendation:"Verificar caminho, permissões e erro registrado. O arquivo foi preservado para análise." },
 clip_job_failed: { action:"engine_diagnostics", recommendation:"Inspecionar a tentativa, dependências e logs do motor principal. O motor reserva só pode ser usado depois de auditado e validado." },
 clip_job_lease_expired: { action:"verify_execution", recommendation:"Confirmar se o processo antigo ainda está ativo e verificar arquivos de saída antes de qualquer nova tentativa." },
 publication_problem: { action:"human_review", recommendation:"Consultar o estado no TikTok. Se o envio estiver em andamento ou sem confirmação, não reenviar automaticamente." },
 publication_uncertain: { action:"block_duplicate", recommendation:"Bloquear reenvio até confirmar o resultado na plataforma para evitar publicação duplicada." }
};

export function createOperationsManager({ database, alerts }) {
  async function diagnose() {
    const startedAt = new Date().toISOString();
    let runId = null;
    try {
      const inserted = await database.query(
        `INSERT INTO manager_runs (run_type,status,started_at)
         VALUES ('diagnostic','partial',now()) RETURNING id`
      );
      runId = inserted.rows[0].id;
      const count = await alerts.refresh();
      const result = await database.query(
        `SELECT id,dedupe_key,alert_type,severity,title,message,entity_type,entity_id,
                status,last_seen_at,occurrences,details
           FROM system_alerts WHERE status IN ('active','acknowledged')
          ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
                   last_seen_at DESC LIMIT 200`
      );
      const findings = result.rows.map(alert => {
        const rule = RULES[alert.alert_type] || {
          action:"human_review",
          recommendation:"Analisar o alerta e escolher uma correção segura."
        };
        return {
          alert_id:alert.id, type:alert.alert_type, severity:alert.severity,
          title:alert.title, status:alert.status, occurrences:alert.occurrences,
          entity_type:alert.entity_type, entity_id:alert.entity_id,
          proposed_action:rule.action, recommendation:rule.recommendation,
          automatic_repair:false
        };
      });
      const summary = {
        critical:findings.filter(x=>x.severity==="critical").length,
        warning:findings.filter(x=>x.severity==="warning").length,
        informational:findings.filter(x=>x.severity==="info").length,
        automatic_repairs_performed:0,
        human_review_required:findings.filter(x=>x.proposed_action==="human_review"||x.proposed_action==="verify_execution").length
      };
      await database.query(
        `UPDATE manager_runs SET status='completed',finished_at=now(),
          alerts_scanned=$2,findings=$3::jsonb,summary=$4::jsonb
         WHERE id=$1::uuid`,
        [runId,count,JSON.stringify(findings),JSON.stringify(summary)]
      );
      return { id:runId,status:"completed",started_at:startedAt,summary,findings,
        notice:"Diagnóstico concluído. Nenhuma tarefa foi repetida, publicada ou apagada automaticamente." };
    } catch(error) {
      if(runId) await database.query(
        `UPDATE manager_runs SET status='failed',finished_at=now(),error_summary=$2 WHERE id=$1::uuid`,
        [runId,String(error?.message||"diagnostic_failed").slice(0,1000)]
      ).catch(()=>{});
      throw error;
    }
  }

  async function history(limit=20) {
    const result=await database.query(
      `SELECT id,run_type,status,started_at,finished_at,alerts_scanned,findings,summary,error_summary
         FROM manager_runs ORDER BY started_at DESC LIMIT $1`,[limit]);
    return result.rows;
  }

  return { diagnose, history };
}
