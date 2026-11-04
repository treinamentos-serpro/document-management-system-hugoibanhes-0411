# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web simples para que usuários enviem, consultem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador.
- Associação de cada documento a um identificador de usuário.
- Interface web para envio, listagem e download.
- Persistência local dos arquivos em `backend/storage` e persistência em memória dos metadados durante a execução do processo.
- Endpoint de saúde do backend.

### Fora do escopo

- Armazenamento em nuvem, bancos de dados ou provedores externos.
- Persistência durável dos metadados ou recuperação automática de metadados após reinício.
- Autenticação, cadastro de usuários, recuperação de senha ou administração de contas.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Upload múltiplo, pastas, pré-visualização e conversão de arquivos.
- Garantia de isolamento seguro entre usuários sem uma camada de autenticação.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O sistema deve aceitar o envio de um único arquivo por requisição. | Um arquivo válido enviado como `multipart/form-data` é salvo localmente e retorna seus metadados com HTTP `201`. |
| RF-02 | O sistema deve gerar um identificador único para cada documento e um nome interno seguro para o arquivo. | Colisões de identificador/nome interno não sobrescrevem documentos existentes; o nome fornecido pelo cliente nunca é usado como caminho de armazenamento. |
| RF-03 | O sistema deve registrar `id`, `originalName`, `size`, `uploadedAt` e `owner` em memória. | O documento aparece na listagem da mesma execução com os metadados registrados no upload. |
| RF-04 | O sistema deve listar os documentos do usuário identificado na requisição. | A resposta contém uma lista JSON; uma lista sem documentos retorna HTTP `200` com `[]`. |
| RF-05 | O sistema deve permitir baixar um documento pelo identificador. | Um documento existente é retornado como anexo; um identificador inexistente retorna HTTP `404`. |
| RF-06 | O sistema deve apresentar as ações de upload, listagem e download na interface web. | O usuário consegue enviar um arquivo, visualizar o resultado/lista e iniciar o download de um item disponível. |
| RF-07 | O sistema deve informar falhas de validação e de operação em formato consistente. | A resposta de erro inclui código e mensagem legíveis, sem revelar caminhos locais ou detalhes internos. |
| RF-08 | O backend deve expor uma verificação de saúde. | `GET /health` retorna HTTP `200` e `{"status":"ok"}` quando a aplicação está disponível. |

### Identificação do usuário no MVP

Como autenticação está fora do escopo, o MVP identifica o usuário pelo cabeçalho `X-User-Id`. O valor é obrigatório nas operações sobre documentos, deve ser uma string não vazia após remoção de espaços e é armazenado como `owner`. Essa identificação serve apenas para associação funcional: como o cliente pode fornecer o cabeçalho, ela não autentica o usuário nem constitui controle de acesso seguro. Uma futura autenticação deverá substituir essa origem por uma identidade confiável no servidor.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados no filesystem local da aplicação em `backend/storage`, usando `multer` com `diskStorage`. Não usar armazenamento remoto. |
| RNF-02 | Os metadados devem permanecer em memória e podem ser perdidos ao reiniciar o processo. |
| RNF-03 | A configuração operacional deve ser feita por variáveis de ambiente. `PORT` define a porta (padrão `3000`) e `MAX_FILE_SIZE_BYTES` define o limite por arquivo (padrão `10485760`, 10 MiB). |
| RNF-04 | A aplicação deve usar Node.js e Express no backend, React e Vite no frontend, JavaScript sem TypeScript e CommonJS no backend/ESM no frontend. |
| RNF-05 | Os testes do backend devem usar o runner nativo `node:test`. |
| RNF-06 | Símbolos de código devem usar nomes descritivos em inglês; mensagens exibidas ao usuário devem ser em português. |
| RNF-07 | Erros de entrada, escrita e leitura devem ser tratados nos limites do sistema; respostas não devem expor stack traces, caminhos absolutos ou nomes internos de armazenamento. |
| RNF-08 | O nome original deve ser tratado como dado não confiável, preservado apenas como metadado e apresentado/baixado com tratamento que impeça uso como caminho ou injeção de cabeçalho. |
| RNF-09 | Os arquivos devem ser limitados pelo valor de `MAX_FILE_SIZE_BYTES`; arquivos vazios e requisições sem arquivo são inválidos. Não há lista de extensões/MIME permitidos neste MVP. |
| RNF-10 | O frontend deve chamar o backend pelo prefixo `/api`, conforme o proxy do Vite; o backend mantém os caminhos de API definidos nesta especificação sem o prefixo. |

## 5. Modelo de dados

