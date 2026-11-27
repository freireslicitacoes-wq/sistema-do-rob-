# Etapa 4 — Formas de entrada da biblioteca

O sistema terá dois caminhos simples para receber vídeos:

## 1. Link compartilhado do Google Drive

- O usuário cola o link individual do arquivo.
- Nesta primeira modalidade, o arquivo deve estar compartilhado como qualquer pessoa com o link pode visualizar ou baixar.
- A API identifica o ID do arquivo em formatos comuns de link do Drive.
- Validar o link não significa que o arquivo já foi baixado. A etapa seguinte implementará o download controlado, conferência de tamanho/tipo e armazenamento.
- Pastas inteiras e links privados ainda não são processados por esta primeira modalidade.
- Um link público pode ser acessado por qualquer pessoa que o possua; não usar para conteúdo confidencial.

## 2. Arquivo anexado pelo computador

- No desktop, o usuário seleciona ou arrasta o arquivo para a área de envio.
- O navegador transmite o arquivo ao backend por upload HTTPS.
- O backend deverá validar tamanho, extensão, MIME real e integridade antes de aceitar o arquivo.
- O arquivo original deve ser preservado no modo biblioteca em massa.
- A interface de upload e o armazenamento efetivo serão implementados na próxima parte da ingestão; ainda não estão ativos.

## Regras comuns

- Os dois caminhos alimentam a mesma biblioteca de vídeos.
- O sistema registra a origem de cada arquivo.
- Não modificar, recortar ou reencodar o original no modo biblioteca em massa.
- Não aceitar URLs arbitrárias para download. Isso evita que um link seja usado para acessar serviços internos ou endereços privados.
- Não presumir que um link público garante download: permissões, limites, arquivos grandes e páginas intermediárias do Drive podem exigir tratamento adicional.

## O que esta etapa entrega

Foi criado um parser para reconhecer links HTTPS de arquivos do Google Drive nos formatos /file/d/ID/view e /open?id=ID, rejeitando domínios não autorizados e links malformados. Testes também foram escritos, mas ainda não executados.

## Ainda não implementado

- Download do arquivo a partir do Drive.
- Upload binário do desktop.
- Armazenamento local ou em nuvem.
- Importação de pastas completas.
- Interface visual para colar links ou anexar arquivos.
- Verificação real de disponibilidade/permissão do arquivo.
