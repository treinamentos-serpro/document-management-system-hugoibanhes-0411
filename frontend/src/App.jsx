import { useEffect, useRef, useState } from 'react';
import { listDocuments, uploadDocument } from './services/documents.api.js';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import './App.css';

const DEFAULT_USER_ID = 'demo-user';

function getInitialUserId() {
  try {
    return localStorage.getItem('dms.userId') || DEFAULT_USER_ID;
  } catch {
    return DEFAULT_USER_ID;
  }
}

export default function App() {
  const [userId, setUserId] = useState(getInitialUserId);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const listRequestSequence = useRef(0);

  useEffect(() => {
    const owner = userId.trim();
    const controller = new AbortController();
    const requestSequence = ++listRequestSequence.current;

    try {
      localStorage.setItem('dms.userId', owner);
    } catch {
      // O armazenamento local pode estar indisponível no modo privado.
    }

    if (!owner) {
      setDocuments([]);
      setIsLoading(false);
      setError('Informe um ID de usuário para carregar os documentos.');
      return () => controller.abort();
    }

    setIsLoading(true);
    setError('');
    setDocuments([]);

    listDocuments(owner, { signal: controller.signal })
      .then((loadedDocuments) => {
        if (requestSequence === listRequestSequence.current) {
          setDocuments(loadedDocuments);
        }
      })
      .catch((requestError) => {
        if (!controller.signal.aborted && requestSequence === listRequestSequence.current) {
          setDocuments([]);
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestSequence === listRequestSequence.current) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [userId]);

  async function handleUpload(file) {
    const owner = userId.trim();

    if (!owner) {
      setError('Informe um ID de usuário antes de enviar um documento.');
      return false;
    }

    setIsUploading(true);
    setError('');
    setNotice('');

    try {
      const uploadedDocument = await uploadDocument(file, owner);
      listRequestSequence.current += 1;
      setIsLoading(false);
      setDocuments((currentDocuments) => [
        uploadedDocument,
        ...currentDocuments.filter((document) => document.id !== uploadedDocument.id),
      ]);
      setNotice('Documento enviado.');
      return true;
    } catch (uploadError) {
      setError(uploadError.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  function handleDownloadError(message) {
    setNotice('');
    setError(message);
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, página inicial">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">DMS</span>
          <span className="brand-divider" aria-hidden="true">/</span>
          <span className="brand-section">Arquivo</span>
        </a>

        <div className="identity-control">
          <label htmlFor="user-id">ID de usuário</label>
          <input
            id="user-id"
            name="userId"
            autoComplete="off"
            value={userId}
            disabled={isUploading}
            onChange={(event) => {
              listRequestSequence.current += 1;
              setUserId(event.target.value);
              setDocuments([]);
              setIsLoading(true);
              setError('');
              setNotice('');
            }}
          />
        </div>
      </header>

      <main className="page-shell">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">BIBLIOTECA PESSOAL</p>
            <h1 id="page-title">Documentos</h1>
          </div>
          <p className="heading-mark" aria-hidden="true">01 <span>/</span> 02</p>
        </section>

        {error && (
          <div className="message message-error" role="alert">
            <span className="message-symbol" aria-hidden="true">!</span>
            <p>{error}</p>
            <button type="button" className="message-dismiss" onClick={() => setError('')} aria-label="Fechar aviso">
              Fechar
            </button>
          </div>
        )}

        {notice && (
          <div className="message message-success" role="status">
            <span className="message-symbol" aria-hidden="true">✓</span>
            <p>{notice}</p>
            <button type="button" className="message-dismiss" onClick={() => setNotice('')} aria-label="Fechar aviso">
              Fechar
            </button>
          </div>
        )}

        <div className="workspace-grid">
          <UploadComponent onUpload={handleUpload} isUploading={isUploading} />
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            userId={userId.trim()}
            onDownloadError={handleDownloadError}
          />
        </div>

        <footer className="page-footer">
          <span>ARQUIVO LOCAL</span>
          <span className="footer-rule" aria-hidden="true" />
          <span>METADADOS EM MEMÓRIA</span>
        </footer>
      </main>
    </div>
  );
}