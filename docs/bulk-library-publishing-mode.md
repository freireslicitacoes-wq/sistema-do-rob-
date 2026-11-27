# Modo de publicação em massa de biblioteca

## Objetivo

Permitir que o usuário conecte uma pasta autorizada do Google Drive ou importe um conjunto grande de arquivos e escolha um modo operacional dedicado para publicar os vídeos originais em sequência, sem executar o fluxo pesado de criação de cortes.

Este modo atende bibliotecas com dezenas ou centenas de vídeos. É uma modalidade diferente de produção de cortes e de monitoramento de lives.

## Modos operacionais do painel

O painel deve oferecer três modos de trabalho claramente separados:

1. **Publicar biblioteca (em massa):** listar os vídeos da pasta, um por um, ordenar a fila e preparar a publicação dos arquivos originais.
2. **Criar cortes de vídeos:** analisar vídeos gravados, identificar trechos, editar e gerar versões verticais.
3. **Monitorar live:** acompanhar uma transmissão compatível e autorizada, identificar momentos e criar rascunhos de cortes.

A execução de uma campanha de publicação em massa é exclusiva: enquanto ela estiver ativa, o sistema não inicia processamento de cortes nem monitoramento de lives para publicação. Esses outros trabalhos podem ficar pausados/aguardando, sem consumir recursos nem misturar itens na fila ativa. O usuário deve encerrar ou pausar a campanha em massa antes de iniciar outro modo.

## Fluxo do modo Publicar biblioteca

1. O usuário escolhe uma pasta autorizada do Drive ou importa uma pasta/arquivo compactado suportado.
2. O sistema enumera os arquivos individualmente e apresenta uma lista com nome, duração, tamanho, formato, posição e estado.
3. O usuário escolhe a ordenação (nome crescente, nome decrescente ou ordem de inclusão). A ordem escolhida fica registrada e não muda silenciosamente após reinício.
4. O sistema verifica formato, duração, integridade, duplicidade e compatibilidade básica. Não executa análise semântica, busca de melhores momentos, recorte ou renderização de cada vídeo neste modo.
5. O sistema mostra a lista completa e um resumo do lote antes da confirmação.
6. O usuário confirma explicitamente a campanha, a conta de destino, a seleção exata de vídeos, as legendas/metadados aplicáveis e as opções de publicação exigidas.
7. O sistema agenda e processa um vídeo por vez, em sequência, respeitando os horários configurados, limites e respostas atuais da API oficial do TikTok.
8. Após confirmação de sucesso, marca o item como publicado e avança para o próximo. Em falha ou resultado incerto, pausa a sequência, registra o motivo e verifica o estado antes de qualquer nova tentativa.
9. A posição da fila, a campanha e o histórico persistem após reinicialização.

## Aprovação e consentimento

- A confirmação da campanha pode abranger muitos vídeos, mas deve apresentar a lista exata dos itens incluídos e registrar o consentimento para cada item.
- A aprovação deve ficar vinculada ao hash/versão do arquivo e aos metadados/legenda aprovados.
- Se um arquivo ou metadado mudar, a aprovação daquele item é invalidada.
- Não incluir automaticamente novos arquivos adicionados à pasta depois da confirmação. O usuário deve sincronizar e confirmar a inclusão em uma nova seleção.
- Não publicar itens que falhem na validação, estejam duplicados ou não tenham autorização de uso.
- Não publicar silenciosamente conteúdo sem uma ação de confirmação do usuário.

## Exclusividade e recursos

- Uma única campanha de publicação em massa pode controlar a fila ativa por conta TikTok.
- Enquanto a campanha estiver ativa, desabilitar o início de novas tarefas de corte e lives para publicação; mostrar que estão indisponíveis até a campanha ser pausada/encerrada.
- Não apagar tarefas de corte/live já existentes: preservá-las em estado pausado/aguardando para retomada explícita.
- Não processar todos os vídeos em paralelo. A publicação deve ser sequencial, um item por vez.
- A exclusividade do modo não significa que o sistema possa ignorar limites da plataforma ou publicar em qualquer frequência.

## Agenda, limites e falhas

- Usar o fuso configurado da conta; para a agenda inicial do projeto, America/Belem.
- Não tentar compensar horários perdidos publicando vários vídeos de uma vez.
- Antes de cada envio, consultar as permissões, opções e limites atuais retornados pela API oficial.
- Se a API não permitir o volume ou a frequência pretendida, pausar e informar o limite; não contornar por outras contas, aplicações ou credenciais.
- Usar idempotência e consultar o estado de uma publicação em caso de timeout para evitar duplicidade.
- Permitir pausar, retomar e cancelar a campanha; retomar do próximo item ainda não publicado e validado.

## Critérios de aceite

1. O usuário consegue conectar uma pasta do Drive e ver cada vídeo em uma lista individual.
2. A lista apresenta ordenação escolhida e posição persistente.
3. O modo em massa não executa corte, reenquadramento, renderização ou monitoramento de live.
4. Com a campanha ativa, não é possível iniciar processamento de cortes ou live para publicação.
5. O usuário confirma a lista exata antes de iniciar.
6. O backend publica no máximo um item por vez e só avança após confirmação de sucesso.
7. Reiniciar o serviço não perde a posição nem cria publicações duplicadas.
8. Falhas, limites e horários perdidos pausam ou adiam a fila conforme as regras, sem disparo acumulado.
9. Novos arquivos no Drive não entram automaticamente em uma campanha já confirmada.
10. O painel permite pausar, retomar e encerrar a campanha.