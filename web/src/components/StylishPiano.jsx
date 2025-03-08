// StylishPiano.jsx
import React, { useState, useCallback, useEffect } from 'react';
import styles from './StylishPiano.module.css';

export default function StylishPiano({ midiData, currentTime = 0, onNotePlay }) {
  const [pressedKeys, setPressedKeys] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPlayedNote, setLastPlayedNote] = useState(null);
  
  // Piano configuration - 5 octaves
  const startNote = 36; // C2
  const keyCount = 60; // 5 octaves (12 notes per octave * 5)
  
  // Track active notes from MIDI data based on current playback time
  useEffect(() => {
    if (!midiData) return;
    // Extract all note events from all tracks
    const allNoteEvents = midiData.track.flatMap(track => 
      track.event.filter(event => event.type === 9 || event.type === 8)
    );
    
    // Calculate absolute time for each event
    let absoluteEvents = [];
    let currentAbsoluteTime = 0;
    
    allNoteEvents.forEach(event => {
      currentAbsoluteTime += event.deltaTime;
      absoluteEvents.push({
        ...event,
        absoluteTime: currentAbsoluteTime
      });
    });
    
    // Find active notes at current time
    const activeNotes = [];
    const noteState = {};
    
    for (const event of absoluteEvents) {
      if (event.absoluteTime > currentTime) break;
      
      const noteNumber = event.data[0];
      
      if (event.type === 9 && event.data[1] > 0) {
        // Note on
        noteState[noteNumber] = true;
      } else {
        // Note off
        noteState[noteNumber] = false;
      }
    }
    
    // Collect all notes that are still on
    Object.entries(noteState).forEach(([note, isOn]) => {
      if (isOn) activeNotes.push(parseInt(note));
    });
    
    setPressedKeys(activeNotes);
  }, [midiData, currentTime]);
  
  // Mouse interaction handlers
  const handleMouseDown = useCallback((midiNote) => {
    setIsDragging(true);
    setPressedKeys(prev => [...prev, midiNote]);
    setLastPlayedNote(midiNote);
    
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
    
    if (isBlack) {
      blackNotes.push({ midiNote, noteName, isActive });
    } else {
      whiteNotes.push({ midiNote, noteName, isActive });
    }
  }

  return (
    <div className={styles.pianoContainer}>
      <div className={styles.keyboard}>
        {/* White keys */}
        <div className={styles.whiteKeysContainer}>
          {whiteNotes.map((note) => (
            <div 
              key={note.midiNote}
              className={`${styles.whiteKey} ${note.isActive ? styles.activeNote : ''}`}
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
                className={`${styles.blackKey} ${note.isActive ? styles.activeNote : ''}`}
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
  const whiteKeyWidth = 100 / (keyCount - getBlackKeyCount(36, 36 + 60));
  
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
    octavesFromStart = octavesFromStart*0.97
  }
  // Calculate the total number of white keys before this note
  console.log(midiNote)
  console.log(octavesFromStart)
  console.log(whiteKeysBefore)
  console.log(whiteKeysPerOctave)
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

// For the positioning calculation
const keyCount = 60; // 5 octaves