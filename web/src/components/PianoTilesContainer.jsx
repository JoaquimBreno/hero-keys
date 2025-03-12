import React, { useState, useCallback, useEffect, useRef } from 'react';
import StylishPiano from './StylishPiano';
import NotesVisualizer from './NotesVisualizer';
import SheetMusicVisualizer from './SheetMusicVisualizer';
import AudioPlayer from './AudioPlayer';
import MidiDeviceConnector from './MidiDeviceConnector';
import ChordCarousel from './ChordCarousel'; // Import the new component
import ScoreSystem from './ScoreSystem'; // Add ScoreSystem import
import FireEffect from './FireEffect'; // Add FireEffect import
import styles from './PianoTiles.module.css';

// Define consistent timing offsets for all components
const NOTE_TIMING_OFFSET = 0; // milliseconds

export default function PianoTilesContainer({ midiData, fileName, audioData, autoOpenMidiConnector = false, chordsData = null }) {
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [keyPositions, setKeyPositions] = useState({});
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  const [showMidiConnector, setShowMidiConnector] = useState(false);
  const [midiConnected, setMidiConnected] = useState(false);
  const [midiDeviceName, setMidiDeviceName] = useState('');
  const [playedMidiNotes, setPlayedMidiNotes] = useState([]);
  const [initialMidiPromptDone, setInitialMidiPromptDone] = useState(false);
  const [isMidiSoundEnabled, setIsMidiSoundEnabled] = useState(true); // New state for MIDI sound
  const [showChordCarousel, setShowChordCarousel] = useState(true); // New state for chord carousel visibility
  
  // New state for scoring system and effects
  const [showFireEffect, setShowFireEffect] = useState(false);
  const [vibrateIntensity, setVibrateIntensity] = useState(0);
  
  const containerRef = useRef(null);
  const timeUpdateRef = useRef(null);
  const midiDataLoadedRef = useRef(false);
  
  // Apply vibration effect to relevant components
  const applyVibrationStyle = (element, intensity) => {
    if (!element) return;
    
    if (intensity > 0) {
      const vibrationAmount = Math.min(intensity * 3, 3); // Max 3px vibration
      element.style.transform = `translate(${Math.random() * vibrationAmount - vibrationAmount/2}px, ${Math.random() * vibrationAmount - vibrationAmount/2}px)`;
    } else {
      element.style.transform = 'none';
    }
  };
  
  // Handle vibration effect updates
  useEffect(() => {
    if (!vibrateIntensity) return;
    
    const visualizerEl = document.querySelector(`.${styles.visualizerSection}`);
    const pianoEl = document.querySelector(`.${styles.pianoSection}`);
    
    const applyVibration = () => {
      applyVibrationStyle(visualizerEl, vibrateIntensity);
      applyVibrationStyle(pianoEl, vibrateIntensity);
    };
    
    // Create vibration animation
    let vibrationInterval;
    if (vibrateIntensity > 0) {
      vibrationInterval = setInterval(applyVibration, 50);
      applyVibration();
    }
    
    return () => {
      clearInterval(vibrationInterval);
      // Reset vibration when component unmounts or intensity changes
      if (visualizerEl) visualizerEl.style.transform = 'none';
      if (pianoEl) pianoEl.style.transform = 'none';
    };
  }, [vibrateIntensity]);
  
  // Detectar quando o midiData foi carregado pela primeira vez
  useEffect(() => {
    if (midiData && !midiDataLoadedRef.current) {
      midiDataLoadedRef.current = true;
      
      // Verificar se já recusou anteriormente
      const midiPromptStatus = localStorage.getItem('herokeys_midi_prompt_shown');
      
      if (autoOpenMidiConnector || !midiPromptStatus || midiPromptStatus === 'accepted') {
        // Mostrar modal imediatamente após o MIDI ser carregado
        setTimeout(() => {
          setShowMidiConnector(true);
          setInitialMidiPromptDone(true);
        }, 800); // Pequeno atraso para garantir que a UI esteja pronta
      }
    }
  }, [midiData, autoOpenMidiConnector]);
  
  useEffect(() => {
    if (midiData && midiData.tracks) {
      console.log('MIDI data loaded:', midiData);
    }
  }, [midiData]);

  // Handle time updates from the audio player - use debounce to reduce updates
  const handleTimeUpdate = useCallback((timeMs) => {
    // Cancel previous update if it exists
    if (timeUpdateRef.current) {
      cancelAnimationFrame(timeUpdateRef.current);
    }
    
    // Immediately update for better responsiveness
    setCurrentPlaybackTime(timeMs);
  }, []);
  
  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
    };
  }, []);
  
  // Handle note plays from the piano
  const handleNotePlay = useCallback((midiEvent) => {
    // Only process notes if MIDI sound is enabled
    if (isMidiSoundEnabled) {
      // Filter notes outside the valid range (36-95)
      if (midiEvent.data[0] >= 36 && midiEvent.data[0] <= 95) {
        setPlayedMidiNotes(prev => {
          if (midiEvent.type === 9 && midiEvent.data[1] > 0) {
            // Note on event
            return [...prev.filter(note => note !== midiEvent.data[0]), midiEvent.data[0]];
          } else {
            // Note off event
            return prev.filter(note => note !== midiEvent.data[0]);
          }
        });
      }
    }
  }, [isMidiSoundEnabled]);
  
  // Handle key position updates from the piano component
  const handleKeyPositionsUpdate = useCallback((positions) => {
    setKeyPositions(positions);
  }, []);
  
  // Handle toggling between visualizers
  const handleVisualizerToggle = useCallback((showSheet) => {
    setShowSheetMusic(showSheet);
  }, []);

  // Handle MIDI device connection
  const handleMidiConnect = useCallback((connected, deviceName = '') => {
    setMidiConnected(connected);
    setMidiDeviceName(deviceName);
    
    // Salvar configuração de preferência do usuário
    if (connected) {
      localStorage.setItem('herokeys_midi_prompt_shown', 'accepted');
    }
    
    if (!connected) {
      setPlayedMidiNotes([]);
    }
  }, []);

  // Handle MIDI messages from connected device
  const handleMidiMessage = useCallback((midiEvent) => {
    handleNotePlay(midiEvent);
  }, [handleNotePlay]);
  
  // Handle MIDI sound toggle
  const handleMidiSoundToggle = useCallback((enabled) => {
    setIsMidiSoundEnabled(enabled);
    
    // If disabling sound, clear any currently played notes
    if (!enabled) {
      setPlayedMidiNotes([]);
    }
  }, []);
  
  // Fechar modal de MIDI
  const handleCloseModal = useCallback(() => {
    // Apenas feche o modal, mas mantenha a conexão MIDI se estiver ativa
    setShowMidiConnector(false);
    
    // Marcar que o usuário já viu o prompt
    if (!initialMidiPromptDone) {
      localStorage.setItem('herokeys_midi_prompt_shown', 'declined');
      setInitialMidiPromptDone(true);
    }
  }, [initialMidiPromptDone]);
  
  // Toggle chord carousel visibility
  const handleChordCarouselToggle = useCallback(() => {
    setShowChordCarousel(prev => !prev);
  }, []);
  
  // Handle fire effect toggle
  const handleFireEffect = useCallback((active) => {
    setShowFireEffect(active);
  }, []);
  
  // Handle vibration intensity change
  const handleVibrateChange = useCallback((intensity) => {
    setVibrateIntensity(intensity);
  }, []);
  
  return (
    <div className={styles.premiumContainer} ref={containerRef}>
      <div className={styles.blurredBackground}></div>
      
      {/* Fire Effect - Positioned at the top level to cover the entire UI */}
      <FireEffect active={showFireEffect} />
      
      <div className={styles.contentContainer}>
        {/* Add Score System */}
        <ScoreSystem 
          midiData={midiData} 
          currentTime={currentPlaybackTime}
          playedMidiNotes={playedMidiNotes}
          onVibrateChange={handleVibrateChange}
          onFireEffect={handleFireEffect}
        />
        
        {/* Add Chord Carousel if chords data is available */}
        {chordsData && showChordCarousel && (
          <div className={styles.chordCarouselSection}>
            <ChordCarousel 
              chords={chordsData}
              currentTime={currentPlaybackTime}
            />
          </div>
        )}
        
        {/* Visualization area - conditionally render based on toggle state */}
        <div className={styles.visualizerSection}>
          {showSheetMusic ? (
            <SheetMusicVisualizer 
              midiData={midiData}
              currentTime={currentPlaybackTime}
            />
          ) : (
            <NotesVisualizer 
              midiData={midiData}
              currentTime={currentPlaybackTime}
              keyPositions={keyPositions}
              verticalOffset={2} // Small pixel adjustment for perfect alignment
              timingOffset={NOTE_TIMING_OFFSET} // Pass the timing offset
              playedMidiNotes={playedMidiNotes} // Pass played MIDI notes
            />
          )}
        </div>
        
        {/* Piano visualization */}
        <div className={styles.pianoSection}>
          <StylishPiano 
            midiData={midiData}
            currentTime={currentPlaybackTime}
            timingOffset={NOTE_TIMING_OFFSET} // Pass the same timing offset
            onNotePlay={handleNotePlay}
            onKeyPositionsUpdate={handleKeyPositionsUpdate}
            playedMidiNotes={playedMidiNotes}
          />
          
          {/* MIDI Connection button */}
          <button 
            className={styles.midiConnectButton}
            onClick={() => setShowMidiConnector(true)}
          >
            {midiConnected ? `${midiDeviceName} conectado ✓` : 'Conectar Teclado MIDI'}
          </button>
        </div>
        
        {/* Audio player with visualizer toggle and MIDI sound toggle */}
        <div className={styles.playerSection}>
          <AudioPlayer 
            audioData={audioData}
            onTimeUpdate={handleTimeUpdate}
            fileName={fileName}
            onVisualizerToggle={handleVisualizerToggle}
            showSheetMusic={showSheetMusic}
            onMidiSoundToggle={handleMidiSoundToggle}
            isMidiSoundEnabled={isMidiSoundEnabled}
            onChordCarouselToggle={chordsData ? handleChordCarouselToggle : null} // Add chord toggle if data exists
            showChordCarousel={showChordCarousel}
          />
        </div>
      </div>
      
      {/* MIDI Device Connector Modal */}
      <MidiDeviceConnector 
        isOpen={showMidiConnector}
        onClose={handleCloseModal}
        onMidiConnect={handleMidiConnect}
        onMidiMessage={handleMidiMessage}
        isMidiSoundEnabled={isMidiSoundEnabled}
      />
    </div>
  );
}