const { test } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const crypto = require('node:crypto');
const app = require('../src/app');
const documentsRepository = require('../src/repositories/documents.repository');
const fileStorageRepository = require('../src/repositories/file-storage.repository');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('documentos ficam acessíveis apenas ao usuário que os enviou', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const owner = `test-${crypto.randomUUID()}`;
  const url = `http://127.0.0.1:${server.address().port}`;
  let uploadedDocument;
  t.after(async () => {
    if (uploadedDocument) {
      const storedDocument = documentsRepository.findById(uploadedDocument.id);
      await fileStorageRepository.removeFile(storedDocument.storageName);
    }
  });

  const form = new FormData();
  form.append('file', new Blob(['document contents']), 'document.txt');
  const uploadResponse = await fetch(`${url}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: form,
  });

  assert.strictEqual(uploadResponse.status, 201);
  uploadedDocument = await uploadResponse.json();
  assert.deepStrictEqual(Object.keys(uploadedDocument).sort(), [
    'id',
    'originalName',
    'owner',
    'size',
    'uploadedAt',
  ]);

  const ownerListResponse = await fetch(`${url}/documents`, {
    headers: { 'X-User-Id': owner },
  });
  assert.deepStrictEqual(await ownerListResponse.json(), [uploadedDocument]);

  const otherOwnerListResponse = await fetch(`${url}/documents`, {
    headers: { 'X-User-Id': `${owner}-other` },
  });
  assert.deepStrictEqual(await otherOwnerListResponse.json(), []);

  const unauthorizedDownloadResponse = await fetch(
    `${url}/documents/${uploadedDocument.id}/download`,
    { headers: { 'X-User-Id': `${owner}-other` } },
  );
  assert.strictEqual(unauthorizedDownloadResponse.status, 404);

  const downloadResponse = await fetch(`${url}/documents/${uploadedDocument.id}/download`, {
    headers: { 'X-User-Id': owner },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'document contents');
});
