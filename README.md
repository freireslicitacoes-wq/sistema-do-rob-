# TikTok Auto Publisher AI

Projeto para organizar vídeos, gerar cortes e preparar publicações no TikTok com revisão humana.

## Princípios

- Priorizar ferramentas open-source e processamento local gratuito quando viável.
- Usar somente conteúdo próprio ou com autorização de uso.
- Não prometer viralização, alcance ou monetização.
- Respeitar as regras, limites e permissões oficiais do TikTok.
- Nunca publicar conteúdo sem aprovação e consentimento explícitos do usuário.
- Não armazenar tokens ou segredos no código-fonte.

## Fluxo principal

1. Importar vídeos de arquivos locais, Google Drive ou links compatíveis e autorizados.
2. Analisar e gerar sugestões de cortes.
3. Renderizar prévias e preparar título, descrição e hashtags editáveis.
4. Enviar os resultados para a caixa **Aguardando aprovação**.
5. Permitir seleção e aprovação em lote, com revisão por vídeo.
6. Agendar somente os itens aprovados e autorizados.
7. No momento do envio, consultar as informações atuais do criador e respeitar as opções e limites retornados pela API.
8. Acompanhar o status da publicação e registrar falhas sem duplicar envios.

## Aprovação em lote

A aprovação em lote é o fluxo escolhido para o produto. A especificação está em [docs/approval-batch-flow.md](docs/approval-batch-flow.md).

## Estado atual

Repositório inicial. Ainda não há aplicação, integração TikTok, integração Google Drive, banco de dados ou publicação implementados. As próximas entregas devem ser feitas em etapas pequenas, testáveis e documentadas.
