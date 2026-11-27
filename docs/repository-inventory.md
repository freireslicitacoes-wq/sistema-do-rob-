# Inventário técnico de componentes candidatos

**Data da verificação:** 2026-11-26  
**Status:** avaliação documental; nenhum componente foi instalado, executado ou integrado ao produto.

## Decisão atual

- **Chopify:** candidato principal para o primeiro teste de processamento de vídeos gravados.
- **PeakCut:** candidato secundário, especialmente para investigar fluxos de lives e comparação de resultados.
- **SupoClip:** não será incorporado neste momento. A licença não comercial exige autorização escrita para usos empresariais/comerciais; não temos essa autorização.
- A escolha final depende de testes reproduzíveis com os mesmos vídeos, em português, e de revisão de segurança/dependências.

## Matriz de avaliação

| Componente | Licença declarada | Capacidades documentadas | Dependências e custos | Papel proposto |
|---|---|---|---|---|
| [Chopify](https://github.com/mehbul/chopify) | MIT | Processamento local; detecção de cortes por sinais de áudio/visuais e transcrição; exportação 9:16; legendas editáveis; presets; fila/batch retomável; CLI e Studio local. | Python 3.11+ e FFmpeg. Usa Parakeet/sherpa-onnx local por padrão e fallback faster-whisper. Ollama é opcional para busca semântica/seleção por LLM. Modelos precisam ser baixados; processamento consome CPU/GPU e disco locais. | Primeiro motor a testar para vídeos gravados. |
| [PeakCut](https://github.com/haziqahmedqasmi/PeakCut) | MIT (fontes de fontes tipográficas têm licenças próprias) | Vídeos longos e lives; cortes verticais 9:16; legendas palavra a palavra; hook; workspaces; fila e publicação em contas sociais descritas pelo projeto; gravação e clipping de live. | Python 3.10+ e FFmpeg; baixa modelo de fala local (~480 MB). Requer modelo de chat que retorne JSON; Ollama local é opção sem chave paga. A documentação atual consultada diz que sem IA configurada nenhum corte é feito. Pode haver custos se escolhido provedor hospedado. | Alternativa para comparação e possível módulo especializado em lives. |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Unlicense (verificar licença e avisos da versão fixada antes de redistribuir) | Ferramenta de linha de comando para obter mídia de sites suportados. | Python e dependências opcionais conforme site/formato; alguns fluxos podem exigir componentes adicionais. Suporte a sites muda com frequência. | Adaptador de aquisição de mídia, somente para conteúdo próprio ou autorizado e respeitando termos dos serviços. |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg) | LGPL/GPL conforme build e componentes habilitados | Demux, corte, conversão, escala, composição, áudio e renderização. | Binário/build e codecs variam; verificar configuração/licenças do build distribuído. | Base de renderização e validação de mídia. |
| [Ollama](https://github.com/ollama/ollama) | MIT (software do projeto; modelos têm licenças próprias) | Execução local de modelos de linguagem e embeddings. | Requer memória/CPU/GPU; download e licença do modelo escolhido devem ser avaliados separadamente. | Provedor local opcional para evitar APIs pagas. |
| [Whisper](https://github.com/openai/whisper) | MIT | Reconhecimento/transcrição de fala. | Execução local, dependências de Python/PyTorch e FFmpeg; consumo de recursos e download de pesos. Chopify/PeakCut já oferecem seus próprios caminhos de transcrição, então evitar duplicar motores sem necessidade. | Alternativa de transcrição a comparar, não dependência inicial obrigatória. |

## Achados importantes

### Chopify
- A documentação do projeto informa que a seleção padrão de cortes não precisa de LLM: usa evidências de transcrição, áudio e imagem.
- O mecanismo padrão de fala usa Parakeet via sherpa-onnx; faster-whisper é fallback/opção.
- Ollama é opcional, não requisito para o fluxo padrão de cortes.
- Tem CLI, Studio local, projetos retomáveis e testes automatizados documentados.
- O próprio projeto alerta que pontuação de cortes é sugestão editorial, não previsão de viralização.
- O Studio é descrito como local/loopback e para um usuário confiável; não expor diretamente como serviço público.

### PeakCut
- O README atual consultado declara que é necessário configurar um modelo de chat funcional; sem IA, nenhum corte é produzido.
- Ollama é listado como provedor local sem chave, mas ainda depende do hardware e de um modelo local.
- Inclui funções de live clipping e posting social. Não adotaremos o posting interno como caminho de publicação do nosso produto: a publicação continuará centralizada em integração oficial, sujeita a OAuth, auditoria, limites e consentimento.
- A documentação de instalação menciona Python, FFmpeg e download inicial de modelo de fala.
- A versão/README deve ser fixada por commit antes de qualquer teste ou integração.

### Licenças e procedência
- MIT não elimina a obrigação de preservar avisos de copyright/licença e revisar licenças de fontes, modelos, binários e dependências transitivas.
- Não assumir que os pesos dos modelos têm a mesma licença do código.
- Não redistribuir binários FFmpeg sem verificar a configuração e os termos aplicáveis.
- A licença do SupoClip não foi aprovada para este projeto sem autorização comercial escrita; por isso ele fica fora do escopo atual.

## Plano de validação antes de integrar

1. Fixar commits/tags dos repositórios e guardar SBOM/lista de dependências.
2. Fazer revisão de licenças de código, fontes, modelos, binários e dependências transitivas.
3. Instalar em ambiente isolado, sem credenciais de produção e sem ativar serviços pagos.
4. Preparar conjunto de vídeos de teste com direitos de uso, incluindo fala em português brasileiro, ruído, música, múltiplos participantes e live gravada.
5. Executar os mesmos vídeos nos motores e medir: qualidade/relevância dos cortes, precisão de transcrição, sincronização de legendas, reenquadramento, duração, tempo de processamento, RAM/CPU/GPU e taxa de falha.
6. Validar retomada após interrupção, repetição segura, diretórios de saída e integração por CLI/API.
7. Escolher um motor principal; manter o outro como reserva apenas se os testes demonstrarem valor e compatibilidade.
8. Só então abrir uma etapa de integração no backend. Nenhuma publicação real deve ser usada como teste.

## Limites atuais do produto

Este inventário não implementa backend, frontend, sincronização com Drive, banco, agendador, gerente operacional ou integração TikTok. O repositório principal continua sendo de especificações. A publicação exige integração oficial e consentimento explícito por item, conforme as especificações do projeto.
