---
description: Revisa se um endpoint ou recurso da API segue a especificação e tem cobertura de testes adequada.
name: validar-contrato-api
argument-hint: endpoint, recurso ou todos (ex. POST /upload, documents)
agent: agent
---

# Validar contrato da API

Revise o contrato de `${input:alvo:endpoint, recurso ou todos}` no Document Management System. Este prompt é uma verificação somente de leitura: não altere arquivos nem aplique correções.

## Fontes de verdade

1. Leia `docs/specs/dms-spec.md` para obter os requisitos funcionais, os contratos de API e as decisões arquiteturais.
2. Leia `.github/copilot-instructions.md` para confirmar as convenções e restrições do projeto.
3. Inspecione as rotas, controllers, services e repositories relevantes em `backend/src`, além dos testes correspondentes em `backend/test`.

Se uma fonte estiver ausente ou contradizer outra, registre a divergência em vez de assumir qual está correta. Não invente requisitos que não estejam documentados.

## Verificações

- Método HTTP, caminho, campos de entrada, cabeçalhos e formato das respostas correspondem à especificação.
- Códigos HTTP e formato de erros estão consistentes para sucesso, validação, recurso inexistente, limite excedido e falha interna.
- A arquitetura mantém o fluxo `routes -> controllers -> services -> repositories`, sem colocar regras de negócio nas rotas/controllers ou dependências HTTP nas camadas internas.
- Uploads usam `multer` com `diskStorage` e gravam exclusivamente em `backend/storage`; metadados permanecem em memória.
- Nomes fornecidos pelo cliente não controlam caminhos locais; campos internos de armazenamento não são expostos na API.
- A associação por usuário e o cabeçalho `X-User-Id` seguem o contrato especificado, sem tratar esse cabeçalho como autenticação.
- Testes em `backend/test` cobrem os principais caminhos de sucesso e erro do alvo, incluindo os limites relevantes definidos na especificação.

## Saída

Apresente primeiro os problemas encontrados, ordenados por gravidade. Para cada problema, informe:

- Gravidade: alta, média ou baixa.
- Comportamento observado e comportamento esperado.
- Referências aos arquivos e linhas relevantes, quando disponíveis.
- Requisito ou trecho do contrato relacionado.

Depois liste lacunas de cobertura de testes, dúvidas sobre requisitos ambíguos e uma conclusão: contrato conforme, conforme com ressalvas ou não conforme. Se não houver problemas, declare isso claramente e mencione as verificações que não puderam ser realizadas. Não reporte uma ausência de teste como defeito funcional confirmado.