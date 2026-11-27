# Gerente de operações com autonomia controlada

## Objetivo

O sistema terá um gerente com autonomia controlada para diagnosticar falhas, executar recuperações operacionais previamente autorizadas, desenvolver correções em ambiente isolado, executar testes automaticamente e aprender com incidentes. O gerente não terá permissão para publicar alterações diretamente em produção sem passar pelos controles definidos neste documento.

O gerente poderá trabalhar de forma independente na investigação, desenvolvimento e validação. Ações operacionais automáticas ficam limitadas a uma lista segura e predefinida. Produção permanece protegida por barreiras técnicas e aprovação humana.

## Responsabilidades do gerente

1. Observar saúde dos serviços, filas, workers, armazenamento, integrações e resultados do pipeline.
2. Detectar anomalias: tarefas paradas, falhas repetidas, crescimento anormal de fila, consumo excessivo de recursos, erros de API e divergências de estado.
3. Correlacionar logs, métricas e histórico de incidentes para identificar causa provável.
4. Escolher uma ação de recuperação permitida: repetir tarefa idempotente, reiniciar worker, colocar integração em quarentena, pausar fila ou selecionar um motor reserva previamente configurado.
5. Quando a recuperação operacional não bastar, criar uma correção de código em branch/ambiente isolado.
6. Executar testes e produzir relatório com causa, arquivos alterados, riscos, resultados e plano de reversão.
7. Registrar o incidente e a solução em uma base de conhecimento versionada, sem guardar segredos ou dados pessoais desnecessários.

## Limites de autonomia

### Permitido sem aprovação humana

- Diagnosticar e classificar incidentes.
- Consultar logs, métricas e estado das filas.
- Reexecutar operações comprovadamente idempotentes, respeitando limites de tentativas.
- Reiniciar somente serviços/containers não críticos previamente autorizados por política.
- Pausar automaticamente a fila diante de risco de duplicação, autorização inválida, limite da plataforma ou estado incerto.
- Criar branches, editar código, abrir pull requests e executar testes em sandbox/CI.
- Preparar releases e relatórios de validação.

### Exige aprovação humana

- Fazer merge ou promover uma versão para produção.
- Alterar banco de dados de produção ou executar migrações destrutivas.
- Alterar permissões, OAuth scopes, políticas de segurança ou gestão de segredos.
- Alterar regras de publicação, consentimento, privacidade ou limites TikTok.
- Apagar arquivos, vídeos, histórico ou dados de usuários.
- Aumentar gastos, ativar serviços pagos ou contratar recursos.
- Repetir publicação quando o resultado anterior for incerto.
- Desativar controles, testes ou monitoramento.

Nenhum agente pode conceder a si mesmo novas permissões ou modificar as regras que limitam sua própria autonomia.

## Barreiras obrigatórias antes da produção

Toda alteração deve passar por esta sequência:

1. **Branch isolada:** nunca editar diretamente a branch de produção.
2. **Reprodução:** registrar o incidente e, quando possível, criar um teste que reproduza a falha.
3. **Revisão automatizada:** lint, formatação, análise estática, verificação de tipos e auditoria de dependências.
4. **Testes:** unitários, integração e regressão; testes de contrato para integrações externas; testes de segurança aplicáveis.
5. **Critérios de qualidade:** todos os testes obrigatórios aprovados; nenhuma vulnerabilidade crítica/alta sem tratamento e justificativa aprovada; nenhuma alteração de comportamento sensível sem cobertura.
6. **Ambiente de staging:** aplicar a versão em ambiente separado e executar smoke tests e testes de fluxo ponta a ponta com dados fictícios.
7. **Plano de reversão:** release identificada, backup verificado quando houver dados persistentes e procedimento de rollback testável.
8. **Pull request e relatório:** descrever causa, solução, riscos, evidências dos testes e impacto esperado.
9. **Aprovação humana:** requisito inicial para merge e promoção a produção.
10. **Liberação gradual:** quando tecnicamente possível, usar canário/feature flag, monitorar indicadores e reverter automaticamente se os limites de erro forem excedidos.

Se uma etapa falhar, a mudança não avança. O gerente deve explicar o bloqueio e pode tentar outra correção em nova branch.

