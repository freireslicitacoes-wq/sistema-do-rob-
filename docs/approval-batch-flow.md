# Fluxo de aprovação em lote

## Objetivo

Permitir que o usuário revise vários vídeos preparados pelo sistema, aprove um conjunto e só então coloque esses vídeos na fila de agendamento. Aprovar um vídeo não pode aprovar automaticamente outros vídeos do mesmo lote.

## Estados do conteúdo

- `imported`: importado, ainda não processado.
- `processing`: análise/corte/renderização em andamento.
- `review_pending`: prévia pronta, aguardando revisão.
- `approved`: aprovado pelo usuário, mas ainda não agendado.
- `scheduled`: possui horário futuro e autorização registrada.
- `uploading`: envio iniciado para TikTok.
- `published`: TikTok confirmou publicação.
- `rejected`: rejeitado pelo usuário.
- `failed`: falha técnica; exige tratamento antes de nova tentativa.
- `cancelled`: removido da fila pelo usuário.

Transições devem ser validadas no servidor. Não permitir publicar itens em `review_pending`, `rejected`, `failed` ou `cancelled`.

## Tela de revisão

Cada cartão de vídeo deve exibir:

- Prévia reproduzível do vídeo final.
- Nome e origem do arquivo.
- Duração e formato.
- Título/legenda editável.
- Hashtags editáveis.
- Indicação de áudio e eventuais alertas de direitos/qualidade.
- Caixa individual para selecionar o item no lote.
- Ações individuais: aprovar, rejeitar, editar e visualizar.

A tela deve oferecer selecionar todos os itens elegíveis, limpar seleção e mostrar a quantidade selecionada. Itens rejeitados ou com erro não podem ser aprovados em lote sem antes resolver a condição impeditiva.

## Confirmação do lote

Antes de confirmar, exibir resumo dos vídeos selecionados e pedir uma ação inequívoca. O consentimento deve explicar que os vídeos selecionados serão enviados à conta TikTok conectada, conforme os horários configurados.

Guardar, por item:

- usuário que aprovou;
- data/hora da aprovação;
- versão/hash do arquivo aprovado;
- versão do título/legenda aprovada;
- consentimento explícito para envio;
- data/hora e fuso do agendamento;
- opções de privacidade/interações escolhidas pelo usuário quando exigidas pela API.

Alterações no vídeo ou na legenda após aprovação invalidam a aprovação daquele item e exigem nova revisão.

## Agendamento e limites

- Só itens aprovados e com consentimento válido entram na fila.
- Usar fuso `America/Belem` para a agenda configurada pelo usuário.
- Não acumular publicações atrasadas: registrar o atraso e não disparar em massa.
- Antes de cada publicação, consultar a API oficial do TikTok para obter as informações atuais do criador, opções de privacidade, permissões de interação e duração máxima.
- Não presumir que existe um número diário universal seguro. Respeitar o limite retornado pelo TikTok e interromper novas tentativas diante de respostas de limite, restrição ou risco de spam.
- Não definir privacidade padrão. O usuário deve escolher uma opção disponível para cada publicação conforme as exigências atuais da API.
- Não contornar limites por múltiplas aplicações, contas ou credenciais.

## Segurança e confiabilidade

- Tokens OAuth e segredos ficam apenas em armazenamento seguro no servidor, nunca no frontend ou no Git.
- Usar identificador idempotente por publicação para evitar duplicação.
- Registrar tentativas, respostas, IDs de publicação e status final.
- Em timeout ou resultado incerto, consultar o status antes de tentar novamente.
- Uma falha não deve avançar silenciosamente a sequência.
- Pausar a fila em erros de autorização, limite diário ou restrição de conta.

## Critérios de aceite

1. É possível selecionar vários vídeos elegíveis e aprová-los numa única confirmação.
2. Nenhum vídeo não selecionado é aprovado.
3. Vídeos rejeitados ou com erro não são agendados.
4. A aprovação e o consentimento ficam registrados por vídeo.
5. Alterar o vídeo ou legenda invalida a aprovação.
6. Apenas itens aprovados e autorizados entram no agendador.
7. O sistema consulta os dados atuais do criador antes de publicar e respeita as opções retornadas.
8. Falhas e limites interrompem o envio sem criar duplicatas.
9. O painel mostra pendentes, aprovados, agendados, publicados e falhos separadamente.
