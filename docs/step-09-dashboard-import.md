# Etapa 9 — Importação pelo painel

## O que foi adicionado

- Formulário para selecionar e enviar um arquivo de vídeo do computador para `POST /api/media-assets/upload`.
- Formulário para colar o link público de um arquivo do Google Drive para `POST /api/media-assets/import-google-drive`.
- Mensagens de andamento, sucesso e erro; botões ficam desabilitados durante o envio.
- Atualização da biblioteca após uma importação bem-sucedida.
- Os formulários usam os endpoints já existentes e não alteram o conteúdo original.

## Limites atuais

- O Drive aceita somente links públicos de arquivos individuais; pastas e links privados ainda não.
- O limite padrão do upload é 500 MiB por arquivo.
- A API ainda não tem autenticação. O painel deve ser usado apenas em localhost; não exponha a API à internet.
- A importação depende de PostgreSQL e do armazenamento local estarem ativos.
- Esta etapa foi implementada no repositório, mas ainda precisa ser validada com Docker em um computador.

## Próximo passo

Implementar a camada de organização e seleção da biblioteca para campanhas. A geração de cortes virá em uma etapa própria, após validar a entrada e a persistência dos vídeos.
