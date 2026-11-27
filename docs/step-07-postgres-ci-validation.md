# Etapa 7 — Validação automatizada com PostgreSQL

## O que foi preparado

- O workflow do GitHub Actions inicia um PostgreSQL 17 temporário para cada execução.
- A migration `001_initial_schema.sql` é aplicada no banco de teste com `ON_ERROR_STOP=1`; qualquer erro interrompe a execução.
- As dependências da API são instaladas e a suíte `npm test` é executada.
- Foi adicionado um teste de integração que cria um vídeo e uma campanha reais no PostgreSQL, consulta `GET /api/library/status` pela API e confere o status retornado.
- O teste de integração é ignorado localmente quando `DATABASE_URL` não está definida; no workflow ela é configurada para o serviço PostgreSQL temporário.

## O que isso valida

A execução no CI passa a verificar tanto os testes unitários existentes quanto a compatibilidade da consulta do painel com as tabelas e colunas da migration atual.

## Limites

- Os arquivos foram enviados ao repositório, mas esta etapa não executa o workflow por conta própria. O resultado só poderá ser confirmado após o GitHub Actions iniciar a execução.
- O banco temporário do CI é descartado ao final. Isso não cria banco permanente nem hospedagem.
- Ainda não há autenticação da API, deploy, armazenamento remoto permanente, agendador ou integração com TikTok.

## Como conferir

No GitHub, abra a aba **Actions** do repositório e procure a execução **API tests** associada ao commit desta etapa. O resultado esperado é verde; se falhar, o log indicará se a migration ou algum teste encontrou problema.
