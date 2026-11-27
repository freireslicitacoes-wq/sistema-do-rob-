# Modo de publicação em massa de biblioteca

## Objetivo

Permitir que o usuário conecte uma pasta autorizada do Google Drive ou importe um conjunto grande de arquivos e escolha um modo operacional dedicado para publicar os vídeos originais em sequência, sem executar o fluxo pesado de criação de cortes.

Este modo atende bibliotecas com dezenas ou centenas de vídeos. É uma modalidade diferente de produção de cortes e de monitoramento de lives.

## Modos operacionais do painel

O painel deve oferecer três modos de trabalho claramente separados:

1. **Publicar biblioteca (em massa):** listar os vídeos da pasta, um por um, ordenar a fila e publicar os arquivos originais.
2. **Criar cortes de vídeos:** analisar vídeos gravados, identificar trechos, editar e gerar versões verticais.
3. **Monitorar live:** acompanhar uma transmissão compatível e autorizada, identificar momentos e criar rascunhos de cortes.

A execução de uma campanha de publicação em massa é exclusiva: enquanto ela estiver ativa, o sistema não inicia processamento de cortes nem monitoramento de lives para publicação. Esses outros trabalhos ficam pausados/aguardando, sem consumir recursos nem misturar itens na fila ativa. O usuário deve pausar ou encerrar a campanha em massa antes de iniciar outro modo.

## Importação e ordenação

1. O usuário escolhe uma pasta autorizada do Drive ou importa uma pasta/arquivo compactado suportado.
2. O sistema enumera os arquivos individualmente e apresenta nome, duração, tamanho, formato, posição e estado.
3. A ordenação padrão é **numérica natural crescente** pelo nome do arquivo: 01, 02, 03 ... 10, 11, 12. Assim, 10 não aparece antes de 2. Para nomes sem números ou empates, usar o nome completo e depois a ordem de inclusão como desempate.
4. O usuário pode escolher outra ordenação, mas a ordem selecionada fica registrada e não muda silenciosamente após reinício.
5. O sistema verifica formato, duração, integridade, duplicidade e compatibilidade básica.

## Preparação leve de legenda e hashtags

Este modo não executa busca de melhores momentos, recorte, reenquadramento, renderização de cortes ou monitoramento de lives. Entretanto, pode realizar uma preparação leve de metadados para cada vídeo:

- Criar uma legenda básica, curta e coerente com o conteúdo.
- Identificar o assunto do vídeo usando sinais leves disponíveis, como nome do arquivo, metadados e, quando necessário, uma análise resumida do conteúdo. Não precisa transcrever nem processar o vídeo inteiro.
- Sugerir hashtags específicas do assunto e do público do vídeo.
- Quando houver fonte oficial ou autorizada de tendências disponível, acrescentar poucas hashtags em tendência que sejam realmente pertinentes ao assunto e à região/idioma da conta.
- Nunca inserir hashtags populares sem relação com o vídeo apenas para tentar obter alcance.
- Não prometer viralização. Tendências mudam rapidamente e hashtags não garantem visualizações.
- Mostrar legenda e hashtags para edição/revisão. Permitir modelo de legenda padrão definido pelo usuário.
- Se não houver dados confiáveis de tendências, usar hashtags relevantes ao conteúdo e informar que não foi possível validar tendências atuais.

## Limite diário e horários de publicação

A configuração da campanha deve permitir ao usuário definir **quantos vídeos deseja publicar por dia**. O painel distribui os itens selecionados em horários de publicação ao longo do dia, priorizando janelas de maior atividade da audiência.

- Oferecer um limite diário configurável pelo usuário, sem sugerir que esse número será necessariamente permitido pela plataforma.
- Sugerir horários de pico com base, preferencialmente, nos dados de atividade dos seguidores/conta fornecidos pelo TikTok ou por analytics autorizados.
- Se não houver dados próprios suficientes, apresentar sugestões genéricas claramente identificadas como estimativas, considerando país, fuso e público-alvo; permitir edição manual dos horários.
- Aprender com métricas históricas da própria conta quando disponíveis, sem afirmar que um horário é universalmente melhor.
- Distribuir a quantidade diária escolhida nos horários configurados, respeitando intervalos mínimos e a capacidade real de publicação da conta.
- Exibir calendário/grade com quantidade por dia, horário e vídeo atribuído antes da confirmação.
- Usar o fuso configurado da conta; para a agenda inicial do projeto, America/Belem.
- Se o limite escolhido pelo usuário for maior que o permitido pela API, mostrar o limite efetivo e pedir ajuste/confirmar a agenda possível. Nunca tentar contornar limites do TikTok.
- Não acumular publicações perdidas. Registrar o atraso e seguir a política de pausa/adiamento definida, sem disparar vários vídeos juntos.

