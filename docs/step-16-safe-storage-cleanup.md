# Etapa 16 — Núcleo de limpeza segura do armazenamento

## Implementado

- O módulo de armazenamento agora oferece uma operação de limpeza em lotes, limitada a 1–100 arquivos por chamada.
- A operação permanece bloqueada enquanto `storage_policies.enabled = FALSE`; nesse estado não altera arquivos.
- A elegibilidade é revalidada no momento da reivindicação: o arquivo precisa ter ao menos uma publicação; todas as publicações associadas precisam estar em `published` com `published_at`; nenhuma tentativa associada pode estar em estado diferente de `succeeded`; e 72 horas (ou a retenção configurada) precisam ter passado desde a publicação mais recente.
- Arquivos marcados para preservação ficam fora da seleção.
- A seleção usa transação, bloqueio de linha e `SKIP LOCKED` para evitar dois processos reivindicarem o mesmo arquivo.
- Antes de remover o arquivo, o sistema grava `deletion_pending` e evento de auditoria.
- Só aceita referências `local://` com nome simples dentro da raiz configurada; recusa caminho externo, diretório e link simbólico.
- Se o arquivo já não existir após uma interrupção, a operação pode concluir o estado como excluído sem tentar apagar outro caminho.
- Após a remoção, mantém metadados e histórico e marca `deleted`; em falha, marca `needs_attention` e registra erro.
- Há endpoint manual `POST /api/storage/cleanup` e endpoint `POST /api/media-assets/:id/preserve` para preservar ou liberar um arquivo.
- Banco agora expõe transação explícita para que a reivindicação e o evento inicial sejam atômicos.

## Segurança e limitações

- A limpeza continua desativada por padrão; nenhum arquivo será removido até habilitação deliberada da política.
- A etapa 17 adiciona um agendador periódico opt-in. Ele exige `STORAGE_CLEANUP_SCHEDULER_ENABLED=true` e também `storage_policies.enabled=true`; ambas as chaves são necessárias para qualquer exclusão agendada.
- O agendador usa advisory lock do PostgreSQL para impedir execução simultânea em instâncias diferentes. Registros `deletion_pending` elegíveis podem ser retomados em uma nova rodada.
- A API ainda não possui autenticação. Não expor as rotas de administração/limpeza publicamente.
- A operação usa armazenamento local em disco; referências de outros provedores são recusadas e encaminhadas para atenção.
- Um arquivo em `needs_attention` não é apagado automaticamente; requer análise.
- Uma queda após a remoção física, mas antes da confirmação no banco, pode ser recuperada com nova execução: arquivo ausente é tratado como remoção já realizada.
- Não executamos ainda PostgreSQL, Docker ou testes no computador do usuário.

## Endpoints

- `POST /api/storage/cleanup` com JSON opcional `{"limit":25}`.
- `POST /api/media-assets/:id/preserve` com JSON `{"preserve":true}` ou `{"preserve":false}`.

## Próximos passos

1. Executar testes no CI e validar as migrations em PostgreSQL real.
2. Adicionar uma tela de preservação e histórico no painel.
3. Após testes, decidir quando habilitar a política.
4. Só então criar o agendador periódico, com trava contra execução duplicada e alertas de falha.
