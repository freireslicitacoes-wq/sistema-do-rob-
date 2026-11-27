# Etapa 4/5 — Entrada de vídeos e armazenamento local

## Formas de entrada

1. **Google Drive:** colar o link compartilhado individual, público para quem possui o link.
2. **Desktop:** selecionar/anexar um arquivo no computador; o backend recebe multipart/form-data.

Ambos registram o vídeo na mesma tabela `media_assets`.

## Implementado no backend

- Parser de links HTTPS do Google Drive com allowlist de domínio.
- Rota `POST /api/media-assets/upload`, campo multipart `video`, com transmissão em fluxo para disco.
- Rota `POST /api/media-assets/import-google-drive`, que baixa um arquivo individual por ID reconhecido no link.
- Armazenamento local configurável por `MEDIA_STORAGE_DIR`, padrão `./var/media`.
- Limite por arquivo configurável em `MAX_UPLOAD_BYTES`, padrão 500 MiB.
- Extensões aceitas: MP4, MOV, M4V, WebM, MKV e AVI.
- Conferência básica da assinatura do contêiner, cálculo SHA-256 e nome interno aleatório.
- Registro no PostgreSQL com origem, nome original, tamanho, tipo, hash e número inicial para ordenação natural.
- Se a gravação no banco falhar após salvar o arquivo, o arquivo é removido.

## Como chamar

Upload desktop:
```bash
curl -F "video=@./meu-video.mp4" http://localhost:3000/api/media-assets/upload
```

Link público Drive:
```bash
curl -X POST http://localhost:3000/api/media-assets/import-google-drive \
  -H "content-type: application/json" \
  -d '{"url":"https://drive.google.com/file/d/ID/view","filename":"video.mp4"}'
```

## Limitações e segurança

- O download Drive pode falhar se o Google retornar uma página de confirmação, quota, bloqueio ou erro. O sistema informa a falha; não contorna permissões, CAPTCHA ou controles do Drive.
- Importação de pastas completas e arquivos privados não implementada.
- Armazenamento é local ao servidor, não nuvem. Em hospedagem com disco efêmero, arquivos podem sumir; precisa volume persistente ou storage durável antes de produção.
- A API ainda não tem autenticação. Não exponha upload/download publicamente até implementar autenticação, autorização, rate limit e HTTPS.
- Validação de assinatura é básica e não substitui antivírus ou análise completa de mídia.
- Não existe interface visual ainda.
- Não executamos npm install, testes, migration nem download real nesta sessão. Os testes foram escritos, não declarados como aprovados.

## Próxima etapa

Criar a interface web simples para colar link do Drive ou anexar vídeo, visualizar o resultado da importação e listar a biblioteca. Antes de publicar a API em ambiente acessível pela internet, implementar autenticação e armazenamento persistente.
