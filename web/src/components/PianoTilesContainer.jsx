// PianoVisualizationComponent.jsx
'use client';
import styles from './PianoVisualizer.module.css';

export default function PianoTilesContainer({ midiData, fileName }) {
  return (
    <div className={styles.pianoVisualization}>
      <div className={styles.midiInfoContainer}>
        <h4 className={styles.midiInfoTitle}>MIDI File Information:</h4>
        <p className={styles.midiInfoItem}>Format: {midiData.format}</p>
        <p className={styles.midiInfoItem}>Number of tracks: {midiData.track.length}</p>
        <p className={styles.midiInfoItem}>Time division: {midiData.timeDivision}</p>
        
        <div className={styles.tracksContainer}>
          <h4 className={styles.tracksTitle}>Tracks:</h4>
          <ul className={styles.tracksList}>
            {midiData.track.map((track, index) => (
              <li key={index} className={styles.trackItem}>
                Track {index + 1}: {track.event.length} events
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}