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

## Implementação — etapa 2

Foi adicionada a estrutura inicial PostgreSQL em `infra/postgres`: biblioteca de arquivos, campanhas, fila de publicações, aprovações/consentimentos, tentativas idempotentes e auditoria. O Compose e as instruções locais estão em [infra/postgres/README.md](infra/postgres/README.md).

## Implementação — etapa 3

A API agora possui pool PostgreSQL configurado por `DATABASE_URL`, health check com estado do banco e rotas para cadastrar/listar arquivos da biblioteca e campanhas. As consultas são parametrizadas e as entradas são validadas. Consulte [apps/api/README.md](apps/api/README.md). Os testes foram escritos, mas ainda não executados; a conexão real e a migration também precisam ser verificadas em ambiente com PostgreSQL.

## Implementação — etapa 4

Foram implementados endpoints de upload multipart do desktop e importação de arquivo individual por link público do Google Drive. Os originais são armazenados em disco local configurável, com limite de tamanho, validação básica de formato e hash SHA-256, e registrados na biblioteca PostgreSQL. O Drive pode exigir confirmação e recusar download direto; pastas inteiras e links privados não são suportados. A interface visual e autenticação ainda não existem. Não exponha a API à internet. Consulte [docs/step-04-ingestion-inputs.md](docs/step-04-ingestion-inputs.md) e [apps/api/README.md](apps/api/README.md).

## Implementação — etapa 5

Foi adicionado um painel web inicial em `apps/web/index.html` com sinalização visual da biblioteca: vermelho para não publicados, amarelo para programados para hoje e verde para publicações confirmadas. A API ganhou `GET /api/library/status` para fornecer os totais e a lista. Consulte [documentação da etapa 5](docs/step-05-library-status-dashboard.md). A página ainda precisa ser servida e conectada à API; não há autenticação nem hospedagem configurada.

## Importação pelo painel — etapa 9

O painel agora oferece seleção de arquivo do computador e importação de link público de arquivo individual do Google Drive. Após a importação, a biblioteca é atualizada automaticamente. Consulte [guia da etapa 9](docs/step-09-dashboard-import.md). A interface foi adicionada ao repositório, mas ainda precisa ser testada com Docker em um computador. A API continua sem autenticação e deve permanecer acessível somente em localhost.

## Execução local integrada — etapa 8

Foi adicionado um Dockerfile para a API e o Docker Compose agora inicia PostgreSQL, aplica a migration e inicia a API com volumes locais persistentes. As portas ficam vinculadas a localhost. Consulte [guia da etapa 8](docs/step-08-local-runtime.md). A configuração foi escrita no repositório, mas ainda precisa ser executada em um computador com Docker; não há confirmação de inicialização real.

## Seleção e criação de campanha — etapa 10

O painel permite selecionar vídeos da biblioteca e criar uma campanha em rascunho, com sequência natural. Isso não aprova, agenda ou publica. Consulte [guia da etapa 10](docs/step-10-campaign-selection.md). Testes escritos, ainda sem execução confirmada.

## Motor de cortes — etapa 11

Foi criado um adaptador local para o Chopify em `apps/clipper`, com isolamento de pastas, saída 9:16 e testes simulados. O motor upstream ainda não foi instalado nem executado; veja [guia da etapa 11](docs/step-11-chopify-adapter.md). A fila persistente e a integração do painel ainda virão.

## Redundância de ferramentas

Toda habilidade crítica deve ter motor principal e reserva independente, com failover controlado e tarefas preservadas até conclusão ou decisão humana. Para cortes: Chopify é principal e PeakCut está definido como reserva a validar; failover ainda não está ativo. Consulte [etapa 12](docs/step-12-clip-jobs-fallback.md).

## Ciclo de armazenamento — etapa 14

Foi criada a fundação do ciclo de armazenamento: política configurável de retenção (72 horas), preservação manual, estados de exclusão e limites de ocupação. A política começa desativada; nenhuma exclusão automática foi ligada. Docker Compose e CI aplicam a migration 004. Consulte [etapa 14](docs/step-14-storage-lifecycle-foundation.md). A rotina física de limpeza, medição de espaço e pausa de importações ainda precisam ser implementadas e testadas.

## Monitoramento de armazenamento — etapa 15

Foi implementado monitoramento do volume de mídia e bloqueio preventivo de novas importações: pausa no limite de 85% de ocupação ou abaixo de 1 GiB livre; retomada somente em 70% ou menos, respeitando a reserva mínima. O estado fica no banco e pode ser consultado em `GET /api/storage/status`. O Docker Compose ativa a proteção. Nenhum vídeo é apagado nesta etapa; a limpeza automática continua desativada. Consulte [etapa 15](docs/step-15-storage-capacity-guard.md).

## Limpeza segura do armazenamento — etapa 16

Foi implementado o núcleo de limpeza com verificação de publicação, retenção configurada (72 horas por padrão), preservação manual, transação/lock, validação de caminho local e auditoria. A limpeza permanece desativada por padrão e ainda é manual; não há agendador automático nem validação em Docker local. Consulte [etapa 16](docs/step-16-safe-storage-cleanup.md).

## Agendador de manutenção — etapa 17

Foi criado um agendador periódico opcional para a limpeza, com intervalo configurável, lotes limitados, bloqueio advisory compartilhado no PostgreSQL, status e registro de falhas. Ele só inicia com `STORAGE_CLEANUP_SCHEDULER_ENABLED=true` e ainda exige `storage_policies.enabled=true`; ambos permanecem desligados por padrão. A rotina não publica conteúdo nem ativa exclusões automaticamente por padrão. Consulte [etapa 17](docs/step-17-storage-maintenance-scheduler.md).

## Central de alertas — etapa 18

Foi criada uma central persistente para alertas de armazenamento, limpeza, processamento de cortes e publicações com falha ou resultado incerto. Alertas são deduplicados, mantêm histórico e podem ser reconhecidos pelo painel. A detecção ocorre ao consultar `GET /api/alerts`; monitoramento contínuo de serviços externos ainda não existe. Consulte [etapa 18](docs/step-18-alert-center.md).

## Auditoria de motores — etapa 20

Foi auditada documentalmente a licença, arquitetura e dependências de Chopify e PeakCut. Ambos permanecem pendentes e desativados até testes reais. O catálogo de motores e a política de failover seguro foram adicionados; nenhum fallback automático foi ativado. Consulte [etapa 20](docs/step-20-engine-audit.md).

## Gerente de operações — etapa 19

Foi criado o gerente em modo de diagnóstico: classifica alertas, recomenda ações seguras e registra histórico persistente. Ele não executa correções, retries, exclusões ou publicações automaticamente. O motor reserva ainda precisa ser auditado e validado, e o worker de cortes não está integrado ao servidor. Consulte [etapa 19](docs/step-19-operations-manager.md).

## Estado atual

A aplicação continua em construção. Há API, importação inicial de arquivos, painel de biblioteca, schema PostgreSQL e execução local preparada via Docker Compose. Ainda não foi confirmado que o conjunto inicia corretamente em ambiente real. A API não possui autenticação; não deve ser exposta à internet. Os arquivos ficam no computador, sem backup automático ou nuvem.

Ainda faltam: autenticação e proteção da API, fluxo de criação/aprovação/agendamento da campanha, processamento de cortes, integração oficial com TikTok, agendador confiável, monitoramento e rotina de exclusão após 72 horas. Não há publicação automática implementada nem deploy em nuvem.
