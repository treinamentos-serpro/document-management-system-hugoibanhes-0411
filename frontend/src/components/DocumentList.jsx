import DownloadButton from './DownloadButton.jsx';

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function DocumentList({ documents, isLoading, userId, onDownloadError }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title" aria-busy={isLoading}>
      <div className="list-heading">
        <div className="panel-heading">
          <span className="section-index">02</span>
          <h2 id="documents-title">Biblioteca</h2>
        </div>
        <span className="document-count">
          {documents.length.toString().padStart(2, '0')} <span>ITENS</span>
        </span>
      </div>

      {isLoading ? (
        <p className="list-status" role="status">Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <div className="empty-state" role="status">
          <span className="empty-mark" aria-hidden="true">—</span>
          <p>Nenhum documento</p>
        </div>
      ) : (
        <div className="document-list">
          {documents.map((document) => (
            <article className="document-row" key={document.id}>
              <span className="document-mark" aria-hidden="true">DOC</span>
              <div className="document-info">
                <h3 title={document.originalName}>{document.originalName}</h3>
                <p>{formatDate(document.uploadedAt)} <span aria-hidden="true">·</span> {formatSize(document.size)}</p>
              </div>
              <DownloadButton
                documentId={document.id}
                filename={document.originalName}
                userId={userId}
                onError={onDownloadError}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}