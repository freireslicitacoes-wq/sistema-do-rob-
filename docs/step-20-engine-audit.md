# Etapa 20 — Auditoria e registro de motores

## Auditoria dos repositórios consultados

### Chopify — motor principal proposto
- Repositório: https://github.com/mehbul/chopify
- Licença declarada no arquivo LICENSE: MIT.
- README descreve aplicação Python local, CLI e painel local; exporta MP4/SRT e suporta revisão de cortes.
- Requisitos publicados incluem yt-dlp, faster-whisper, sherpa-onnx, OpenCV e NumPy.
- Requer Python 3.11+ e FFmpeg com suporte a H.264/AAC e renderização de legendas.
- README declara execução sem assinatura, chave de API ou envio de vídeos à nuvem.
- O README também deixa claro que as pontuações são sugestões de edição, não previsão/garantia de viralização.

### PeakCut — reserva candidata
- Repositório: https://github.com/haziqahmedqasmi/PeakCut
- Licença declarada no arquivo LICENSE: MIT.
- README descreve FastAPI, pipeline local, fila, banco e postagem para redes conectadas.
- Requisitos publicados incluem FastAPI, httpx, NumPy, psycopg, sherpa-onnx, SQLAlchemy, uvicorn, yt-dlp, Pillow e OpenCV headless.
- README informa que a seleção de cortes exige um serviço/modelo de IA configurado; o uso de provedores hospedados é pago diretamente pelo usuário. Ollama/LM Studio são alternativas locais, mas exigem configuração e recursos da máquina.
- O README cita uso do Parakeet/sherpa-onnx e informa que a técnica de transcrição foi aproveitada pelo Chopify.

## Conclusão da auditoria

Os dois projetos declaram MIT e têm componentes de dependência em comum, mas possuem arquiteturas e contratos de execução diferentes. PeakCut não é um substituto drop-in para o adaptador atual do Chopify. Sua dependência de modelo de IA pode contrariar a preferência de operação sem custo, dependendo da configuração escolhida.

**Nenhum dos motores está validado operacionalmente neste projeto.** A auditoria foi documental, baseada nos README, LICENSE e requirements.txt públicos. Não instalamos, executamos, comparamos a qualidade dos cortes nem medimos consumo de CPU/RAM/disco nesta etapa.

## Implementado no projeto

- Migration 008 cria `clip_engine_registry`, com função (principal/reserva), licença, estado de validação, ativação e evidências.
- Registros iniciais: Chopify principal e PeakCut reserva; ambos pendentes e desativados.
- A constraint do banco impede ativar motor cujo estado não seja `validated`.
- `clip-engine-registry.js` implementa consulta do catálogo e política de decisão de failover.
- Failover é bloqueado se a tentativa anterior ainda pode estar ativa, se publicação está `uploading/uncertain`, ou se qualquer motor não foi validado e habilitado.
- API: `GET /api/clip-engines` e `POST /api/clip-engines/failover-check`.
- Testes cobrem bloqueios de segurança e decisão elegível. Um resultado elegível apenas autoriza futura seleção; não executa troca.

## Critérios para validação operacional futura

1. Instalação limpa e reprodutível no ambiente-alvo.
2. Verificação de versões e disponibilidade de Python/FFmpeg/codecs.
3. Processamento de um conjunto fixo de vídeos de teste com permissão de uso.
4. Confirmação de MP4 válido, proporção 9:16, áudio sincronizado e legendas legíveis.
5. Inspeção humana de qualidade e correspondência com o vídeo de origem.
6. Medição de duração, CPU, RAM e espaço temporário.
7. Repetição de falha controlada e comprovação de que a tentativa antiga terminou antes de qualquer reserva.
8. Evidências versionadas e revisão humana antes de mudar o estado para validado.

## Limites

- PeakCut permanece desativado; nenhum fallback real foi executado.
- Chopify também continua pendente de instalação e teste real.
- O worker ainda não chama o registro para executar failover; endpoint apenas calcula a decisão segura.
- Testes adicionados, mas não executados nesta sessão.
- O checkpoint de Docker/local continua pendente.
