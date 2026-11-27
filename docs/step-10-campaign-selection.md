# Etapa 10 — Seleção da biblioteca e criação de campanha

## Implementado
- Endpoint `POST /api/campaigns/from-library` recebe nome, modo, fuso e IDs de 1 a 500 vídeos.
- Valida UUIDs, rejeita IDs repetidos, valida fuso horário e aceita somente vídeos disponíveis (`imported` ou `ready`).
- Cria campanha em estado inicial `draft` e adiciona os vídeos selecionados como `publication_items`.
- Calcula a sequência no servidor por número natural, nome e posição de importação.
- Criação da campanha e inclusão dos itens são feitas em uma única instrução SQL; seleção inválida não deixa campanha parcial.
- O painel permite selecionar vídeos, selecionar todos, ver o contador e criar campanha rascunho.

## Limites
Criar campanha não aprova, agenda nem publica. Os itens começam como `imported`. Aprovação e consentimento são passos separados. Testes foram escritos, mas ainda não executados. A execução Docker/PostgreSQL continua pendente.
