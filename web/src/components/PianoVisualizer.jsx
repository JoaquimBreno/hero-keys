'use client';
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './PianoVisualizer.module.css';
import MIDIParser from 'midi-parser-js';
import PianoTilesContainer from './PianoTilesContainer';

export default function PianoVisualizer() {
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const pianoVisualizationRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [midiLoaded, setMidiLoaded] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle MIDI Parser script load
  const handleScriptLoad = () => {
    console.log('MIDI Parser script loaded');
    setIsLoaded(true);
  };
  
  // Effect for handling drag and drop
  useEffect(() => {
    if (!dropZoneRef.current || !fileInputRef.current) return;
    
    const dropZone = dropZoneRef.current;
    const fileInput = fileInputRef.current;
    
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
        
        // Check if file is MIDI
        if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
          setFileName(file.name);
          
          // Read file
          const reader = new FileReader();
          reader.onload = function(e) {
            try {
              const arrayBuffer = e.target.result;
              const byteArray = new Uint8Array(arrayBuffer);
              
              // Make sure MIDIParser is available
              if (typeof MIDIParser !== 'undefined') {
                const midiFile = MIDIParser.parse(byteArray);
                console.log('MIDI file parsed:', midiFile);
                
                // For now, just log the tracks
                if (midiFile && midiFile.track) {
                  setTimeout(() => {
                    setMidiLoaded(midiFile);
                    console.log(`Loaded ${midiFile.track.length} tracks`);
                    // End transition after a delay
                    setTimeout(() => {
                      setIsTransitioning(false);
                    }, 300);
                  }, 500);
                }
              } else {
                console.error('MIDIParser not loaded');
                alert('Error: MIDI parser not loaded. Please refresh and try again.');
              }
            } catch (error) {
              console.error('Error processing MIDI file:', error);
              alert('Error processing MIDI file. Please try another file.');
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          alert('Por favor, selecione um arquivo MIDI válido (.mid ou .midi)');
        }
      }
    };
    
    // Handle file input change
    const handleFileInputChange = () => {
      handleFiles(fileInput.files);
    };
    
    // Add event listeners
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
  }, [isLoaded, midiLoaded]);

  // Effect for rendering piano visualization when MIDI is loaded
  useEffect(() => {
    if (midiLoaded && pianoVisualizationRef.current) {
      // Here you would implement the actual piano visualization
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

  const goBack = () => {
    setFileName('');
    setMidiLoaded(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Additional styles for drop zone
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
            
            <PianoTilesContainer
              midiData={midiLoaded} 
              fileName={fileName}
            />
          
            
            <button 
              style={backButtonStyle}
              onClick={goBack}
            >
              Voltar
            </button>
        </div>
      ) : (
        // File upload interface
        <div 
          className="piano-container" 
          id="piano-container" 
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {fileName ? (
            <div className={styles.loadedFile}>
              <h3>Arquivo carregado: {fileName}</h3>
              <div 
                className={styles.pianoVisualization} 
                style={{ flex: 1, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <p className={styles.loadingText}>Carregando visualização...</p>
              </div>
            </div>
          ) : (
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
              <h3 style={{ marginBottom: '10px', fontSize: '1.2rem' }}>Arraste e solte seu arquivo MIDI aqui</h3>
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
                accept=".mid,.midi" 
                ref={fileInputRef} 
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}