'use client';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
// Removed Script import since we don't need it
import styles from './PianoVisualizer.module.css';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';  // We're using this directly for MIDI parsing
import PianoTilesContainer from './PianoTilesContainer';

export default function PianoVisualizer() {
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const pianoVisualizationRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(true); // Initialize to true since we don't need to wait for script
  const [fileName, setFileName] = useState('');
  const [midiLoaded, setMidiLoaded] = useState(null);  
  const [chordsData, setChordsData] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Secret dev mode function to load mock files from public directory
  const loadDevMockFiles = async () => {
    setLoading(true);
    setFileName('take.mp3');
    const audioUrl = '/take.mp3';
    
    try {
      // Fetch the audio file from public directory
      const audioResponse = await fetch(audioUrl);
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mp3' });
      const audioObjectUrl = URL.createObjectURL(audioBlob);
      
      // Fetch the MIDI file from public directory
      const midiResponse = await fetch('/take.mid');
      const midiArrayBuffer = await midiResponse.arrayBuffer();
      
      // Load the MIDI data using the correct Midi parser
      const midi = new Midi(midiArrayBuffer);
      console.log('Dev mock MIDI file parsed with Tone.js:', midi);
      
      setIsTransitioning(true);
      
      setTimeout(() => {
        setMidiLoaded(midi);
        setAudioFile(audioObjectUrl);
        
        // If we have mock chord data, format it properly too
        try {
          fetch('/take.json')
            .then(res => res.json())
            .then(chords => {
              if (Array.isArray(chords)) {
                setChordsData({
                  data: chords,
                  type: 'chord-data'
                });
              }
            })
            .catch(err => console.log('No chord data available for dev mock'));
        } catch (err) {}
        
        // End transition after a delay
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }, 500);
    } catch (error) {
      console.error('Error loading mock files:', error);
      alert('Erro ao carregar arquivos de teste.');
    } finally {
      setLoading(false);
    }
  };

  const base64ToBlob = (base64Data) => {
    // Remove data URL prefix if present
    const base64WithoutPrefix = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;
      
    const byteCharacters = atob(base64WithoutPrefix);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'audio/mp3' });
  };

  // Convert audio to base64 and send to /api/processAudio route
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
        
        // Get both MIDI and chord data
        const responseData = await res.json();
        const { midiBase64, chords, pianoOutputBuffer } = responseData;
        
        if (!midiBase64) {
          throw new Error('MIDI data not received from server');
        }
        
        console.log("Chords", chords);
        // Store chord data - ensure it's in the correct format
        if (chords && Array.isArray(chords)) {
          // Format the chord data properly to avoid Component is not a function error
          setChordsData({
            data: chords,
            type: 'chord-data'
          });
        } else {
          setChordsData(null);
          console.warn('Received chord data was not in expected array format');
        }
        
        // Convert base64 MIDI to ArrayBuffer and parse with Tone.js
        const midiData = base64ToArrayBuffer(midiBase64);
        try {
          const midi = new Midi(midiData);
          console.log('MIDI file parsed with Tone.js:', midi);
          
          setIsTransitioning(true);
          setTimeout(() => { 
            setMidiLoaded(midi);
            if (pianoOutputBuffer) {
              const audioBlob = base64ToBlob(pianoOutputBuffer);
              const audioUrl = URL.createObjectURL(audioBlob);
              setAudioFile(audioUrl); // Now audioFile will be a playable URL
            }
            else{
              setAudioFile(file);
            }
            
            // End transition after a delay
            setTimeout(() => {
              setIsTransitioning(false);
            }, 300);
          }, 500);
          
        } catch (parseError) {
          console.error('Error parsing MIDI data with Tone.js:', parseError);
          alert('Erro ao analisar o arquivo MIDI. Por favor, tente novamente.');
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
  
  // Helper function to convert base64 to ArrayBuffer
  function base64ToArrayBuffer(base64) {
    // Remove data URL prefix if present
    const base64WithoutPrefix = base64.includes('base64,') 
      ? base64.split('base64,')[1] 
      : base64;
    
    const binaryString = atob(base64WithoutPrefix);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }
  
  // Set up drag and drop functionality
  useEffect(() => {
    if (!isLoaded) return;
    
    const dropZone = dropZoneRef.current;
    const fileInput = fileInputRef.current;
    
    // Guard clause - return early if elements don't exist
    if (!dropZone || !fileInput) return;
    
    // Prevent default drag behaviors
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    
    // Highlight drop zone when dragging over it
    const highlight = () => {
      setIsDragging(true);
    };
    
    const unhighlight = () => {
      setIsDragging(false);
    };
    
    // Handle dropped files
    const handleDrop = (e) => {
      preventDefaults(e);
      unhighlight();
      
      const dt = e.dataTransfer;
      const files = dt.files;
      handleFiles(files);
    };
    
    // Handle files
    const handleFiles = (files) => {
      if (files.length > 0) {
        const file = files[0];
        
        // Check if file is audio
        if (file.type.startsWith('audio/')) {
          setFileName(file.name);
          uploadFileToApi(file);
        } else {
          alert('Por favor, selecione um arquivo de áudio válido (.mp3, .wav, etc.)');
        }
      }
    };
    
    // Handle file input change
    const handleFileInputChange = () => {
      console.log('File input change detected');
      handleFiles(fileInput.files);
      // Reset the input so the same file can be selected again
      fileInput.value = '';
    };
    
    // Add event listeners - with safety checks
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
    
    // Cleanup
    return () => {
      if (dropZone && fileInput) {
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
      }
    };
  }, [isLoaded, midiLoaded]); // Add midiLoaded as a dependency to re-attach listeners

  // Effect for rendering piano visualization when MIDI is loaded
  useEffect(() => {
    if (midiLoaded && pianoVisualizationRef.current) {
      // Here you would implement the actual piano visualization
      renderPianoVisualization(midiLoaded);
    }
  }, [midiLoaded]);

  // Função para renderizar informações do MIDI
  const renderPianoVisualization = (midiData) => {
    const container = pianoVisualizationRef.current;
    if (container) {
      // Criar um container estilizado para a informação MIDI
      const pianoInfoDiv = document.createElement('div');
      pianoInfoDiv.style.width = '100%';
      pianoInfoDiv.style.height = '100%';
      pianoInfoDiv.style.padding = '20px';
      pianoInfoDiv.style.color = 'var(--text-primary)';
      pianoInfoDiv.style.overflow = 'auto';
      
      // Adicionar informações do MIDI
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
      
      // Limpar conteúdo anterior e adicionar a nova info
      container.innerHTML = '';
      container.appendChild(pianoInfoDiv);
    }
  };

  // More comprehensive goBack function
  const goBack = () => {
    // Reset all state
    setFileName('');
    setMidiLoaded(null);
    setChordsData(null);
    setAudioFile(null);
    setLoading(false);
    setIsTransitioning(false);
    setIsDragging(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Small delay to ensure UI updates properly
    setTimeout(() => {
      // Force focus on the dropzone to make it more interactive
      if (dropZoneRef.current) {
        dropZoneRef.current.focus();
      }
    }, 100);
  };

  // Additional styles for drop zone
  const dropZoneStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed white',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
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
    opacity: isTransitioning ? 0 : 1  
  };

  // Back button style
  const backButtonStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '99%',
    transform: 'translateX(-120%)',
    zIndex: 1001,
    padding: '10px 20px',
    backgroundColor: '#00e5c7',
    color: 'black',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease'
  };

  // Função auxiliar para formatar o tempo em minutos:segundos
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Memoize the data passed to PianoTilesContainer to prevent unnecessary re-renders
  const pianoTilesProps = useMemo(() => ({
    midiData: midiLoaded,
    fileName,
    audioData: audioFile,
    autoOpenMidiConnector: true,
    chordsData,
    renderChords: !!chordsData
  }), [midiLoaded, fileName, audioFile, chordsData]);

  return (
    <>
      {midiLoaded ? (
        // Full-screen visualization when MIDI is loaded
          <div 
            style={fullScreenVisualizationStyle}
            className={isTransitioning ? '' : styles.zoomInAnimation}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                Arquivo carregado: {fileName}
              </h3>
            </div>
            
            <div className={styles.visualizationContainer}>
              <PianoTilesContainer {...pianoTilesProps} />
            </div>
            
            <button 
              style={backButtonStyle}
              onClick={goBack}
            >
              Voltar
            </button>
          </div>
      ) : (
        // File upload interface or loading screen
        <div 
          className="piano-container" 
          id="piano-container" 
          style={{ 
            width: '50%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative' // Added to allow absolute positioning of hidden elements
          }}
        >
          {/* Dev button - now slightly more visible but still discrete */}
          <div 
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              width: '15px',
              height: '15px',
              border: '1px solid rgba(100, 100, 100, 0.15)',
              borderRadius: '50%',
              backgroundColor: 'rgba(150, 150, 150, 0.05)',
              cursor: 'help',
              zIndex: 1000,
              transition: 'background-color 0.3s ease'
            }}
            title="Dev Mode"
            onClick={(e) => {
              // Now just needs a single click
              e.stopPropagation();
              loadDevMockFiles();
            }}
            onMouseOver={(e) => {
              // Subtle highlight on hover
              e.currentTarget.style.backgroundColor = 'rgba(150, 150, 150, 0.15)';
            }}
            onMouseOut={(e) => {
              // Reset on mouse out
              e.currentTarget.style.backgroundColor = 'rgba(150, 150, 150, 0.05)';
            }}
          />
          
          {loading ? (
            // Loading spinner UI with improved circle animation and maintained container style
            <div className={styles.loadingContainer}>
              <div className={`${styles.fancySpinner} ${styles.enhancedLoader}`}>
                <div className={styles.loaderCircle}></div>
                <div className={styles.innerCircle}></div>
                <div className={styles.outerCircle}></div>
              </div>
              <p className={styles.loadingText}>Processando áudio e gerando MIDI...</p>
              <p className={styles.smallText}>Isso pode levar alguns segundos</p>
            </div>
          ) : fileName && !midiLoaded ? (
            // File selected but MIDI not yet loaded (transitional state)
            <div className={styles.loadingContainer}>
              <div className={`${styles.fancySpinner} ${styles.enhancedLoader}`}>
                <div className={styles.loaderCircle}></div>
                <div className={styles.innerCircle}></div>
                <div className={styles.outerCircle}></div>
              </div>
              <p className={styles.loadingText}>Carregando visualização...</p>
              <p className={styles.smallText}>Isso pode levar alguns segundos</p>
            </div>
          ) : (
            // File upload UI only shown when not loading
            <div 
              style={dropZoneStyle}
              className={isDragging ? 'active' : ''} 
              id="drop-zone" 
              ref={dropZoneRef}
            >
              <div style={{ marginBottom: '20px' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16 11H13V8C13 7.45 12.55 7 12 7C11.45 7 11 7.45 11 8V11H8C7.45 11 7 11.45 7 12C7 12.55 7.45 13 8 13H11V16C11 16.55 11.45 17 12 17C12.55 17 13 16.55 13 16V13H16C16.55 13 17 12.55 17 12C17 11.45 16.55 11 16 11Z" fill="currentColor"/>
                </svg>
              </div>
              <h3 style={{ marginBottom: '10px', fontSize: '1.2rem' }}>
                Arraste e solte seu arquivo de áudio aqui
              </h3>
              <p style={{ marginBottom: '15px', color: 'var(--text-tertiary)' }}>ou</p>
              <label 
                style={{ 
                  padding: '10px 20px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
                htmlFor="file-input"
              >
                Escolher arquivo
              </label>
              <input 
                type="file" 
                id="file-input" 
                style={{ display: 'none' }}
                accept="audio/*" 
                ref={fileInputRef} 
              />
              <p style={{ marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                Formatos suportados: MP3, WAV, OGG, etc.
              </p>
            </div>
          )}
          
          {/* Hidden div for piano visualization data */}
          <div ref={pianoVisualizationRef} style={{display: 'none'}}></div>
        </div>
      )}
    </>
  );
}