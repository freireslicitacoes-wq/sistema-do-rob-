# Etapa 1 — Fundação da aplicação

## Entregue nesta etapa
- Estrutura inicial do serviço HTTP em `apps/api`.
- API Node.js sem dependências externas, usando módulos nativos.
- Rota `GET /health` para verificar se o processo está respondendo.
- Resposta JSON padronizada para rotas inexistentes.
- Testes automatizados para saúde e rota 404.
- Exemplo de variáveis de ambiente sem segredos reais.
- Regras Git para não versionar arquivos de ambiente, dependências ou logs.

## Como executar localmente
Requer Node.js 20 ou superior.

```bash
cd apps/api
npm test
npm start
```

A API inicia na porta 3000 por padrão. Verifique em `http://localhost:3000/health`.

## Limites desta etapa
Esta é somente a fundação executável. Ainda não há integração com Drive ou TikTok, banco de dados, autenticação, painel web, agendador ou publicação. Os testes foram adicionados ao repositório, mas precisam ser executados em um ambiente Node.js para confirmar o resultado.
