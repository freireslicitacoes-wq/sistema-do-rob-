# Etapa 12 — Fila persistente e redundância

## Regra de redundância
Toda habilidade crítica terá motor principal e reserva independente, com critérios de failover, limites de tentativas, testes de contrato e procedimento de retorno. Para cortes: Chopify (principal) e PeakCut (reserva a validar). PeakCut não está instalado nem aprovado para failover ainda.

O gerente tenta recuperação segura e limitada. Se não resolver, encaminha ao reserva validado. Se ambos falharem, o job permanece em `needs_attention`, com originais e logs preservados. Nunca descartar ou marcar como concluído sem evidência. Em timeout incerto, verificar se o processo anterior terminou antes de acionar o reserva, evitando execução duplicada.

## Implementado
Migration `002_clip_jobs_and_fallback.sql` cria:
- `clip_jobs`: pedido, asset de origem, status, motor principal/reserva/ativo, opções e resultado.
- `clip_job_attempts`: histórico de tentativas por motor, erro e manifesto.

API:
- `POST /api/clip-jobs`: registra job (202), default Chopify + PeakCut.
- `GET /api/clip-jobs`: lista trabalhos.
- `GET /api/clip-jobs/:id`: detalhe e tentativas.
- `POST /api/clip-jobs/:id/cancel`: cancela somente jobs ainda queued.

## Ainda pendente
Não há worker que execute os motores, failover automático ou controles no painel. A reserva ainda precisa ser auditada, instalada e validada. Migration e testes foram escritos, não executados em PostgreSQL/Node nesta sessão.
