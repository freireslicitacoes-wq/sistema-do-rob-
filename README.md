# TikTok Auto Publisher AI

Projeto para organizar vídeos, gerar cortes e preparar publicações no TikTok com revisão humana.

## Princípios

- Priorizar ferramentas open-source e processamento local gratuito quando viável.
- Usar somente conteúdo próprio ou com autorização de uso.
- Não prometer viralização, alcance ou monetização.
- Respeitar as regras, limites e permissões oficiais do TikTok.
- Nunca publicar conteúdo sem aprovação e consentimento explícitos do usuário.
- Não armazenar tokens ou segredos no código-fonte.
- Usar gerente de operações com autonomia controlada e aprovação humana antes de mudanças em produção.

## Modos de trabalho do painel

1. **Publicar biblioteca (em massa):** listar vídeos do Drive individualmente e publicar os arquivos originais, um por vez, sem processamento de cortes. Especificação: [docs/bulk-library-publishing-mode.md](docs/bulk-library-publishing-mode.md).
2. **Criar cortes de vídeos:** analisar vídeos gravados, gerar cortes e preparar versões verticais.
3. **Monitorar live:** acompanhar fontes compatíveis e autorizadas, identificar momentos e criar rascunhos de cortes.

O modo de publicação em massa é exclusivo enquanto estiver ativo: não inicia processamento de cortes nem monitoramento de lives para publicação. Consulte [docs/live-clipping-and-link-import.md](docs/live-clipping-and-link-import.md).

## Fluxo de revisão e publicação

- Pré-visualizar e editar título, descrição e hashtags.
- Confirmar explicitamente a lista exata de itens antes de publicar.
- Registrar aprovação e consentimento por item.
- Agendar somente itens aprovados e autorizados.
- No momento do envio, consultar as informações atuais do criador e respeitar as opções e limites retornados pela API oficial.
- Acompanhar o status da publicação e registrar falhas sem duplicar envios.

## Inventário técnico de componentes

A avaliação inicial de motores de vídeo, licenças, dependências, riscos e plano de testes está em [docs/repository-inventory.md](docs/repository-inventory.md). Nenhum componente externo foi instalado ou integrado ainda.

## Aprovação em lote

A especificação está em [docs/approval-batch-flow.md](docs/approval-batch-flow.md).

## Gerente de operações

O gerente poderá monitorar, diagnosticar, executar recuperações previamente autorizadas, desenvolver correções em branches isoladas e executar testes automaticamente. Alterações em produção exigem aprovação humana. Consulte [docs/autonomous-engineering-manager.md](docs/autonomous-engineering-manager.md).

## Implementação — etapa 1

A fundação inicial da API foi criada em `apps/api`: servidor HTTP Node.js, rota de saúde, tratamento de rota inexistente, testes automatizados e exemplo seguro de configuração. Consulte [docs/step-01-foundation.md](docs/step-01-foundation.md). Os testes ainda precisam ser executados em ambiente Node.js; não há confirmação de execução nesta etapa.

## Estado atual

A aplicação está em construção. Ainda não há integração TikTok, integração Google Drive, banco de dados, painel web, agendador ou publicação implementados. As próximas entregas devem ser feitas em etapas pequenas, testáveis e documentadas.
