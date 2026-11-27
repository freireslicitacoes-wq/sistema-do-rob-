# API — configuração e ingestão local de mídia

## Dependências e inicialização

Requer Node.js 20 ou superior e PostgreSQL com a migration inicial aplicada.

```bash
cd apps/api
npm install
cp .env.example .env
# configure DATABASE_URL e, se desejar, MEDIA_STORAGE_DIR/MAX_UPLOAD_BYTES
npm test
npm start
```

Variáveis:
- `DATABASE_URL`: conexão PostgreSQL.
- `MEDIA_STORAGE_DIR`: diretório persistente de arquivos; padrão `./var/media`.
- `MAX_UPLOAD_BYTES`: limite por vídeo em bytes; padrão 500 MiB.
- `PORT`: porta HTTP; padrão 3000.

## Rotas

- `GET /`: painel web da biblioteca.
- `GET /health`: saúde da API e do banco.
- `GET /api/library/status`: totais e lista com estados visuais da biblioteca.
- `GET /api/media-assets?limit=50`: lista biblioteca (máximo 100).
- `POST /api/media-assets`: cadastro de metadados de um arquivo já armazenado.
- `POST /api/media-assets/upload`: upload multipart/form-data, campo `video`.
- `POST /api/media-assets/import-google-drive`: JSON `{"url":"https://drive.google.com/file/d/ID/view","filename":"video.mp4"}`; filename é opcional e sua extensão deve corresponder ao vídeo.
- `GET /api/campaigns` e `POST /api/campaigns`: campanhas.

Exemplo de upload com curl:

```bash
curl -F "video=@./meu-video.mp4" http://localhost:3000/api/media-assets/upload
```

Exemplo de importação Drive:

```bash
curl -X POST http://localhost:3000/api/media-assets/import-google-drive \
  -H "content-type: application/json" \
  -d '{"url":"https://drive.google.com/file/d/ID/view","filename":"video.mp4"}'
```

## Proteções e comportamento

- Upload é transmitido em fluxo para disco, sem carregar o arquivo inteiro na memória.
- O limite é aplicado durante o upload/download; extensões aceitas: MP4, MOV, M4V, WebM, MKV e AVI.
- O servidor verifica assinatura básica do contêiner, calcula SHA-256 e usa nome aleatório no armazenamento. O nome original fica no banco.
- O arquivo original não é recortado, reencodado nem alterado.
- O importador Drive aceita somente links HTTPS do domínio Drive reconhecido. Redirecionamentos são validados e URLs externas arbitrárias não são aceitas.
- Se o Drive entregar página HTML de confirmação, bloqueio ou erro em vez do vídeo, a importação falha com mensagem; não tenta contornar CAPTCHA, permissões ou controles do Google.
- Arquivos ficam no disco do host onde a API roda. Isso não é armazenamento cloud durável; em contêiner efêmero, os dados podem desaparecer. Configure volume persistente antes de uso real.
- Em erro ao registrar metadados, o arquivo recém-salvo é removido.
- Não há autenticação HTTP ainda. **Não exponha essas rotas à internet nem use dados privados antes de adicionar autenticação, autorização e limites operacionais.** Use HTTPS no ambiente de rede.
- Não há interface visual, importação de pastas, processamento de vídeo ou publicação TikTok nesta entrega.

## Verificação

Os testes automatizados foram adicionados, mas precisam ser executados em ambiente Node.js com as dependências instaladas. A conexão PostgreSQL, migration e download real do Google Drive ainda não foram verificados neste ambiente.


## Clip worker

O núcleo do worker está em `src/clip-worker.js`. Ele reivindica tarefas com lock atômico e lease, registra tentativa e só conclui com o token de posse. Motores não validados não são executados; o trabalho vai para `needs_attention`. A integração real e o fallback ainda estão pendentes.
