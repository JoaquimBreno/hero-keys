'use client';
import { useState, useRef, useEffect } from 'react';
import Script from 'next/script';
import MIDIParser from 'midi-parser-js';
import PianoTilesContainer from './PianoTilesContainer';
import styles from './PianoVisualizer.module.css';

export default function AudioDragDrop() {
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const pianoVisualizationRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [midiLoaded, setMidiLoaded] = useState(null);
  const [chordsData, setChordsData] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle MIDI Parser script load
  const handleScriptLoad = () => {
    console.log('MIDI Parser script loaded');
    setIsLoaded(true);
  };

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
        
        // Recupera tanto o MIDI quanto os dados de acordes
        const responseData = await res.json();
        const { midiBase64, chords } = responseData;
        console.log(responseData)
        if (!midiBase64) {
          throw new Error('MIDI data not received from server');
        }
        
        // Armazena os dados de acordes
        if (chords) {
          console.log('Chord data received:', chords);
          setChordsData(chords);
        }
        
        // Converter base64 para ByteArray (Uint8Array)
        const binaryString = window.atob(midiBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('Arquivo convertido para ByteArray com sucesso');
        
        // Parse the MIDI data with MIDIParser
        if (typeof MIDIParser !== 'undefined') {
          try {
            const midiFile = MIDIParser.parse(bytes);
            console.log('MIDI file parsed:', midiFile);
            
            setIsTransitioning(true);
            
            setTimeout(() => {
              setMidiLoaded(midiFile);
              console.log(`Loaded ${midiFile.track.length} tracks`);
              // End transition after a delay
              setTimeout(() => {
                setIsTransitioning(false);
              }, 300);
            }, 500);
            
          } catch (parseError) {
            console.error('Error parsing MIDI data:', parseError);
            alert('Erro ao analisar o arquivo MIDI. Por favor, tente novamente.');
          }
        } else {
          console.error('MIDIParser not loaded');
          alert('Erro: parser MIDI não carregado. Por favor, atualize a página e tente novamente.');
        }
      } catch (error) {
        console.error("Erro ao processar o arquivo MIDI:", error);
        alert('Ocorreu um erro ao processar o arquivo de áudio.');
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
          alert('Por favor, selecione um arquivo de áudio válido.');
        }
      }
    };

    const handleFileInputChange = () => {
      // Reset file input value to allow selecting the same file again
      processFiles(fileInput.files);
      // This is needed to allow re-uploading the same file
      fileInput.value = '';
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
  }, [isLoaded]);

  // Effect for rendering piano visualization when MIDI is loaded
  useEffect(() => {
    if (midiLoaded && pianoVisualizationRef.current) {
      renderPianoVisualization(midiLoaded);
    }
  }, [midiLoaded]);

  // Function for piano visualization
  const renderPianoVisualization = (midiData) => {
    const container = pianoVisualizationRef.current;
    if (container) {
      // Create a styled container for the MIDI info
      const pianoInfoDiv = document.createElement('div');
      pianoInfoDiv.style.width = '100%';
      pianoInfoDiv.style.height = '100%';
      pianoInfoDiv.style.padding = '20px';
      pianoInfoDiv.style.color = 'var(--text-primary)';
      pianoInfoDiv.style.overflow = 'auto';
      
      // Add MIDI information
      pianoInfoDiv.innerHTML = `
        <div>
          <h4 style="margin-bottom: 15px; font-size: 1.2rem;">MIDI File Information:</h4>
          <p style="margin-bottom: 8px;">Format: ${midiData.format}</p>
          <p style="margin-bottom: 8px;">Number of tracks: ${midiData.track.length}</p>
          <p style="margin-bottom: 15px;">Time division: ${midiData.timeDivision}</p>
          
          <div>
            <h4 style="margin-bottom: 10px; font-size: 1.1rem;">Tracks:</h4>
            <ul style="list-style-type: none; padding: 0;">
              ${midiData.track.map((track, index) => `
                <li style="margin-bottom: 5px; padding: 8px; background-color: rgba(0,0,0,0.2); border-radius: 4px;">
                  Track ${index + 1}: ${track.event.length} events
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
      
      // Clear previous content and add the new info
      container.innerHTML = '';
      container.appendChild(pianoInfoDiv);
    }
  };

  // Renderiza os dados de acordes
  const renderChordsData = () => {
    if (!chordsData || Object.keys(chordsData).length === 0) {
      return (
        <div className={styles.noChords}>
          <p>Nenhum dado de acordes disponível</p>
        </div>
      );
    }
    
    return (
      <div className={styles.chordsContainer}>
        <h3 className={styles.chordsTitle}>Acordes Detectados</h3>
        <div className={styles.chordsList}>
          {chordsData.chords && chordsData.chords.map((chord, index) => (
            <div key={index} className={styles.chordItem}>
              <span className={styles.chordName}>{chord.name || chord.chord}</span>
              <span className={styles.chordTime}>
                {formatTime(chord.start)} - {formatTime(chord.end)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Função auxiliar para formatar o tempo em minutos:segundos
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const goBack = () => {
    setFileName('');
    setMidiLoaded(null);
    setChordsData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  // Full-screen visualization style
  const fullScreenVisualizationStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 1000,
    backgroundColor: 'var(--background)',
    display: 'flex',
    flexDirection: 'column',
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning ? 'scale(0.95)' : 'scale(1)',
    transition: 'opacity 0.4s ease, transform 0.4s ease'
  };

  // Back button style
  const backButtonStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1001,
    padding: '10px 20px',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease'
  };

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/midi-parser-js/midi-parser.min.js" 
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      
      {midiLoaded ? (
        // Full-screen visualization when MIDI is loaded
        <div 
          style={fullScreenVisualizationStyle}
          className={isTransitioning ? styles.transitioningContainer : ''}
        >
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Arquivo carregado: {fileName}
            </h3>
          </div>
          
          <div className={styles.visualizationContainer}>
            <PianoTilesContainer
              midiData={midiLoaded} 
              fileName={fileName}
            />
            
            {/* Seção de acordes */}
            <div className={styles.chordsSidebar}>
              {renderChordsData()}
            </div>
          </div>
          
          <button 
            style={backButtonStyle}
            onClick={goBack}
          >
            Voltar
          </button>
        </div>
      ) : (
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
          {fileName && !midiLoaded && <p style={{ marginTop: '15px' }}>Arquivo selecionado: {fileName}</p>}
          {loading && <p>Processando áudio...</p>}
          
          {/* Hidden div for piano visualization data */}
          <div ref={pianoVisualizationRef} style={{display: 'none'}}></div>
        </div>
      )}
    </>
  );
}