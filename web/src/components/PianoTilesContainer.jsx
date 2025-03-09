// PianoVisualizationComponent.jsx
import React, { useState, useCallback, useEffect } from 'react';
import StylishPiano from './StylishPiano';
import NotesVisualizer from './NotesVisualizer';
import AudioPlayer from './AudioPlayer';
import styles from './PianoTiles.module.css';

export default function PianoTilesContainer({ midiData, fileName, audioData }) {
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  console.log('audioData:', audioData); 
  // Handle time updates from the audio player
  const handleTimeUpdate = useCallback((timeMs) => {
    setCurrentPlaybackTime(timeMs);
  }, []);
  
  // Handle note plays from the piano
  const handleNotePlay = useCallback((midiEvent) => {
    console.log('Note played:', midiEvent);
    // You could add sound synthesis here
  }, []);
  
  return (
    <div className={styles.premiumContainer}>
      <div className={styles.blurredBackground}></div>
      
      <div className={styles.contentContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>{fileName || "MIDI Visualization"}</h1>
        </div>
        
        {/* Notes visualization with particles */}
        <div className={styles.visualizerSection}>
          <NotesVisualizer 
            midiData={midiData}
            currentTime={currentPlaybackTime}
          />
        </div>
        
        {/* Piano visualization */}
        <div className={styles.pianoSection}>
          <StylishPiano 
            midiData={midiData}
            currentTime={currentPlaybackTime}
            onNotePlay={handleNotePlay}
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