## Fluxo da campanha

1. O usuário conecta a pasta e sincroniza os arquivos.
2. O sistema lista os vídeos na ordem numérica natural (01, 02, 03...) e valida os arquivos.
3. O sistema prepara legendas e hashtags leves, sem criar cortes.
4. O usuário escolhe a quantidade diária e revisa os horários sugeridos de pico.
5. O sistema mostra a agenda completa, os vídeos atribuídos a cada horário, as legendas e hashtags.
6. O usuário confirma explicitamente a campanha, a conta de destino, a seleção exata de vídeos, os metadados e as opções de publicação exigidas.
7. O sistema agenda e envia no máximo um vídeo por vez, respeitando os horários, limites e respostas atuais da API oficial do TikTok.
8. Após confirmação de sucesso, marca o item como publicado e avança para o próximo. Em falha ou resultado incerto, pausa a sequência, registra o motivo e verifica o estado antes de qualquer nova tentativa.
9. A posição da fila, a campanha e o histórico persistem após reinicialização.

## Aprovação e consentimento

- A confirmação da campanha deve apresentar a lista exata de itens, datas/horários, legendas e hashtags e registrar consentimento por item.
- A aprovação fica vinculada ao hash/versão do arquivo e aos metadados aprovados.
- Se um arquivo ou metadado mudar, a aprovação daquele item é invalidada.
- Não incluir automaticamente novos arquivos adicionados à pasta depois da confirmação. O usuário deve sincronizar e confirmar a inclusão em uma nova seleção.
- Não publicar itens que falhem na validação, estejam duplicados ou não tenham autorização de uso.
- Não publicar silenciosamente conteúdo sem ação de confirmação do usuário.

## Exclusividade e recursos

- Uma única campanha de publicação em massa pode controlar a fila ativa por conta TikTok.
- Enquanto a campanha estiver ativa, desabilitar o início de novas tarefas de corte e lives para publicação; mostrar que estão indisponíveis até a campanha ser pausada/encerrada.
- Não apagar tarefas de corte/live já existentes: preservá-las em estado pausado/aguardando para retomada explícita.
- Não processar todos os vídeos em paralelo. A publicação deve ser sequencial, um item por vez.
- A exclusividade do modo não significa que o sistema possa ignorar limites da plataforma ou publicar em qualquer frequência.

## Agenda, limites e falhas

- Antes de cada envio, consultar permissões, opções e limites atuais retornados pela API oficial.
- Se a API não permitir o volume ou a frequência pretendida, pausar e informar o limite; não contornar por outras contas, aplicações ou credenciais.
- Usar idempotência e consultar o estado de uma publicação em caso de timeout para evitar duplicidade.
- Permitir pausar, retomar e cancelar a campanha; retomar do próximo item ainda não publicado e validado.

## Critérios de aceite

1. O usuário consegue conectar uma pasta do Drive e ver cada vídeo em uma lista individual.
2. A ordenação padrão coloca 01, 02, 03 ... 10, 11, 12 na sequência numérica correta.
3. O modo em massa não executa corte, reenquadramento, renderização de cortes ou monitoramento de live.
4. O sistema prepara legendas básicas e hashtags relacionadas ao conteúdo; tendências só são usadas quando verificadas em fonte confiável/autorizada.
5. O usuário pode definir a quantidade diária e revisar/editar horários sugeridos de pico.
6. A agenda mostra o vídeo, horário, legenda e hashtags antes da confirmação.
7. Com a campanha ativa, não é possível iniciar processamento de cortes ou live para publicação.
8. O usuário confirma a lista exata antes de iniciar.
9. O backend envia no máximo um item por vez e só avança após confirmação de sucesso.
10. Reiniciar o serviço não perde a posição nem cria publicações duplicadas.
11. Falhas, limites e horários perdidos não provocam disparo acumulado.
12. Novos arquivos no Drive não entram automaticamente em campanha já confirmada.
13. O painel permite pausar, retomar e encerrar a campanha.
