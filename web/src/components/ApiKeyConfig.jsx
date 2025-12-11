'use client';
import React, { useState, useEffect } from 'react';
import styles from './ApiKeyConfig.module.css';

const API_KEY_STORAGE_KEY = 'moises_api_key';

export default function ApiKeyConfig({ onApiKeyChange }) {
  const [apiKey, setApiKey] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Carregar API key salva do localStorage
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      if (onApiKeyChange) {
        onApiKeyChange(savedKey);
      }
    }
  }, [onApiKeyChange]);

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setIsSaved(true);
      if (onApiKeyChange) {
        onApiKeyChange(apiKey.trim());
      }
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    if (onApiKeyChange) {
      onApiKeyChange('');
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Configurar Moises API Key"
      >
        🔑 API Key
      </button>

      {isOpen && (
        <div 
          className={styles.modal}
          onClick={(e) => {
            // Fechar ao clicar fora do modal
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3>Configurar Moises API Key</h3>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className={styles.body}>
              <p className={styles.description}>
                Insira sua Moises API Key para processar arquivos de áudio.
                Você pode obter uma chave em{' '}
                <a
                  href="https://moises.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  moises.ai
                </a>
              </p>

              <div className={styles.inputGroup}>
                <label htmlFor="apiKey">API Key:</label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Cole sua API Key aqui"
                  className={styles.input}
                />
              </div>

              <div className={styles.actions}>
                <button
                  onClick={handleSave}
                  className={`${styles.button} ${styles.saveButton}`}
                  disabled={!apiKey.trim()}
                >
                  {isSaved ? '✓ Salvo!' : 'Salvar'}
                </button>
                <button
                  onClick={handleClear}
                  className={`${styles.button} ${styles.clearButton}`}
                  disabled={!apiKey}
                >
                  Limpar
                </button>
              </div>

              {localStorage.getItem(API_KEY_STORAGE_KEY) && (
                <div className={styles.status}>
                  <span className={styles.statusIcon}>✓</span>
                  API Key configurada
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
