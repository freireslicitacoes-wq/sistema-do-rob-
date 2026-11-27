# Etapa 17 — Agendador de manutenção do armazenamento

## Implementado

- Criado `apps/api/src/storage-scheduler.js` para executar lotes periódicos de limpeza.
- Intervalo configurável por `STORAGE_CLEANUP_INTERVAL_MS` (padrão 15 minutos; mínimo efetivo de 1 minuto).
- Tamanho de lote configurável por `STORAGE_CLEANUP_BATCH_SIZE` (padrão 25; limitado a 1–100).
- O agendador é opt-in: exige `STORAGE_CLEANUP_SCHEDULER_ENABLED=true`.
- Mesmo ligado, a limpeza exige também `storage_policies.enabled=true` no PostgreSQL. As duas chaves permanecem desligadas por padrão.
- Implementado bloqueio advisory de sessão no PostgreSQL, evitando que múltiplas instâncias executem a limpeza ao mesmo tempo.
- Ao reiniciar, a próxima rodada pode retomar registros `deletion_pending` que ainda satisfaçam todos os critérios de segurança; arquivos já ausentes são reconciliados como concluídos.
- Erros são registrados no log e no estado do agendador; a próxima rodada continua elegível.
- Endpoint `GET /api/storage/maintenance` mostra configuração, última execução, resultado e último erro.
- O agendador é encerrado junto com a API.

## Configuração

```env
STORAGE_CLEANUP_SCHEDULER_ENABLED=false
STORAGE_CLEANUP_INTERVAL_MS=900000
STORAGE_CLEANUP_BATCH_SIZE=25
```

Não altere para `true` antes de testar migrations, banco, volume persistente e as regras de elegibilidade. A segunda trava no banco também deve continuar desativada até aprovação explícita.

## Limitações

- Nenhuma exclusão automática foi ativada nesta etapa.
- O agendador não cria backups; a limpeza é irreversível depois da remoção física.
- A API ainda não tem autenticação. Não exponha endpoints administrativos publicamente.
- A validação local com Docker e a execução real dos testes permanecem pendentes para quando o usuário estiver no computador.
- O estado do agendador é em memória; logs persistentes/alertas externos serão adicionados em etapa posterior.
