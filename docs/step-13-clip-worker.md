# Etapa 13 — núcleo do worker da fila

## Implementado no repositório
- Módulo `apps/api/src/clip-worker.js` com reivindicação SQL atômica usando `FOR UPDATE SKIP LOCKED`.
- Lease com token individual, proprietário, expiração e heartbeat inicial.
- Registro da tentativa principal no mesmo comando SQL que reivindica o trabalho.
- Conclusão condicionada ao token ainda pertencer ao worker.
- Resultado positivo vai somente para `review_pending`; falhas ou motor não validado vão para `needs_attention`.
- Motor reserva não é acionado implicitamente.
- Testes unitários com banco simulado para fila vazia, motor indisponível e resultado positivo.

## Ainda pendente
- Ligar worker ao processo de execução/serviço.
- Implementar heartbeat recorrente e recuperação segura de leases expirados.
- Ligar Chopify ao caminho real e validar existência, tamanho e integridade dos arquivos gerados.
- Auditar e implementar adaptador PeakCut independente.
- Failover somente após comprovar que a tentativa anterior terminou.
- Testes reais com PostgreSQL e vídeos.

## Validação
Os testes foram escritos, mas ainda não foram executados neste ambiente. Nenhuma execução de vídeo foi realizada.
