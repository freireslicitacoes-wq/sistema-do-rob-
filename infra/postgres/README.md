# Execução local com Docker Compose

Requer Docker Desktop ou Docker Engine com Docker Compose.

Na raiz do repositório:

```bash
docker compose -f infra/postgres/docker-compose.yml up -d --build
```

O Compose inicia PostgreSQL, aguarda o health check, aplica a migration inicial e inicia a API. Depois abra http://localhost:3000 e confira http://localhost:3000/health.

Os dados do banco e os vídeos ficam em volumes Docker persistentes. Para parar sem apagar os dados:

```bash
docker compose -f infra/postgres/docker-compose.yml stop
```

Para ver os logs da API:

```bash
docker compose -f infra/postgres/docker-compose.yml logs -f api
```

**Não execute** `docker compose down -v` se quiser preservar banco e vídeos: essa opção remove os volumes.

## Segurança

- As portas são publicadas somente em localhost (127.0.0.1).
- A senha padrão é apenas para desenvolvimento local. Não exponha a API à internet; ainda não há autenticação.
- Os vídeos e o banco ficam no computador, não em nuvem. Não há backup automático.
- Consulte [a documentação da etapa 8](../../docs/step-08-local-runtime.md) para detalhes.
