import { useState } from 'react';
import { downloadDocument } from '../services/documents.api.js';

function safeFilename(filename) {
  return filename
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f]/g, '')
    .trim() || 'document';
}

export default function DownloadButton({ documentId, filename, userId, onError }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);

    try {
      const blob = await downloadDocument(documentId, userId);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = safeFilename(filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      onError(error.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      className="download-button"
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      aria-label={`${isDownloading ? 'Baixando' : 'Baixar'} ${filename}`}
    >
      {isDownloading ? 'Baixando...' : 'Baixar'}
      <span aria-hidden="true">↓</span>
    </button>
  );
}