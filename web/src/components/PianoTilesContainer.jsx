import React, { useState, useCallback, useEffect, useRef } from 'react';
import StylishPiano from './StylishPiano';
import NotesVisualizer from './NotesVisualizer';
import AudioPlayer from './AudioPlayer';
import styles from './PianoTiles.module.css';

export default function PianoTilesContainer({ midiData, fileName, audioData }) {
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [keyPositions, setKeyPositions] = useState({});
  const containerRef = useRef(null);
  const timeUpdateRef = useRef(null);
  
  // Handle time updates from the audio player - use debounce to reduce updates
  const handleTimeUpdate = useCallback((timeMs) => {
    // Cancel previous update if it exists
    if (timeUpdateRef.current) {
      cancelAnimationFrame(timeUpdateRef.current);
    }
    
    // Schedule the update using requestAnimationFrame for better performance
    timeUpdateRef.current = requestAnimationFrame(() => {
      setCurrentPlaybackTime(timeMs);
    });
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
    console.log('Note played:', midiEvent);
    // You could add sound synthesis here
  }, []);
  
  // Handle key position updates from the piano component
  const handleKeyPositionsUpdate = useCallback((positions) => {
    setKeyPositions(positions);
  }, []);
  
  return (
    <div className={styles.premiumContainer}>
      <div className={styles.blurredBackground}></div>
      
      <div className={styles.contentContainer}>
        {/* Notes visualization with particles */}
        <div className={styles.visualizerSection}>
          <NotesVisualizer 
            midiData={midiData}
            currentTime={currentPlaybackTime}
            keyPositions={keyPositions}
            timeOffset={0}
          />
        </div>
        
        {/* Piano visualization */}
        <div className={styles.pianoSection}>
          <StylishPiano 
            midiData={midiData}
            currentTime={currentPlaybackTime}
            onNotePlay={handleNotePlay}
            onKeyPositionsUpdate={handleKeyPositionsUpdate}
          />
        </div>
        
        {/* Audio player */}
        <div className={styles.playerSection}>
          <AudioPlayer 
            audioData={audioData}
            onTimeUpdate={handleTimeUpdate}
            fileName={fileName}
          />
        </div>
      </div>
    </div>
  );
}