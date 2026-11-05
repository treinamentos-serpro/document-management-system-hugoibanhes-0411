const API_PREFIX = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || '/api';

function createUserHeaders(userId) {
  const owner = userId?.trim();

  if (!owner) {
    throw new Error('Informe um ID de usuário.');
  }

  return { 'X-User-Id': owner };
}

async function readJsonPayload(response) {
  return response.json().catch(() => null);
}

function getErrorMessage(payload, fallback) {
  return payload?.error?.message || fallback;
}

async function readJsonResponse(response) {
  const payload = await readJsonPayload(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, 'Não foi possível concluir a solicitação.'));
  }

  return payload;
}

async function throwResponseError(response) {
  const payload = await readJsonPayload(response);
  throw new Error(getErrorMessage(payload, 'Não foi possível baixar o documento.'));
}

export async function uploadDocument(file, userId) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    headers: createUserHeaders(userId),
    body: formData,
  });

  return readJsonResponse(response);
}

export async function listDocuments(userId, { signal } = {}) {
  const response = await fetch(`${API_PREFIX}/documents`, {
    headers: createUserHeaders(userId),
    signal,
  });

  return readJsonResponse(response);
}

export async function downloadDocument(documentId, userId) {
  const response = await fetch(`${API_PREFIX}/documents/${encodeURIComponent(documentId)}/download`, {
    headers: createUserHeaders(userId),
  });

  if (!response.ok) {
    await throwResponseError(response);
  }

  return response.blob();
}