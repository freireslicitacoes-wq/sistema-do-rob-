# Etapa 3 — API conectada ao PostgreSQL

## O que foi implementado

- Cliente PostgreSQL usando o pacote oficial comunitário `pg`, com pool e encerramento controlado.
- Configuração da conexão exclusivamente por `DATABASE_URL`.
- `GET /health` informa se o banco está conectado, indisponível ou ainda não configurado, sem revelar credenciais ou detalhes internos.
- Cadastro e listagem de itens da biblioteca:
  - `POST /api/media-assets`
  - `GET /api/media-assets?limit=50` (limite máximo de 100)
- Cadastro e listagem de campanhas:
  - `POST /api/campaigns`
  - `GET /api/campaigns`
- Consultas SQL parametrizadas, validação de entrada, limite de corpo JSON de 1 MB e respostas de erro sem detalhes internos.

## Configuração local

1. Instale Node.js 20 ou superior.
2. Na pasta `apps/api`, execute `npm install`.
3. Inicie o PostgreSQL conforme [infra/postgres/README.md](../../infra/postgres/README.md) e aplique a migration inicial.
4. Configure `DATABASE_URL` no ambiente local. Não publique a URL nem a senha no Git.
5. Execute `npm test` e depois `npm start`.

Sem `DATABASE_URL`, a API ainda inicia para permitir diagnóstico, mas as rotas de dados respondem 503. O health informa `not_configured`.

## Exemplos de requisição

Criar campanha:

```json
{
  "name": "Biblioteca principal",
  "mode": "bulk_library",
  "daily_target": 10,
  "timezone": "America/Belem"
}
```

Cadastrar arquivo já armazenado:

```json
{
  "source_type": "upload",
  "original_name": "video-01.mp4",
  "storage_reference": "local://media/video-01.mp4",
  "mime_type": "video/mp4",
  "file_size_bytes": 12000000,
  "duration_ms": 45000,
  "natural_sort_number": 1
}
```

A referência de armazenamento é apenas um identificador; esta etapa não faz upload, download ou sincronização com Google Drive.

## Limites desta etapa

- A migration PostgreSQL não é executada automaticamente pela API.
- Não há autenticação/autorização HTTP nesta etapa; não exponha a API publicamente.
- Não há integração Google Drive, TikTok, agendador ou painel.
- Os testes adicionados usam banco simulado. Ainda precisam ser executados em ambiente Node.js; nenhum resultado de execução é declarado aqui.
- A conexão real e a migration ainda precisam ser verificadas em um ambiente com PostgreSQL disponível.
