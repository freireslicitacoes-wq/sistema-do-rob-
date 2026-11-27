# Etapa 14 — Fundação do ciclo de armazenamento

## Objetivo

Preparar o sistema para reutilizar o mesmo espaço de armazenamento em remessas sucessivas, sem apagar originais antes da hora nem perder histórico.

## Implementado nesta etapa

- Migration PostgreSQL 004 adiciona estado de armazenamento, opção de preservação, data de elegibilidade para exclusão, data de exclusão e campo de erro por arquivo.
- Tabela `storage_policies` guarda a política operacional: retenção padrão de 72 horas, limite alto de ocupação (85%), limite de retomada (70%) e reserva mínima de espaço livre (1 GiB).
- Índice parcial para localizar arquivos elegíveis à política de retenção.
- Docker Compose e CI aplicam migrations 001 a 004 em ordem.
- O padrão da política fica desativado até que a rotina real de exclusão seja implementada e testada.

## Regras obrigatórias para a futura rotina

1. Só considerar arquivos associados a pelo menos uma publicação confirmada.
2. Calcular a retenção a partir da publicação confirmada mais recente do arquivo; aguardar 72 horas completas.
3. Não excluir arquivos com qualquer publicação falha, pendente, agendada, em envio ou de resultado incerto.
4. Não excluir arquivos marcados `preserve_storage = TRUE`.
5. Antes de excluir, validar que o caminho resolvido permanece dentro da raiz de armazenamento configurada.
6. Marcar `deletion_pending`, registrar auditoria e só então remover o arquivo.
7. Confirmar a ausência do arquivo antes de marcar `deleted`; em erro, marcar `needs_attention` e preservar o registro.
8. Nunca apagar metadados, histórico de publicação, tentativas ou auditoria.
9. Pausar novas importações ao atingir 85% de ocupação ou ficar abaixo de 1 GiB livre; só retomar abaixo de 70%, depois de revalidar espaço.
10. Não apagar em lote para abrir espaço se a regra de retenção não tiver sido cumprida. Se não houver arquivos elegíveis, pausar a importação e pedir intervenção.

## Não implementado ainda

- Cálculo real de uso de disco e painel de capacidade.
- Agendador de limpeza.
- Exclusão física segura e idempotente.
- Bloqueio de novas importações por falta de espaço.
- Testes com arquivos reais e recuperação após queda durante exclusão.

## Segurança e custo

A migration não habilita exclusão automática. O valor `enabled` começa como `FALSE`. Nenhum serviço pago, cartão ou faturamento é ativado. O ciclo será independente do provedor de nuvem, mas cada provedor continuará sujeito aos próprios limites de espaço, CPU, rede e disponibilidade.
