import React, { useEffect, useRef, useState } from 'react';
import styles from './SheetMusicVisualizer.module.css';

// Constants for musical notation
const TREBLE_CLEF = '𝄞';
const BASS_CLEF = '𝄢';
const WHOLE_NOTE = '.';
const HALF_NOTE = '.';
const QUARTER_NOTE = '.';
const EIGHTH_NOTE = '.';
const SHARP = '♯';
const FLAT = '♭';
const NATURAL = '♮';

// MIDI note number to letter mapping
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// MIDI note ranges
const MIDI_MIN = 36; // C2
const MIDI_MAX = 96; // C7
const MIDDLE_C = 60;  // MIDI note number for middle C (C4)

export default function SheetMusicVisualizer({ midiData, currentTime }) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const [visibleNotes, setVisibleNotes] = useState([]);
  const [parsedNotes, setParsedNotes] = useState([]);
  const [staffWidth, setStaffWidth] = useState(0);
  const timeWindowRef = useRef(5000); // 5 seconds visible window
  const scrollPositionRef = useRef(0);
  const animationFrameRef = useRef(null);
  
  // Process MIDI data when loaded
  useEffect(() => {
    if (!midiData) return;
    
    // Parse all notes from MIDI data
    const notes = [];
    
    midiData.tracks.forEach(track => {
      if (track.notes && track.notes.length > 0) {
        track.notes.forEach(note => {
          // Only include notes within our range (C2-C7)
          if (note.midi >= MIDI_MIN && note.midi <= MIDI_MAX) {
            notes.push({
              midi: note.midi,
              startTime: note.time * 1000, // Convert to ms
              endTime: (note.time + note.duration) * 1000, // Convert to ms
              duration: note.duration * 1000, // Convert to ms
              velocity: note.velocity,
              name: NOTE_NAMES[note.midi % 12],
              octave: Math.floor(note.midi / 12) - 1,
              // Determine if note belongs to treble or bass clef
              clef: note.midi >= MIDDLE_C ? 'treble' : 'bass'
            });
          }
        });
      }
    });
    
    // Sort notes by start time
    notes.sort((a, b) => a.startTime - b.startTime);
    
    setParsedNotes(notes);
    
    // Log first few notes for debugging
    if (notes.length > 0) {
      console.log("First 5 notes:", notes.slice(0, 5));
    }
  }, [midiData]);
  
  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setStaffWidth(width);
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Update visible notes and scroll position based on current time
  useEffect(() => {
    if (!parsedNotes.length || !containerRef.current) return;
    
    // Calculate the visible time window
    const timeWindow = timeWindowRef.current;
    const startTime = Math.max(0, currentTime - timeWindow * 0.2); // 20% of window for past notes
    const endTime = currentTime + timeWindow * 0.8; // 80% of window for future notes
    
    // Filter notes that fall within the visible time window
    const visible = parsedNotes.filter(note => 
      (note.startTime <= endTime && note.endTime >= startTime)
    );
    
    setVisibleNotes(visible);
    
    // Calculate scroll position (pixels per millisecond)
    const pixelsPerMs = staffWidth / timeWindow;
    const scrollPosition = currentTime * pixelsPerMs;
    scrollPositionRef.current = scrollPosition;
    
    // Update scroll position of the staff
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollPosition - (staffWidth * 0.2); // Keep current time at 20% from left
    }
  }, [currentTime, parsedNotes, staffWidth]);
  
  // Determine note position on the staff based on MIDI note number
  const getNotePosition = (midiNote) => {
    // Middle C (MIDI 60) positioning
    // On treble clef, Middle C is first ledger line below staff
    // On bass clef, Middle C is first ledger line above staff
    
    if (midiNote >= MIDDLE_C) {
      // Treble clef
      // E4 (MIDI 64) is bottom line of treble staff
      return {
        clef: 'treble',
        linePosition: 5 - Math.floor((midiNote - 64) / 2)
      };
    } else {
      // Bass clef
      // G2 (MIDI 43) is bottom line of bass staff
      return {
        clef: 'bass',
        linePosition: 5 - Math.floor((midiNote - 43) / 2)
      };
    }
  };
  
  // Determine note duration symbol
  const getNoteDurationSymbol = (duration) => {
    // Duration is in milliseconds
    if (duration >= 1500) return WHOLE_NOTE;
    if (duration >= 750) return HALF_NOTE;
    if (duration >= 375) return QUARTER_NOTE;
    return EIGHTH_NOTE;
  };
  
  // Get accidental for a note
  const getAccidental = (noteName) => {
    if (noteName.includes('#')) return SHARP;
    if (noteName.includes('b')) return FLAT;
    return '';
  };
  
  // Group notes into chords based on start time (within small threshold)
  const groupNotesIntoChords = (notes) => {
    const chords = [];
    const threshold = 30; // ms threshold for considering notes part of the same chord
    
    notes.forEach(note => {
      // Find an existing chord that this note could belong to
      const existingChord = chords.find(
        chord => Math.abs(chord[0].startTime - note.startTime) < threshold
      );
      
      if (existingChord) {
        existingChord.push(note);
      } else {
        chords.push([note]);
      }
    });
    
    return chords;
  };
  
  // Calculate x-position for a note based on time
  const getXPosition = (noteTime) => {
    const pixelsPerMs = staffWidth / timeWindowRef.current;
    return (noteTime - (currentTime - timeWindowRef.current * 0.2)) * pixelsPerMs;
  };
  
  // Render staff lines
  const renderStaffLines = () => {
    const trebleStaffTop = 50;
    const bassStaffTop = 200;
    const staffLineSpacing = 10;
    
    // Calculate total width needed based on the latest note
    const lastNoteTime = parsedNotes.length > 0 ? 
      parsedNotes[parsedNotes.length - 1].endTime : 0;
    
    const totalWidth = Math.max(
      staffWidth * 2,
      getXPosition(lastNoteTime + 2000) // Add 2 seconds padding after last note
    );
    
    return (
      <>
        {/* Treble staff lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`treble-line-${i}`}
            x1="0"
            y1={trebleStaffTop + i * staffLineSpacing}
            x2={totalWidth}
            y2={trebleStaffTop + i * staffLineSpacing}
            stroke="#888"
            strokeWidth="1"
          />
        ))}
        
        {/* Bass staff lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={`bass-line-${i}`}
            x1="0"
            y1={bassStaffTop + i * staffLineSpacing}
            x2={totalWidth}
            y2={bassStaffTop + i * staffLineSpacing}
            stroke="#888"
            strokeWidth="1"
          />
        ))}
        
        {/* Treble clef */}
        <text
          x="20"
          y={trebleStaffTop + 20}
          fontSize="40"
          fill="#00d9e8"
          fontFamily="serif"
        >
          {TREBLE_CLEF}
        </text>
        
        {/* Bass clef */}
        <text
          x="20"
          y={bassStaffTop + 20}
          fontSize="40"
          fill="#00d9e8"
          fontFamily="serif"
        >
          {BASS_CLEF}
        </text>
        
        {/* Current position line */}
        <line
          x1={staffWidth * 0.2}
          y1="30"
          x2={staffWidth * 0.2}
          y2="280"
          stroke="#ff5252"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        
        {/* Render measure lines */}
        {renderMeasureLines(totalWidth)}
      </>
    );
  };
  
  // Render measure lines based on time signature
  const renderMeasureLines = (totalWidth) => {
    // Extract time signature from MIDI data or use default 4/4
    let timeSignature = { numerator: 4, denominator: 4 }; // Default 4/4 time
    let tempo = 120; // Default tempo in BPM
    
    if (midiData && midiData.header) {
      if (midiData.header.timeSignatures && midiData.header.timeSignatures.length > 0) {
        const ts = midiData.header.timeSignatures[0];
        timeSignature = {
          numerator: ts.timeSignature[0],
          denominator: ts.timeSignature[1]
        };
      }
      
      if (midiData.header.tempos && midiData.header.tempos.length > 0) {
        tempo = midiData.header.tempos[0].bpm;
      }
    }
    
    // Calculate milliseconds per measure
    const beatsPerMinute = tempo;
    const millisecondsPerBeat = 60000 / beatsPerMinute;
    const beatsPerMeasure = timeSignature.numerator * (4 / timeSignature.denominator);
    const millisecondsPerMeasure = millisecondsPerBeat * beatsPerMeasure;
    
    const measureLines = [];
    const measureTextLabels = [];
    const beatLines = [];
    
    // Calculate how many measures we need to draw
    const startMeasure = Math.floor((currentTime - timeWindowRef.current * 0.2) / millisecondsPerMeasure);
    const endMeasure = Math.ceil((currentTime + timeWindowRef.current * 0.8) / millisecondsPerMeasure);
    
    // Generate measure lines
    for (let i = startMeasure; i <= endMeasure; i++) {
      const measureTime = i * millisecondsPerMeasure;
      const xPos = getXPosition(measureTime);
      
      if (xPos >= 0 && xPos <= totalWidth) {
        // Main measure line
        measureLines.push(
          <line
            key={`measure-${i}`}
            x1={xPos}
            y1="40"
            x2={xPos}
            y2="260"
            stroke={i % 4 === 0 ? "#aaa" : "#888"}
            strokeWidth={i % 4 === 0 ? "2" : "1"}
          />
        );
        
        // Measure number
        if (i >= 0 && i % 4 === 0) {
          measureTextLabels.push(
            <text
              key={`measure-text-${i}`}
              x={xPos + 5}
              y="35"
              fontSize="12"
              fill="#00d9e8"
            >
              {i}
            </text>
          );
        }
        
        // Beat lines within each measure
        for (let beat = 1; beat < beatsPerMeasure; beat++) {
          const beatTime = measureTime + beat * millisecondsPerBeat;
          const beatXPos = getXPosition(beatTime);
          
          if (beatXPos >= 0 && beatXPos <= totalWidth) {
            beatLines.push(
              <line
                key={`beat-${i}-${beat}`}
                x1={beatXPos}
                y1="50"
                x2={beatXPos}
                y2="250"
                stroke="#555"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
            );
          }
        }
      }
    }
    
    return [...measureLines, ...measureTextLabels, ...beatLines];
  };
  
  // Render visible notes with proper musical notation
  const renderNotes = () => {
    const trebleStaffTop = 50;
    const bassStaffTop = 200;
    const staffLineSpacing = 10;
    
    // Group notes into chords
    const chords = groupNotesIntoChords(visibleNotes);
    
    return chords.map((chord, chordIndex) => {
      // Sort chord notes from lowest to highest
      chord.sort((a, b) => a.midi - b.midi);
      
      const firstNote = chord[0];
      const xPos = getXPosition(firstNote.startTime);
      
      // Skip notes that would be off-screen
      if (xPos < 0 || xPos > staffWidth) return null;
      
      // Check if the chord is currently playing
      const isActive = firstNote.startTime <= currentTime && 
                      firstNote.endTime >= currentTime;
      
      // Render each note in the chord
      return chord.map((note, noteIndex) => {
        const { clef, linePosition } = getNotePosition(note.midi);
        const yBase = clef === 'treble' ? trebleStaffTop : bassStaffTop;
        const y = yBase + linePosition * staffLineSpacing / 2;
        
        // Note symbol based on duration
        const noteSymbol = getNoteDurationSymbol(note.duration);
        const accidental = getAccidental(note.name);
        
        // Calculate stem direction (up for lower staff position, down for higher)
        const stemDirection = linePosition > 0 ? 'up' : 'down';
        
        // Calculate horizontal offset for chord notes to avoid overlapping
        const offsetX = chordIndex === 0 ? 0 : noteIndex * 2;
        
        // Determine if we need to draw ledger lines
        const needsLedgerLines = 
          (clef === 'treble' && (linePosition < -1 || linePosition > 9)) ||
          (clef === 'bass' && (linePosition < -1 || linePosition > 9));
        
        // Calculate ledger line positions if needed
        const ledgerLines = [];
        if (needsLedgerLines) {
          if (clef === 'treble') {
            // Ledger lines below treble staff
            if (linePosition > 9) {
              const startLine = 10;
              const endLine = Math.ceil(linePosition / 2) * 2;
              for (let i = startLine; i <= endLine; i += 2) {
                ledgerLines.push(
                  <line
                    key={`ledger-${chordIndex}-${noteIndex}-${i}`}
                    x1={xPos - 10}
                    y1={yBase + i * staffLineSpacing / 2}
                    x2={xPos + 10}
                    y2={yBase + i * staffLineSpacing / 2}
                    stroke="#888"
                    strokeWidth="1"
                  />
                );
              }
            }
            // Ledger lines above treble staff
            if (linePosition < -1) {
              const startLine = -2;
              const endLine = Math.floor(linePosition / 2) * 2;
              for (let i = startLine; i >= endLine; i -= 2) {
                ledgerLines.push(
                  <line
                    key={`ledger-${chordIndex}-${noteIndex}-${i}`}
                    x1={xPos - 10}
                    y1={yBase + i * staffLineSpacing / 2}
                    x2={xPos + 10}
                    y2={yBase + i * staffLineSpacing / 2}
                    stroke="#888"
                    strokeWidth="1"
                  />
                );
              }
            }
          } else { // Bass clef
            // Ledger lines below bass staff
            if (linePosition > 9) {
              const startLine = 10;
              const endLine = Math.ceil(linePosition / 2) * 2;
              for (let i = startLine; i <= endLine; i += 2) {
                ledgerLines.push(
                  <line
                    key={`ledger-${chordIndex}-${noteIndex}-${i}`}
                    x1={xPos - 10}
                    y1={yBase + i * staffLineSpacing / 2}
                    x2={xPos + 10}
                    y2={yBase + i * staffLineSpacing / 2}
                    stroke="#888"
                    strokeWidth="1"
                  />
                );
              }
            }
            // Ledger lines above bass staff
            if (linePosition < -1) {
              const startLine = -2;
              const endLine = Math.floor(linePosition / 2) * 2;
              for (let i = startLine; i >= endLine; i -= 2) {
                ledgerLines.push(
                  <line
                    key={`ledger-${chordIndex}-${noteIndex}-${i}`}
                    x1={xPos - 10}
                    y1={yBase + i * staffLineSpacing / 2}
                    x2={xPos + 10}
                    y2={yBase + i * staffLineSpacing / 2}
                    stroke="#888"
                    strokeWidth="1"
                  />
                );
              }
            }
          }
        }
        
        return (
          <g 
            key={`note-${chordIndex}-${noteIndex}`}
            className={isActive ? styles.activeNote : ''}
          >
            {/* Render ledger lines if needed */}
            {ledgerLines}
            
            {/* Render accidental if needed */}
            {accidental && (
              <text
                x={xPos - 15}
                y={y}
                fontSize="24"
                fill={isActive ? "#ff5252" : "#00d9e8"}
                fontFamily="serif"
              >
                {accidental}
              </text>
            )}
            
            {/* Render note head */}
            <text
              x={xPos + offsetX}
              y={y}
              fontSize="24"
              fill={isActive ? "#ff5252" : "#00d9e8"}
              fontFamily="serif"
              textAnchor="middle"
            >
              {noteSymbol}
            </text>
            
            {/* Render note stem (for quarter and eighth notes) */}
            {(noteSymbol === QUARTER_NOTE || noteSymbol === EIGHTH_NOTE) && (
              <line
                x1={xPos + offsetX + (stemDirection === 'up' ? -8 : 8)}
                y1={y - (stemDirection === 'up' ? 0 : 10)}
                x2={xPos + offsetX + (stemDirection === 'up' ? -8 : 8)}
                y2={y + (stemDirection === 'up' ? -30 : 30)}
                stroke={isActive ? "#ff5252" : "#00d9e8"}
                strokeWidth="2"
              />
            )}
          </g>
        );
      });
    });
  };
  
  return (
    <div className={styles.sheetMusicContainer}>
      <div className={styles.sheetMusicHeader}>Sheet Music</div>
      <div className={styles.sheetMusicContent} ref={scrollRef}>
        <div className={styles.staffContainer} ref={containerRef}>
          <svg 
            className={styles.staffSvg} 
            viewBox={`0 0 ${staffWidth} 300`}
            preserveAspectRatio="xMinYMin meet"
          >
            {renderStaffLines()}
            {renderNotes()}
          </svg>
        </div>
      </div>
    </div>
  );
}
