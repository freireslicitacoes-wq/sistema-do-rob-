# Etapa 8 — Execução local integrada

## Requisitos

- Docker Desktop ou Docker Engine com o plugin Docker Compose.
- Pelo menos 2 GB livres para iniciar os serviços, além do espaço necessário aos vídeos.
- Node.js não é necessário no computador para executar a versão em contêiner.

## Iniciar a aplicação

Na raiz do repositório:

```bash
docker compose -f infra/postgres/docker-compose.yml up -d --build
```

O Compose:
1. inicia PostgreSQL 17;
2. aguarda o banco ficar saudável;
3. aplica a migration SQL;
4. constrói e inicia a API;
5. mantém banco e vídeos em volumes persistentes do Docker.

Abra no próprio computador: http://localhost:3000

Verifique a API em: http://localhost:3000/health

## Parar e iniciar novamente

```bash
docker compose -f infra/postgres/docker-compose.yml stop
docker compose -f infra/postgres/docker-compose.yml up -d
```

Para acompanhar os registros:

```bash
docker compose -f infra/postgres/docker-compose.yml logs -f api
```

**Atenção:** não use `docker compose down -v` se quiser preservar os vídeos e o banco. A opção `-v` apaga os volumes persistentes.

## Segurança e limites

- As portas do banco e da API são publicadas somente em `127.0.0.1`, para acesso local no próprio computador.
- A senha padrão do banco é exclusiva para desenvolvimento local. Antes de qualquer exposição em rede, configure `POSTGRES_PASSWORD` forte no ambiente e implemente autenticação/autorização da API.
- Não encaminhe a porta 3000 para a internet. A API ainda não possui autenticação.
- Os arquivos ficam em volume Docker local; não há sincronização cloud nem backup automático. O computador precisa estar ligado para a API funcionar.
- A migration é reaplicada de forma idempotente na inicialização do serviço de migração.
- Esta etapa não integra TikTok, não agenda publicações e não implementa exclusão automática após 72 horas.

## Situação da validação

Os arquivos de execução foram adicionados ao repositório. A inicialização efetiva depende de Docker no computador do usuário e ainda não foi executada/confirmada nesta etapa.
