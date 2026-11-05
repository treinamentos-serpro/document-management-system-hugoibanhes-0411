const { once } = require('node:events');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const assert = require('node:assert');
const originalFileSizeLimit = process.env.MAX_FILE_SIZE_BYTES;
process.env.MAX_FILE_SIZE_BYTES = '8';
const app = require('../src/app');
const documentsRepository = require('../src/repositories/documents.repository');

if (originalFileSizeLimit === undefined) {
  delete process.env.MAX_FILE_SIZE_BYTES;
} else {
  process.env.MAX_FILE_SIZE_BYTES = originalFileSizeLimit;
}

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download respeitam limites e proprietário', async (context) => {
  const owner = randomUUID();
  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  context.after(async () => {
    const documents = documentsRepository.findByOwner(owner);
    await Promise.all(documents.map((document) => documentsRepository.removeFile(document.storageName)));
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const uploadForm = new FormData();
  uploadForm.append('file', new Blob(['test']), '../../report.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: uploadForm,
  });

  assert.strictEqual(uploadResponse.status, 201);
  const document = await uploadResponse.json();
  assert.strictEqual(document.size, 4);
  assert.ok(!Object.hasOwn(document, 'storageName'));

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': owner },
  });
  assert.deepStrictEqual(await listResponse.json(), [document]);

  const otherOwnerDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': randomUUID() },
  });
  assert.strictEqual(otherOwnerDownload.status, 404);

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': owner },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.ok(!downloadResponse.headers.get('content-disposition').includes('../'));
  assert.strictEqual(await downloadResponse.text(), 'test');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['123456789']), 'large.txt');
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: oversizedForm,
  });
  assert.strictEqual(oversizedResponse.status, 413);

  const invalidForm = new FormData();
  invalidForm.append('file', new Blob(['ok']), 'valid.txt');
  invalidForm.append('extra', 'not allowed');
  const invalidResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: invalidForm,
  });
  assert.strictEqual(invalidResponse.status, 400);
});
