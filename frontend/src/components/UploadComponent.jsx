import { useRef, useState } from 'react';

export default function UploadComponent({ onUpload, isUploading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef(null);

  function selectFile(file) {
    setSelectedFile(file || null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile || isUploading) {
      return;
    }

    const uploaded = await onUpload(selectedFile);

    if (uploaded) {
      setSelectedFile(null);
      inputRef.current.value = '';
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    selectFile(event.dataTransfer.files[0]);
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <div className="panel-heading">
        <span className="section-index">01</span>
        <h2 id="upload-title">Novo envio</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className="upload-target"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <span className="upload-glyph" aria-hidden="true">+</span>
          <p className="selected-file" title={selectedFile?.name}>
            {selectedFile?.name || 'Escolha um documento'}
          </p>
          <label className="file-picker" htmlFor="document-file">Selecionar arquivo</label>
          <input
            ref={inputRef}
            id="document-file"
            type="file"
            onChange={(event) => selectFile(event.target.files[0])}
          />
        </div>

        <button className="primary-button upload-submit" type="submit" disabled={!selectedFile || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
          <span aria-hidden="true">↗</span>
        </button>
      </form>

      <p className="upload-footnote">ARMAZENAMENTO LOCAL <span aria-hidden="true">·</span> LIMITE CONFIGURADO PELO SERVIDOR</p>
    </section>
  );
}