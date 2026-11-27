# Banco de dados local

Esta etapa usa PostgreSQL 17 em Docker Compose para persistir biblioteca, campanhas, fila, aprovações, tentativas e auditoria.

## Iniciar

Na raiz do repositório:

```bash
docker compose -f infra/postgres/docker-compose.yml up -d
```

## Aplicar a estrutura inicial

Com `psql` instalado:

```bash
psql "postgresql://tapai:local_dev_only_change_me@localhost:5432/tiktok_auto_publisher" -f infra/postgres/migrations/001_initial_schema.sql
```

A senha do Compose é apenas para desenvolvimento local. Antes de qualquer ambiente compartilhado ou produção, troque-a e use um gerenciador de segredos. Não reutilize essa senha fora do computador local.

## Regras importantes do modelo

- Cada arquivo tem identidade própria, hash opcional e dados de ordenação natural.
- Uma campanha não pode conter o mesmo arquivo duas vezes.
- A sequência é persistida e não depende da memória do processo.
- Itens aprovados, agendados, em envio ou publicados exigem registro de aprovação e consentimento.
- Cada tentativa de publicação recebe chave de idempotência única.
- Resultado incerto fica distinguível de falha confirmada para evitar reenvio duplicado.
- Eventos de auditoria registram mudanças relevantes.

## Limites

A migração SQL e o Compose foram adicionados ao repositório. A API ainda não está conectada ao PostgreSQL; a conexão, repositórios e testes de integração serão feitos em uma etapa posterior.
