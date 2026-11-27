# Etapa 18 — Central de alertas

## Implementado

- Migration 006 cria `system_alerts`, com chave de deduplicação, severidade, status, primeira/última ocorrência, contador, entidade relacionada e detalhes.
- `apps/api/src/alerts.js` detecta:
  - importações pausadas por limite de armazenamento;
  - arquivos que exigem atenção após falha de limpeza;
  - trabalhos de cortes em `failed` ou `needs_attention`;
  - leases de cortes expirados;
  - publicações em falha ou ainda em estado `uploading`;
  - tentativas de publicação marcadas como `uncertain`.
- Alertas são persistidos e deduplicados. Ocorrências repetidas atualizam o mesmo alerta; condições que deixam de existir são marcadas como resolvidas.
- O usuário pode reconhecer alertas ativos, preservando-os no histórico.
- API:
  - `GET /api/alerts?status=active|acknowledged|resolved|all&limit=100`
  - `POST /api/alerts/:id/acknowledge`
- O painel possui uma Central de alertas com lista, severidade, recorrência e botão de reconhecimento.
- Docker Compose e GitHub Actions aplicam migration 006.

## Limites conhecidos

- A central monitora somente condições que já possuem dados no PostgreSQL. Não monitora ainda disponibilidade real do TikTok, Google Drive, motores externos ou conectividade de rede em tempo real.
- Falha de conexão com o próprio PostgreSQL é mostrada pelo endpoint `/health`; não pode ser persistida na tabela de alertas enquanto o banco estiver inacessível.
- Alertas são atualizados quando a API consulta `GET /api/alerts`; não há varredura em segundo plano nesta etapa.
- A API continua sem autenticação; não exponha a central nem as rotas administrativas publicamente.
- Testes foram escritos, mas ainda não executados em ambiente real.

