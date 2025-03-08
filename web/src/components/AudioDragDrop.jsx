// FILE: AudioDragDrop.jsx
'use client';
import { useState, useRef, useEffect } from 'react';

export default function AudioDragDrop() {
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  // Converte o áudio para base64 e envia para a rota /api/processAudio
  function uploadFileToApi(file) {
    setLoading(true);
    const reader = new FileReader();

    reader.onload = async () => {
      const base64Data = reader.result;
      try {
        const res = await fetch('/api/processAudio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Data })
        });
        await res.json();
        console.log(`Arquivo ${file.name} enviado e processado com sucesso.`);
      } catch (error) {
        console.error("Erro ao enviar o arquivo para a API.", error);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = (error) => {
      console.error('Erro ao converter o arquivo.', error);
      setLoading(false);
    };

    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!dropZoneRef.current || !fileInputRef.current) return;

    const dropZone = dropZoneRef.current;
    const fileInput = fileInputRef.current;

    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const highlight = () => setIsDragging(true);
    const unhighlight = () => setIsDragging(false);

    const handleDrop = (e) => {
      preventDefaults(e);
      unhighlight();
      const { files } = e.dataTransfer;
      processFiles(files);
    };

    const processFiles = (files) => {
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
          setFileName(file.name);
          uploadFileToApi(file);
        } else {
          console.error('Arquivo inválido.');
        }
      }
    };

    const handleFileInputChange = () => {
      processFiles(fileInput.files);
    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, unhighlight, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileInputChange, false);

    return () => {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.removeEventListener(eventName, preventDefaults, false);
        document.body.removeEventListener(eventName, preventDefaults, false);
      });
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.removeEventListener(eventName, highlight, false);
      });
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.removeEventListener(eventName, unhighlight, false);
      });
      dropZone.removeEventListener('drop', handleDrop, false);
      fileInput.removeEventListener('change', handleFileInputChange, false);
    };
  }, []);

  const dropZoneStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #ccc',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: isDragging ? 'rgba(0, 132, 255, 0.1)' : 'transparent',
    width: '100%',
    height: '100%'
  };

  return (
    <div style={dropZoneStyle} ref={dropZoneRef}>
      <div style={{ marginBottom: '20px' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16 11H13V8C13 7.45 12.55 7 12 7C11.45 7 11 7.45 11 8V11H8C7.45 11 7 11.45 7 12C7 12.55 7.45 13 8 13H11V16C11 16.55 11.45 17 12 17C12.55 17 13 16.55 13 16V13H16C16.55 13 17 12.55 17 12C17 11.45 16.55 11 16 11Z" fill="currentColor"/>
        </svg>
      </div>
      <h3 style={{ marginBottom: '10px', fontSize: '1.2rem' }}>
        Arraste e solte seu arquivo de áudio aqui
      </h3>
      <p style={{ marginBottom: '15px', color: '#666' }}>ou</p>
      <label 
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#0078ff',
          color: 'white',
          borderRadius: '50px',
          cursor: 'pointer'
        }}
        htmlFor="audio-input"
      >
        Escolher arquivo
      </label>
      <input 
        type="file" 
        id="audio-input" 
        style={{ display: 'none' }}
        accept="audio/*"
        ref={fileInputRef}
      />
      {fileName && <p style={{ marginTop: '15px' }}>Arquivo selecionado: {fileName}</p>}
      {loading && <p>Enviando arquivo...</p>}
    </div>
  );
}