## Proteções específicas do TikTok e da fila

- O gerente nunca pode contornar OAuth, permissões, limites, auditoria ou políticas oficiais do TikTok.
- Nunca pode publicar conteúdo sem aprovação e consentimento explícitos por vídeo.
- Nunca pode alterar silenciosamente legenda, arquivo aprovado, privacidade ou horário após aprovação.
- Em timeout ou resposta ambígua, consultar o status antes de qualquer nova tentativa.
- Pausar a fila diante de risco de publicação duplicada, bloqueio, limite ou restrição da conta.
- Não aumentar frequência de postagem automaticamente.
- Testes devem usar mocks/sandbox e contas/dados de teste; não publicar conteúdo real como parte de testes automáticos.

## Arquitetura lógica

- **Observabilidade:** métricas, logs estruturados, traces e alertas.
- **Supervisor:** detecta incidentes e aplica políticas de recuperação.
- **Agente engenheiro:** analisa causa, implementa correção e abre pull request.
- **Esteira CI:** executa verificações, testes, análise de dependências e segurança.
- **Staging:** valida a versão isoladamente.
- **Guardião de release:** verifica todos os requisitos e exige aprovação humana para produção.
- **Rollback:** restaura versão anterior ou desativa feature flag quando necessário.
- **Memória de incidentes:** armazena sintomas, causa, correção, evidências e resultado.

Os agentes devem ter permissões mínimas e separadas. O agente de desenvolvimento não recebe credenciais de produção; o supervisor operacional só recebe permissões de recuperação explicitamente autorizadas; o guardião de release controla a promoção.

## Auditoria e transparência

Cada incidente e ação deve registrar:
- identificador do incidente e serviço afetado;
- horário, sintomas e evidências;
- hipótese de causa e grau de confiança;
- ações executadas e permissões usadas;
- branch/commit/versão envolvidos;
- resultados dos testes e do staging;
- decisão de aprovação, bloqueio ou rollback;
- resultado observado após a recuperação.

Não registrar tokens, senhas, chaves privadas ou conteúdo sensível nos logs.

## Implantação por etapas

1. Instrumentar serviços e definir health checks.
2. Implementar supervisor com ações seguras e limites de repetição.
3. Criar pipeline CI e ambiente de testes.
4. Permitir ao agente criar branches e pull requests.
5. Adicionar staging, backups e rollback.
6. Integrar guardião de release e aprovação humana.
7. Manter aprovação humana para toda promoção a produção. Qualquer ampliação futura de autonomia exige decisão explícita do usuário, revisão de risco e alteração documentada desta política.

## Critérios de aceite

- Uma falha simulada é detectada e registrada.
- O supervisor consegue pausar uma fila insegura sem perder seu estado.
- O agente cria uma correção em branch sem alterar produção.
- Testes com falha bloqueiam a promoção.
- Uma alteração aprovada passa por staging e gera relatório reproduzível.
- A promoção para produção exige aprovação humana.
- Uma regressão em staging ou canário aciona bloqueio/rollback conforme a política.
- O agente não consegue acessar segredos de produção nem mudar seus próprios limites.
- Incidentes anteriores podem ser consultados sem expor segredos.

## Política obrigatória de redundância e continuidade

Toda capacidade crítica deve ter motor principal e reserva independente, quando houver alternativa técnica viável. Registrar cobertura, dependências, licença, sinais de falha, limites de tentativas, failover, retorno ao principal e testes de contrato.

O gerente deve diagnosticar; tentar recuperação segura e limitada; se persistir, colocar o principal em quarentena para aquele trabalho e encaminhar ao reserva validado; se ambos falharem, manter a tarefa persistida em estado de atenção, preservar arquivos/logs e informar o bloqueio. Nunca apagar a tarefa, ignorar falha ou declarar sucesso sem evidência.

Failover só após falha confirmada ou encerramento comprovado do motor anterior. Em timeout/estado incerto, verificar processo, arquivos e manifesto antes de repetir. A saída de cada motor deve passar pela mesma validação. Um motor reserva listado ainda não está habilitado: exige auditoria, instalação, teste, verificação de licença e aprovação de configuração. Se não houver reserva viável, registrar a lacuna.
