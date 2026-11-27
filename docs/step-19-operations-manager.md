# Etapa 19 — Gerente de operações (diagnóstico seguro)

## Implementado

- Migration 007 cria histórico persistente de execuções do gerente.
- `apps/api/src/operations-manager.js` consulta alertas, classifica severidade e propõe ações específicas.
- Regras atuais:
  - armazenamento pausado: manter importações bloqueadas até resolver capacidade;
  - limpeza falha: revisão humana do caminho/permissão;
  - cortes falhos: diagnosticar motor principal; reserva depende de auditoria/validação;
  - lease expirado: verificar se o processo antigo ainda está ativo e inspecionar saídas antes de nova tentativa;
  - publicação falha/em andamento: verificar estado na plataforma;
  - publicação incerta: bloquear reenvio até confirmação para evitar duplicidade.
- Cada diagnóstico registra achados, resumo, data e estado no PostgreSQL.
- API:
  - `GET /api/manager/status`
  - `POST /api/manager/diagnose`
  - `GET /api/manager/history?limit=20`
- Compose e CI aplicam migration 007.

## Limites deliberados

- Modo atual: somente diagnóstico. Nenhuma correção, retry, exclusão ou publicação automática é executada.
- O worker de cortes ainda não está integrado ao ciclo de vida do servidor; o motor reserva PeakCut não foi auditado/validado nem ativado.
- Integração oficial TikTok ainda não existe; portanto o gerente não pode consultar o estado externo de uma publicação.
- Não há monitoramento contínuo ou agente em segundo plano nesta etapa; diagnóstico é iniciado por chamada à API.
- A API ainda não possui autenticação. Não expor endpoints administrativos publicamente.
- Testes adicionados, ainda não executados em Docker/PostgreSQL real.

