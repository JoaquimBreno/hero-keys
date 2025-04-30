// StylishPiano.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import styles from './StylishPiano.module.css';

// Piano configuration constants moved outside the component
const START_NOTE = 36; // C2
const KEY_COUNT = 60; // 5 octaves (12 notes per octave * 5)
const SPLIT_POINT = 60; // C4

export default function StylishPiano({ 
  midiData, 
  currentTime = 0, 
  onNotePlay,
  onKeyPositionsUpdate,
  timingOffset = 0, // Add timing offset parameter with default value
  playedMidiNotes = [] // Add played MIDI notes from external device
}) {
  const [pressedKeys, setPressedKeys] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPlayedNote, setLastPlayedNote] = useState(null);
  const [processedMidiData, setProcessedMidiData] = useState(null);
  const [activeNoteInfo, setActiveNoteInfo] = useState(null); // Para mostrar o indicador de nota
  
  // Refs for key elements
  const whiteKeysRef = useRef({});
  const blackKeysRef = useRef({});
  const containerRef = useRef(null);
  
  // Piano configuration reference - now using constants from outside
  const startNote = START_NOTE;
  const keyCount = KEY_COUNT;
  
  // Process MIDI data when it changes - adapted for Tone.js format
  useEffect(() => {
    if (!midiData) return;
    
    // Extract all notes from all tracks
    const allNotes = [];
    
    midiData.tracks.forEach(track => {
      if (track.notes && track.notes.length > 0) {
        track.notes.forEach(note => {
          // Convert Tone.js time (seconds) to milliseconds for consistency
          allNotes.push({
            note: note.midi, // MIDI note number
            velocity: note.velocity * 127, // Convert 0-1 to 0-127
            startTime: note.time * 1000, // Convert to ms
            endTime: (note.time + note.duration) * 1000, // Convert to ms
          });
        });
      }
    });
    
    setProcessedMidiData(allNotes);
  }, [midiData]);
  
  // Update active keys and note info based on current time and external MIDI input
  useEffect(() => {
    if (!processedMidiData) return;
    
    // Apply timing offset passed from parent component
    const adjustedCurrentTime = currentTime + timingOffset;
    
    // Find notes that are active at the current time
    const activeFromSequence = processedMidiData.filter(note => 
      note.startTime <= adjustedCurrentTime && note.endTime >= adjustedCurrentTime
    ).map(note => note.note);
    
    // Combine sequence notes with played MIDI notes
    const allActiveNotes = [...new Set([...activeFromSequence, ...playedMidiNotes])];
    
    setPressedKeys(allActiveNotes);
    
    // Update active note info for display
    if (allActiveNotes.length > 0) {
      // Get the highest note for display (usually melody)
      const highestNote = Math.max(...allActiveNotes);
      const noteName = getNoteNameWithOctave(highestNote);
      setActiveNoteInfo({ note: highestNote, name: noteName });
    } else {
      setActiveNoteInfo(null);
    }
  }, [processedMidiData, currentTime, timingOffset, playedMidiNotes]);

  // Measure key positions and report them to parent component
  useEffect(() => {
    if (!containerRef.current || !onKeyPositionsUpdate) return;
    
    const measureKeyPositions = () => {
      // Ensure containerRef is still valid when this function runs
      if (!containerRef.current) return;
      
      // Get container position for relative calculations
      const containerRect = containerRef.current.getBoundingClientRect();
      const positions = {};
      
      // Measure white keys
      Object.entries(whiteKeysRef.current).forEach(([midiNote, element]) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          positions[midiNote] = {
            x: rect.left + rect.width / 2 - containerRect.left,
            width: rect.width,
            isBlack: false
          };
        }
      });
      
      // Measure black keys
      Object.entries(blackKeysRef.current).forEach(([midiNote, element]) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          positions[midiNote] = {
            x: rect.left + rect.width / 2 - containerRect.left,
            width: rect.width,
            isBlack: true
          };
        }
      });
      
      onKeyPositionsUpdate(positions);
    };
    
    // Initial measurement after rendering with a safety check
    const timeoutId = setTimeout(() => {
      if (containerRef.current) {
        measureKeyPositions();
      }
    }, 100);
    
    // Remeasure on window resize with safety
    const handleResize = () => {
      if (containerRef.current) {
        measureKeyPositions();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [onKeyPositionsUpdate]);
  
  // Mouse interaction handlers
  const handleMouseDown = useCallback((midiNote) => {
    setIsDragging(true);
    setPressedKeys(prev => [...prev, midiNote]);
    setLastPlayedNote(midiNote);
    
    // Update active note info
    setActiveNoteInfo({ 
      note: midiNote, 
      name: getNoteNameWithOctave(midiNote) 
    });
    
    if (onNotePlay) {
      onNotePlay({
        type: 9,
        channel: 0,
        data: [midiNote, 100]
      });
    }
  }, [onNotePlay]);

  const handleMouseUp = useCallback((midiNote) => {
    setIsDragging(false);
    setPressedKeys(prev => prev.filter(note => note !== midiNote));
    
    if (onNotePlay) {
      onNotePlay({
        type: 8,
        channel: 0,
        data: [midiNote, 0]
      });
    }
    
    setLastPlayedNote(null);
  }, [onNotePlay]);
  
  const handleMouseEnter = useCallback((midiNote) => {
    if (isDragging && lastPlayedNote !== midiNote) {
      // Release previous note
      if (lastPlayedNote && pressedKeys.includes(lastPlayedNote)) {
        setPressedKeys(prev => prev.filter(note => note !== lastPlayedNote));
        if (onNotePlay) {
          onNotePlay({
            type: 8,
            channel: 0,
            data: [lastPlayedNote, 0]
          });
        }
      }
      
      // Play new note
      setPressedKeys(prev => [...prev, midiNote]);
      setLastPlayedNote(midiNote);
      
      if (onNotePlay) {
        onNotePlay({
          type: 9,
          channel: 0,
          data: [midiNote, 100]
        });
      }
    }
  }, [isDragging, lastPlayedNote, onNotePlay, pressedKeys]);
  
  // Global mouse handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        
        pressedKeys.forEach(note => {
          if (onNotePlay) {
            onNotePlay({
              type: 8,
              channel: 0,
              data: [note, 0]
            });
          }
        });
        
        setPressedKeys([]);
        setLastPlayedNote(null);
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, pressedKeys, onNotePlay]);
  
  // Generate keys
  const whiteNotes = [];
  const blackNotes = [];
  
  for (let i = 0; i < keyCount; i++) {
    const midiNote = startNote + i;
    const noteName = getSimpleNoteName(midiNote);
    const isBlack = isBlackKey(midiNote);
    const isActive = pressedKeys.includes(midiNote);
    const isLeftHand = midiNote < SPLIT_POINT;
    
    if (isBlack) {
      blackNotes.push({ midiNote, noteName, isActive, isLeftHand });
    } else {
      whiteNotes.push({ midiNote, noteName, isActive, isLeftHand });
    }
  }

  return (
    <div className={styles.pianoContainer} ref={containerRef}>
      {/* Nota ativa indicador */}
      {activeNoteInfo && (
        <div className={styles.activeNoteIndicator}>
          <div className={`${styles.noteNameBadge} ${activeNoteInfo.note < SPLIT_POINT ? styles.leftHandBadge : styles.rightHandBadge}`}>
            {activeNoteInfo.name}
          </div>
        </div>
      )}
      
      <div className={styles.keyboard}>
        {/* White keys */}
        <div className={styles.whiteKeysContainer}>
          {whiteNotes.map((note) => (
            <div 
              key={note.midiNote}
              ref={el => whiteKeysRef.current[note.midiNote] = el}
              className={`${styles.whiteKey} ${note.isActive ? (note.isLeftHand ? styles.activeNoteLeft : styles.activeNoteRight) : ''}`}
              data-note={note.midiNote}
              onMouseDown={() => handleMouseDown(note.midiNote)}
              onMouseUp={() => handleMouseUp(note.midiNote)}
              onMouseEnter={() => handleMouseEnter(note.midiNote)}
            >
              <span className={styles.noteName}>{note.noteName}</span>
            </div>
          ))}
        </div>

        {/* Black keys */}
        <div className={styles.blackKeysContainer}>
          {blackNotes.map((note) => {
            const position = getBlackKeyPosition(note.midiNote);
            return (
              <div
                key={note.midiNote}
                ref={el => blackKeysRef.current[note.midiNote] = el}
                className={`${styles.blackKey} ${note.isActive ? (note.isLeftHand ? styles.activeNoteLeft : styles.activeNoteRight) : ''}`}
                style={{ left: `${position}%` }}
                data-note={note.midiNote}
                onMouseDown={() => handleMouseDown(note.midiNote)}
                onMouseUp={() => handleMouseUp(note.midiNote)}
                onMouseEnter={() => handleMouseEnter(note.midiNote)}
              >
                {/* Black keys don't display names */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function isBlackKey(midiNote) {
  const note = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(note);
}

function getSimpleNoteName(midiNote) {
  const noteBase = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  
  const noteIndex = midiNote % 12;
  if ([0, 2, 4, 5, 7, 9, 11].includes(noteIndex)) {
    return `${noteBase[noteIndex]}${octave}`;
  }
  return '';
}

function getBlackKeyPosition(midiNote) {
  // We need to calculate the position based on how many white keys come before this key
  // First, determine how many octaves from the start
  const startOctave = Math.floor(36 / 12); // C2
  const currentOctave = Math.floor(midiNote / 12);
  let octavesFromStart = currentOctave - startOctave;
  
  // Each octave has 7 white keys
  const whiteKeysPerOctave = 7;
  
  // Calculate width percentage for each white key (distribute evenly)
  const whiteKeyWidth = 100 / (KEY_COUNT - getBlackKeyCount(36, 36 + 60));
  
  // Find position within the octave
  const noteInOctave = midiNote % 12;
  
  // Count white keys before this note in the current octave
  let whiteKeysBefore = 0;
  switch(noteInOctave) {
    case 1: // C#
      whiteKeysBefore = 0;
      break;
    case 3: // D#
      whiteKeysBefore = 1;
      break;
    case 6: // F#
      whiteKeysBefore = 3;
      break;
    case 8: // G#
      whiteKeysBefore = 4;
      break;
    case 10: // A#
      whiteKeysBefore = 5;
      break;
  }
  
  if(octavesFromStart > 0){
    octavesFromStart = octavesFromStart * 1;
  }
  // Calculate the total number of white keys before this note
  const totalWhiteKeysBefore = (octavesFromStart * whiteKeysPerOctave) + whiteKeysBefore;
  
  // Position is based on white keys
  return (totalWhiteKeysBefore * whiteKeyWidth) + (whiteKeyWidth * 0.6);
}

// Helper function to count black keys in a range
function getBlackKeyCount(startNote, endNote) {
  let count = 0;
  for (let i = startNote; i < endNote; i++) {
    if (isBlackKey(i)) count++;
  }
  return count;
}

// Helper to get note name with octave
function getNoteNameWithOctave(midiNote) {
  const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}