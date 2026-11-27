# Importação de vídeos e cortes de transmissões ao vivo

## Objetivo

O sistema deve funcionar como gerenciador, editor e preparador de publicações, aceitando vídeos gravados e fontes de transmissões ao vivo compatíveis. A importação por link não deve ser apresentada como universal: cada plataforma e tipo de URL tem requisitos próprios.

## Modos de entrada

### 1. Vídeo gravado por link

- O usuário cola manualmente a URL no painel.
- O backend valida o formato da URL e identifica a origem.
- Só iniciar aquisição quando a fonte for tecnicamente acessível e o usuário tiver direito/autorização para usar o conteúdo.
- Se o link for privado, protegido, incompatível ou exigir autenticação não suportada, explicar o motivo e oferecer importação do arquivo original.
- Registrar URL de origem, plataforma, data de importação e resultado da validação.
- Não tentar contornar DRM, paywalls, controles de acesso ou restrições técnicas da plataforma.

### 2. Arquivo local ou Google Drive

- Permitir seleção de arquivos e sincronização de uma pasta autorizada do Google Drive.
- Deduplicar por hash e manter a origem rastreável.
- Preservar o arquivo original; trabalhar sobre cópias derivadas.

### 3. Transmissão ao vivo

- O usuário informa o link da live e seleciona iniciar monitoramento.
- Antes de capturar, verificar se a plataforma/fonte oferece acesso autorizado e tecnicamente suportado.
- Quando suportado, manter buffer temporário de mídia e analisar áudio/transcrição e sinais visuais em janelas contínuas.
- Detectar candidatos a momentos relevantes, registrar marcações de tempo e criar rascunhos de cortes.
- Exibir os candidatos no painel para revisão; não publicar automaticamente.
- Se a fonte não permitir captura contínua ou o acesso cair, registrar o motivo e oferecer processamento posterior de uma gravação fornecida pelo usuário.
- Informar claramente quando o monitoramento estiver ativo, pausado ou desconectado.
- Definir retenção limitada para buffers temporários e permitir descarte pelo usuário.
- Não contornar autenticação, DRM, restrições de plataforma ou limites de acesso.

## Fluxo de processamento comum

1. Validar origem, permissões e formato.
2. Importar ou capturar somente o conteúdo autorizado.
3. Gerar metadados e transcrição quando possível.
4. Detectar momentos candidatos e criar cortes verticais.
5. Renderizar prévias com legendas editáveis.
6. Enviar os resultados para a fila de revisão e aprovação já definida em `approval-batch-flow.md`.

## Limites e comportamento seguro

- A compatibilidade deve ser definida por adaptadores de fonte testados, não por promessa de aceitar qualquer URL.
- O monitoramento de live pode depender de a transmissão permanecer pública/acessível e da disponibilidade do fluxo durante toda a sessão.
- Perda de conexão deve permitir retomada segura, sem criar cortes duplicados.
- Nenhum corte de live pode ser publicado sem revisão, aprovação e consentimento explícito por item.
- A integração de publicação continua separada e deve usar somente os meios oficiais autorizados pela plataforma de destino.

## Critérios de aceite

1. O painel aceita uma URL e informa se a fonte é suportada antes de iniciar a importação.
2. Fontes incompatíveis ou não autorizadas são recusadas com explicação clara.
3. Arquivos locais e itens do Drive entram na mesma biblioteca de mídia.
4. Uma live suportada pode ser iniciada, pausada e encerrada pelo usuário.
5. Os candidatos a cortes incluem timestamps e prévias quando tecnicamente disponíveis.
6. Interrupções não geram duplicação silenciosa de mídia ou tarefas.
7. Todos os cortes aguardam revisão e consentimento individual antes de agendamento/publicação.
