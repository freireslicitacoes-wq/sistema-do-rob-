# Etapa 21 — Preparação da instalação e pré-verificação do Chopify

## O que foi criado

- `apps/clipper/preflight_chopify.py`: verificação local somente de leitura.
- Verifica Python, pasta do Chopify, `chopify.py`, `requirements.txt`, FFmpeg, FFprobe, imports Python (`cv2`, `numpy`, `sherpa_onnx`, `faster_whisper`) e espaço disponível nas pastas de mídia/saída.
- Retorna JSON com cada verificação, estado geral e caminhos/erros.
- Não instala pacotes, não baixa modelos, não processa arquivos e não publica.
- Testes unitários foram escritos para instalação ausente e descoberta dos arquivos principais.

## Como executar no computador local

1. Instale Python 3.11+ e FFmpeg conforme documentação oficial do Chopify.
2. Clone o repositório Chopify em uma pasta permanente.
3. Crie o ambiente virtual e instale as dependências usando o `requirements.txt` do próprio Chopify.
4. Configure os caminhos no terminal (PowerShell exemplo):

```powershell
$env:CHOPIFY_DIR="C:\chopify"
$env:CHOPIFY_PYTHON="C:\chopify\.venv\Scripts\python.exe"
$env:MEDIA_ROOT="C:\tiktok-auto-publisher\var\media"
$env:CLIPS_STORAGE_DIR="C:\tiktok-auto-publisher\var\clips"
python apps/clipper/preflight_chopify.py
```

O resultado deve indicar `ready_for_manual_video_test` para avançarmos. Isso ainda não é uma aprovação de qualidade nem validação do motor.

## Segurança e critérios

- Não enviar chaves, senhas ou tokens ao chat.
- Não executar instalação remota por script sem revisar o conteúdo.
- Manter vídeos originais intactos.
- Testar somente vídeo próprio ou autorizado.
- Antes de validar Chopify: processar um vídeo de teste, abrir todos os MP4 resultantes, conferir 9:16, áudio, sincronização, legendas, duração e integridade; registrar tempo e espaço usados.
- Não habilitar PeakCut como reserva nesta etapa.

## O que não foi feito

- Chopify não foi instalado nem executado nesta sessão.
- Nenhum vídeo real foi processado; não há amostra de saída para aprovar.
- O worker ainda não invoca o adaptador Python e não existe execução integrada pela API.
- Não houve validação de codecs/qualidade em ambiente real nem execução dos testes.
- O checkpoint local de Docker e teste de importação continua pendente.

A etapa prepara uma verificação segura e reproduzível. A validação real depende da execução no computador local.
