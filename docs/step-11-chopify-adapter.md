# Etapa 11 — Adaptador local para geração de cortes

## Motor escolhido para a primeira integração

Chopify (MIT): https://github.com/mehbul/chopify

A escolha se baseia no fluxo local sem assinatura/API paga, CLI Python, transcrição, seleção de trechos, renderização FFmpeg, exportação MP4 vertical e legendas/SRT. O CLI documentado aceita caminho local, `--no-input`, `--aspect 9:16`, `--max-clips`, `--min-score`, `--out`, `--projects-dir`, `--workdir` e `--device`. A versão verificada no código-fonte durante esta etapa declara 1.4.0. O repositório upstream continua sendo atualizado; esta integração não fixa nem instala automaticamente uma versão upstream.

## O que foi criado no nosso repositório

- `apps/clipper/run_chopify.py`: adaptador que chama o CLI do Chopify como subprocesso, sem shell.
- `apps/clipper/tests/test_run_chopify.py`: testes do adaptador com subprocesso simulado.
- `apps/clipper/README.md`: instalação manual, configuração e uso.

O adaptador:
- só processa arquivos de vídeo já existentes dentro de `MEDIA_ROOT`;
- cria diretório isolado por execução dentro de `CLIPS_STORAGE_DIR`;
- pede saída vertical 9:16, processamento CPU e modo não interativo;
- limita o número de cortes (1–50) e score (0–10);
- devolve JSON com estado, arquivos gerados e trechos de log;
- não considera sucesso se o motor falhar ou não gerar MP4.

## Instalação local necessária

O Chopify e suas dependências ainda não foram instalados neste projeto. Para usar o adaptador será necessário instalar Python 3.11+, FFmpeg/ffprobe com libx264/AAC/libass e o repositório Chopify em uma pasta local, conforme as instruções upstream. A primeira instalação pode baixar modelos de transcrição e ocupar espaço em disco. O modo básico não exige API paga; aceleração/seleção por LLM local é opcional.

## Limites

- Esta etapa cria o adaptador executável e seus testes, mas não liga ainda a fila PostgreSQL nem o botão do painel.
- Não há renderização executada nesta etapa, pois o ambiente local do usuário ainda não foi iniciado.
- Os scores do motor são sugestões editoriais, não previsão de viralização.
- Revisar cada corte e as legendas antes de aprovar ou publicar.
- Só processar material próprio ou autorizado.
- Não importar links protegidos nem contornar DRM/autenticação.

## Próxima etapa

Criar o registro persistente de tarefas de corte no PostgreSQL, API para iniciar/consultar/cancelar processamento e conexão com a biblioteca/painel. A execução real do motor será validada no checkpoint do computador.
