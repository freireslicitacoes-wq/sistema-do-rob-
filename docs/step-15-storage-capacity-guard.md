# Etapa 15 — Monitoramento de capacidade e pausa preventiva

## Implementado

- Módulo `apps/api/src/storage.js` mede capacidade, espaço livre e uso do volume real que contém a pasta de mídia.
- Lê a política do banco e aplica histerese: pausa no limite alto (85%) ou abaixo do espaço livre mínimo (1 GiB), e só retoma quando o uso cai para 70% ou menos e a reserva mínima está disponível.
- Registra a pausa e seu motivo no PostgreSQL.
- Endpoint `GET /api/storage/status` expõe capacidade real do volume, bytes de arquivos rastreados, arquivos que exigem atenção e estado do bloqueio.
- Uploads locais e importações Drive consultam o bloqueio antes de iniciar; uploads também reservam o tamanho informado no cabeçalho quando disponível.
- Migration 005 adiciona controle de pausa e verificação de capacidade. O bloqueio de importação fica habilitado por padrão.
- Limpeza física automática permanece desabilitada; a coluna `storage_policies.enabled` continua FALSE.

## Regras e limites

- A capacidade reportada é do filesystem/volume onde está `MEDIA_STORAGE_DIR`, não uma quota do provedor de nuvem.
- Em um container, o valor depende do volume montado e do host.
- O tamanho rastreado no banco pode divergir do uso real por arquivos temporários, arquivos externos ou dados não catalogados.
- O bloqueio é preventivo e não elimina corrida entre uploads simultâneos; limites por upload continuam necessários.
- O endpoint requer autenticação antes de qualquer exposição pública; atualmente a API não possui autenticação.

## Ainda não implementado

- Rotina de exclusão física segura após 72 horas.
- Agendador e recuperação de operações de exclusão interrompidas.
- Testes integrados executados em PostgreSQL e Docker.
- Interface visual de capacidade no painel.

Nenhum arquivo é excluído nesta etapa.