### Documento

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único opaco, gerado pelo servidor. |
| `originalName` | string | Público | Nome original fornecido no upload; apenas metadado, nunca caminho de filesystem. |
| `size` | number | Público | Tamanho em bytes, maior que zero e dentro do limite configurado. |
| `uploadedAt` | string | Público | Instante do recebimento em formato ISO 8601 UTC. |
| `owner` | string | Público | Identificador obtido de `X-User-Id` no MVP. |
| `storageName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo dentro de `backend/storage`; nunca retornado pela API. |

Os documentos são mantidos em uma coleção em memória, indexada por `id`. O arquivo correspondente é mantido no disco local. Ao reiniciar o backend, a coleção é reiniciada; arquivos que permanecerem no diretório não são automaticamente reconstruídos nem listados pela API.

## 6. Contratos de API

As rotas abaixo são relativas à origem do backend. No navegador, o frontend usa o prefixo `/api` configurado no proxy do Vite (por exemplo, `/api/documents` encaminha para `/documents`). Salvo indicação contrária, as respostas são JSON e as operações sobre documentos exigem `X-User-Id`.

### `POST /upload`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Entrada: `multipart/form-data` com exatamente um campo de arquivo chamado `file`.
- Limite: `MAX_FILE_SIZE_BYTES` (padrão de 10 MiB); arquivo vazio não é aceito.
- Processamento: Multer com `diskStorage` grava o arquivo em `backend/storage` sob nome gerado pelo servidor. O serviço registra os metadados no repositório em memória.
- Sucesso: HTTP `201 Created`.

```json
{
  "id": "identificador-opaco",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-11-04T12:00:00.000Z",
  "owner": "usuario-123"
}
```

### `GET /documents`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Saída: HTTP `200 OK` e array dos metadados pertencentes ao `owner` da requisição, sem `storageName`.
- Lista vazia: `[]`.
- Ordenação: mais recentes primeiro; em empate, ordenar pelo identificador para manter resultado determinístico.

### `GET /documents/:id/download`

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Saída: HTTP `200 OK`, conteúdo binário como anexo, nome de download baseado em `originalName` sanitizado e `Content-Type: application/octet-stream`.
- Se o ID não existir na coleção ou pertencer a outro `owner`: HTTP `404 Not Found`, evitando confirmar a existência de documentos de outro usuário.
- Se os metadados existirem mas o arquivo local não puder ser lido: HTTP `500 Internal Server Error`, com mensagem genérica; detalhes ficam apenas no log do servidor.

### `GET /health`

- Não exige cabeçalho de usuário.
- Sucesso: HTTP `200 OK` com `{"status":"ok"}`.

### Erros

Formato comum para respostas de erro:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A requisição não é válida."
  }
}
```

| HTTP | Código | Situação |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Arquivo ausente/vazio, campo diferente de `file`, `X-User-Id` ausente/vazio ou corpo inválido. |
| `404` | `DOCUMENT_NOT_FOUND` | ID inexistente ou documento não pertencente ao usuário identificado. |
| `413` | `FILE_TOO_LARGE` | Arquivo excede `MAX_FILE_SIZE_BYTES`. |
| `500` | `INTERNAL_ERROR` | Falha inesperada ao salvar, registrar ou ler documento. |

Se uma falha ocorrer depois de Multer gravar o arquivo e antes de registrar os metadados, o arquivo recém-criado deve ser removido sempre que possível para evitar órfãos. Uma limpeza abrangente de arquivos órfãos após reinicializações não faz parte deste MVP.

## 7. Decisões arquiteturais

- Backend em Clean Architecture simples, com dependências fluindo de `routes` para `controllers`, `services` e `repositories`.
- `routes` definem endpoints e middleware HTTP, incluindo a configuração de `multer` com `diskStorage`.
- `controllers` validam/extraem dados HTTP e traduzem resultados/erros em respostas; não contêm regras de negócio.
- `services` coordenam upload, associação ao usuário e regras de listagem/download sem depender de Express ou Multer.
- `repositories` mantêm os metadados em memória e fornecem as operações de acesso necessárias. O filesystem permanece estritamente local em `backend/storage`.
- O frontend usa componentes funcionais React; a comunicação ocorre por `fetch` através de `/api` e do proxy Vite.
- O nome físico do arquivo é gerado pelo servidor, separado de `originalName`, para impedir que a entrada do cliente determine caminhos locais.
- O MVP não implementa autenticação. O cabeçalho `X-User-Id` facilita a associação por usuário, mas não oferece segurança contra falsificação de identidade.

## 8. Plano de execução

Este plano descreve etapas futuras de trabalho. Esta entrega contém somente esta especificação; não inclui execução de tarefas nem alterações em arquivos de backend ou frontend.

1. **Validar a especificação e as decisões do MVP.** Confirmar identificação de usuário sem autenticação, limite padrão de upload, códigos de erro e comportamento de metadados após reinício. Aceite: decisões registradas e critérios de aceite aprovados.
2. **Implementar o fluxo de upload no backend.** Preparar middleware Multer local, validação, criação de metadados e tratamento/limpeza em falhas. Aceite: upload válido retorna `201`; entradas inválidas e arquivo acima do limite retornam os erros definidos; arquivo e metadados seguem as restrições locais/em memória.
3. **Implementar listagem e download no backend.** Aplicar associação pelo usuário, resposta ordenada, download como anexo e tratamento de ID/arquivo ausente. Aceite: listagem não revela itens de outro usuário e download respeita os contratos definidos.
4. **Implementar a experiência web.** Permitir informar/usar a identidade do MVP, enviar um arquivo, atualizar a lista e baixar documentos, com estados de carregamento e erros em português. Aceite: os fluxos RF-01 a RF-07 são acessíveis pela interface usando `/api`.
5. **Verificar integração e critérios não funcionais.** Cobrir contratos com testes de backend e validar build/uso da interface, limite, reinício e ausência de exposição de caminhos internos. Aceite: testes e build passam; a documentação e o comportamento observável não contradizem esta especificação.

## 9. Riscos e pressupostos

- A identidade por cabeçalho não é autenticação; o produto não deve ser exposto como serviço multiusuário seguro até que autenticação confiável seja definida e implementada.
- Metadados em memória são voláteis. Reinícios tornam arquivos existentes indisponíveis pela API, embora possam permanecer no disco.
- O limite padrão de 10 MiB é uma decisão inicial configurável e deve ser revisto se o caso de uso exigir arquivos maiores.
- Como não há lista de tipos permitidos, o MVP aceita qualquer tipo de arquivo não vazio dentro do limite. O navegador e os metadados não devem ser tratados como validação de conteúdo.
- Falhas de disco, permissões e espaço insuficiente podem impedir uploads/downloads; devem produzir erro genérico para o cliente e diagnóstico no log do servidor.