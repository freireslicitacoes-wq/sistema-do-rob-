# Etapa 5 — Painel visual da biblioteca

## Entrega
- Página web inicial em `apps/web/index.html`, sem framework ou dependências externas.
- Contadores de vídeos não publicados, pendentes de hoje e publicados.
- Lista individual com sinalização: vermelho (não publicado), amarelo (agendado para hoje no fuso da campanha), verde (publicação confirmada).
- Atualização manual e consulta à API `GET /api/library/status`.

## Regras
- Verde somente quando o item está com status `published`.
- Amarelo somente quando o status é `scheduled` e a data agendada corresponde ao dia atual no fuso da campanha.
- Demais estados ficam vermelhos; falhas e incertezas nunca são mostradas como publicadas.
- O painel é somente de leitura: não publica nem altera arquivos.

## Limitações
- A página ainda precisa ser servida por um servidor web e configurada para encaminhar `/api` à API. A API ainda não serve arquivos estáticos.
- Depende de PostgreSQL configurado e da migration aplicada.
- Não há autenticação; não exponha a API à internet.
- Não há integração TikTok nem rotina de exclusão após três dias.
- Os testes e a conexão real com PostgreSQL não foram executados nesta etapa.
