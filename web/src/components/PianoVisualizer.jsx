'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import styles from './PianoVisualizer.module.css';

export default function PianoVisualizer() {
  const dropZoneRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fileName, setFileName] = useState('');
  
  // Handle MIDI Parser script load
  const handleScriptLoad = () => {
    console.log('MIDI Parser script loaded');
    setIsLoaded(true);
  };
  
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
                
                // Initialize piano visualization here
                // This is where you would call your herokeys.js functionality
                // For example: initPianoViz(midiFile);
                
                // For now, just log the tracks
                if (midiFile && midiFile.track) {
                  console.log(`Loaded ${midiFile.track.length} tracks`);
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
  }, [isLoaded]);

  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/midi-parser-js/midi-parser.min.js" 
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      
      <div className="piano-container" id="piano-container">
        {fileName ? (
          <div className={styles.loadedFile}>
            <h3>Arquivo carregado: {fileName}</h3>
            <div className={styles.pianoVisualization} id="piano-visualization">
              {/* Piano visualization will be rendered here by herokeys.js */}
              <p className={styles.loadingText}>Carregando visualização...</p>
            </div>
          </div>
        ) : (
          <div 
            className={`drop-zone ${isDragging ? 'active' : ''}`} 
            id="drop-zone" 
            ref={dropZoneRef}
          >
            <div className="drop-zone-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM16 11H13V8C13 7.45 12.55 7 12 7C11.45 7 11 7.45 11 8V11H8C7.45 11 7 11.45 7 12C7 12.55 7.45 13 8 13H11V16C11 16.55 11.45 17 12 17C12.55 17 13 16.55 13 16V13H16C16.55 13 17 12.55 17 12C17 11.45 16.55 11 16 11Z" fill="currentColor"/>
              </svg>
            </div>
            <h3 className="drop-zone-text">Arraste e solte seu arquivo MIDI aqui</h3>
            <p className="drop-zone-subtext">ou</p>
            <label className="browse-button" htmlFor="file-input">Escolher arquivo</label>
            <input 
              type="file" 
              id="file-input" 
              className="file-input" 
              accept=".mid,.midi" 
              ref={fileInputRef} 
            />
          </div>
        )}
      </div>
      
      {fileName && (
        <div className="controls-container" id="controls-container">
          {/* Controls will be added here */}
          <button 
            className={styles.resetButton}
            onClick={() => {
              setFileName('');
              // Reset any piano visualization state here
            }}
          >
            Carregar outro arquivo
          </button>
        </div>
      )}
    </>
  );
}