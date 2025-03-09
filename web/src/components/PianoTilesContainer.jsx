import React, { useState, useCallback, useEffect, useRef } from 'react';
import StylishPiano from './StylishPiano';
import NotesVisualizer from './NotesVisualizer';
import SheetMusicVisualizer from './SheetMusicVisualizer';
import AudioPlayer from './AudioPlayer';
import styles from './PianoTiles.module.css';

// Define consistent timing offsets for all components
const NOTE_TIMING_OFFSET = -1000; // milliseconds

export default function PianoTilesContainer({ midiData, fileName, audioData }) {
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [keyPositions, setKeyPositions] = useState({});
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  const containerRef = useRef(null);
  const timeUpdateRef = useRef(null);
  
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
    console.log('Note played:', midiEvent);
    // You could add sound synthesis here
  }, []);
  
  // Handle key position updates from the piano component
  const handleKeyPositionsUpdate = useCallback((positions) => {
    setKeyPositions(positions);
  }, []);
  
  // Handle toggling between visualizers
  const handleVisualizerToggle = useCallback((showSheet) => {
    setShowSheetMusic(showSheet);
  }, []);
  
  return (
    <div className={styles.premiumContainer}>
      <div className={styles.blurredBackground}></div>
      
      <div className={styles.contentContainer}>
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
          />
        </div>
        
        {/* Audio player with visualizer toggle */}
        <div className={styles.playerSection}>
          <AudioPlayer 
            audioData={audioData}
            onTimeUpdate={handleTimeUpdate}
            fileName={fileName}
            onVisualizerToggle={handleVisualizerToggle}
            showSheetMusic={showSheetMusic}
          />
        </div>
      </div>
    </div>
  );
}