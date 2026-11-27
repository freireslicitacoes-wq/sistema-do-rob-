# Modo de publicação em massa de biblioteca

## Objetivo

Permitir que o usuário conecte uma pasta autorizada do Google Drive ou importe um conjunto grande de arquivos e publique em sequência vídeos que já estão editados e prontos para publicação.

**Neste modo, os vídeos não serão editados.** O sistema preserva e publica o arquivo original, sem cortes, reenquadramento, aplicação de efeitos, legendas sobrepostas, alteração de áudio ou renderização. O trabalho da IA fica limitado à organização da biblioteca, preparação de metadados (legenda e hashtags), agenda e acompanhamento da publicação.

## Modos operacionais do painel

1. **Publicar biblioteca (em massa):** listar os vídeos da pasta e publicar os arquivos originais.
2. **Criar cortes de vídeos:** analisar vídeos gravados, identificar trechos e produzir versões editadas.
3. **Monitorar live:** acompanhar fontes compatíveis e autorizadas, identificar momentos e criar rascunhos de cortes.

A campanha de publicação em massa é exclusiva: enquanto estiver ativa, o sistema não inicia processamento de cortes nem monitoramento de lives para publicação. Esses trabalhos ficam pausados/aguardando até a campanha ser pausada ou encerrada.

## Importação e ordenação

1. O usuário escolhe uma pasta autorizada do Drive ou importa arquivos.
2. O sistema enumera cada arquivo e apresenta nome, duração, tamanho, formato, posição e estado.
3. A ordenação padrão é **numérica natural crescente** pelo nome: 01, 02, 03 ... 10, 11, 12. Assim, 10 não aparece antes de 2.
4. Para nomes sem números ou empates, usar o nome completo e depois a ordem de inclusão como desempate.
5. O usuário pode escolher outra ordenação; a ordem fica registrada e não muda silenciosamente após reinício.
6. O sistema verifica apenas formato, duração, integridade, duplicidade e compatibilidade básica. Não reencoda nem modifica o vídeo.

## Legendas e hashtags (sem editar o vídeo)

- Criar uma legenda básica, curta e coerente com o assunto do vídeo.
- Sugerir hashtags específicas do tema e do público do vídeo.
- Quando houver fonte oficial ou autorizada de tendências disponível, acrescentar poucas hashtags em tendência que sejam realmente pertinentes ao conteúdo e à região/idioma da conta.
- Não inserir hashtags populares sem relação com o vídeo.
- Não prometer viralização; tendências mudam e hashtags não garantem visualizações.
- Para identificar o assunto, usar primeiro nome do arquivo, nome da pasta e informações fornecidas pelo usuário. Se isso não bastar e houver recurso local leve disponível, poderá usar análise pontual de metadados/quadros, sem alterar o arquivo nem gerar uma versão editada.
- Mostrar legenda e hashtags para revisão/edição antes da campanha. Permitir um modelo padrão definido pelo usuário.
- Se não houver dados confiáveis de tendências, usar hashtags pertinentes ao assunto e informar que tendências atuais não foram verificadas.

## Quantidade diária e horários de pico

A configuração permite ao usuário definir quantos vídeos deseja publicar por dia.

- Sugerir horários com base preferencialmente nos dados de atividade dos seguidores/conta obtidos por meios oficiais ou analytics autorizados.
- Se não houver dados próprios suficientes, apresentar estimativas claramente identificadas, ajustadas ao país, fuso e público-alvo; permitir edição manual.
- Aprender com métricas históricas da própria conta quando disponíveis; não tratar horários como universalmente ideais.
- Distribuir os vídeos na quantidade diária escolhida e mostrar calendário com vídeo, data, horário, legenda e hashtags antes da confirmação.
- Usar o fuso configurado; o padrão inicial do projeto é America/Belem.
- O número escolhido pelo usuário é uma meta de agenda, não uma garantia de que o TikTok permitirá esse volume. Consultar as permissões e limites atuais da API oficial; se houver restrição, informar o limite efetivo e pedir ajuste.
- Não acumular publicações perdidas nem disparar vários vídeos juntos para compensar atraso.

## Fluxo da campanha

1. Conectar a pasta e sincronizar os arquivos.
2. Listar e ordenar os vídeos por número (01, 02, 03...).
3. Validar os arquivos sem editar ou reprocessar seu conteúdo.
4. Preparar legendas e hashtags, sem modificar o vídeo.
5. Escolher quantidade diária e revisar os horários sugeridos.
6. Conferir a agenda completa e a lista exata de vídeos.
7. Confirmar explicitamente a campanha, a conta de destino, os metadados e as opções de publicação exigidas.
8. Enviar no máximo um vídeo por vez, respeitando horários e limites oficiais.
9. Só avançar após confirmação de sucesso. Em falha ou resultado incerto, pausar e verificar o estado antes de tentar novamente.
10. Preservar posição, campanha e histórico após reinicialização.

## Aprovação e consentimento

- A confirmação apresenta a lista exata de itens, datas/horários, legendas e hashtags e registra consentimento por item.
- A aprovação fica vinculada ao hash/versão do arquivo e aos metadados aprovados.
- Alterar o arquivo ou metadados invalida a aprovação daquele item.
- Arquivos adicionados à pasta depois da confirmação não entram automaticamente na campanha.
- Não publicar itens inválidos, duplicados ou sem autorização de uso.
- Não publicar sem ação explícita de confirmação do usuário.

## Exclusividade e recursos

- Uma campanha de publicação em massa controla a fila ativa por conta TikTok.
- Enquanto estiver ativa, não iniciar tarefas de corte nem lives para publicação.
- Preservar tarefas de corte/live existentes em estado pausado/aguardando.
- Publicar sequencialmente, no máximo um item por vez.
- A exclusividade não permite ignorar limites ou regras da plataforma.

## Falhas e confiabilidade

- Consultar permissões, opções e limites atuais antes dos envios.
- Pausar e informar restrições; nunca contornar limites por outras contas, aplicações ou credenciais.
- Usar idempotência e consultar o estado em caso de timeout para evitar duplicidade.
- Permitir pausar, retomar e cancelar; retomar do próximo item não publicado e validado.

## Critérios de aceite

1. A pasta do Drive aparece como lista individual de vídeos.
2. A ordenação padrão é numérica natural: 01, 02, 03 ... 10, 11, 12.
3. Os arquivos originais são enviados sem edição, recorte, reenquadramento, sobreposição de legendas ou re-renderização.
4. O sistema só prepara metadados: legenda e hashtags relacionadas ao conteúdo.
5. O usuário define a quantidade diária e revisa os horários sugeridos.
6. A agenda mostra vídeo, horário, legenda e hashtags antes da confirmação.
7. O modo em massa bloqueia o início de cortes e lives para publicação enquanto ativo.
8. A campanha exige confirmação explícita da lista exata.
9. O backend envia no máximo um item por vez e só avança após sucesso confirmado.
10. Reinicialização não perde a posição nem cria duplicatas.
11. Falhas e horários perdidos não provocam disparo acumulado.
12. Novos arquivos não entram automaticamente em campanha já confirmada.
13. O painel permite pausar, retomar e encerrar a campanha.
