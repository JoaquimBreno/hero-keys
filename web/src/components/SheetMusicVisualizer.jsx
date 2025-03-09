import React, { useEffect, useRef } from 'react';
import styles from './SheetMusicVisualizer.module.css';

export default function SheetMusicVisualizer({ midiData, currentTime }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentTimeRef = useRef(0);
  
  // Keep the currentTime ref updated
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  // Set up the canvas and start the render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !midiData) return;
    
    const ctx = canvas.getContext('2d');
    
    // Extract tempo and time signature from MIDI data
    const { tempo, timeSignature } = extractMusicalInfo(midiData);
    
    // Resize canvas to match container dimensions
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Process MIDI data once
    const processedNotes = processMidiData(midiData);
    
    // Group notes into measures based on timing
    const measuredNotes = organizeNotesIntoMeasures(processedNotes, tempo, timeSignature);
    
    // Start the animation loop
    const renderFrame = () => {
      // Always use the current value from the ref
      drawSheetMusic(ctx, canvas.width, canvas.height, processedNotes, measuredNotes, currentTimeRef.current, tempo, timeSignature);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    
    renderFrame();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [midiData]);
  
  // Extract tempo and time signature from MIDI data
  function extractMusicalInfo(midiData) {
    let tempo = 120; // Default tempo in BPM
    let timeSignature = { numerator: 4, denominator: 4 }; // Default 4/4 time
    
    if (midiData && midiData.track) {
      for (const track of midiData.track) {
        if (!track.event) continue;
        
        for (const event of track.event) {
          // Check for tempo meta event (type 255, subtype 81)
          if (event.type === 255 && event.subtype === 81 && event.data) {
            // Convert tempo data to BPM
            const microsecondsPerBeat = (
              (event.data[0] << 16) | 
              (event.data[1] << 8) | 
              event.data[2]
            );
            tempo = Math.round(60000000 / microsecondsPerBeat);
          }
          
          // Check for time signature meta event (type 255, subtype 88)
          if (event.type === 255 && event.subtype === 88 && event.data && event.data.length >= 2) {
            timeSignature = {
              numerator: event.data[0],
              denominator: Math.pow(2, event.data[1])
            };
          }
        }
      }
    }
    
    return { tempo, timeSignature };
  }
  
  // Organize notes into measures based on timing
  function organizeNotesIntoMeasures(notes, tempo, timeSignature) {
    const msPerBeat = 60000 / tempo;
    const beatsPerMeasure = timeSignature.numerator * (4 / timeSignature.denominator);
    const msPerMeasure = msPerBeat * beatsPerMeasure;
    
    const measures = [];
    let currentMeasure = [];
    let measureIndex = 0;
    
    // Sort notes by start time
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    
    sortedNotes.forEach(note => {
      const noteMeasure = Math.floor(note.startTime / msPerMeasure);
      
      // If we've moved to a new measure, push the current one and start a new one
      if (noteMeasure > measureIndex) {
        if (currentMeasure.length > 0) {
          measures.push({
            index: measureIndex,
            startTime: measureIndex * msPerMeasure,
            endTime: (measureIndex + 1) * msPerMeasure,
            notes: currentMeasure
          });
        }
        
        // Create empty measures for any skipped measures
        for (let i = measureIndex + 1; i < noteMeasure; i++) {
          measures.push({
            index: i,
            startTime: i * msPerMeasure,
            endTime: (i + 1) * msPerMeasure,
            notes: []
          });
        }
        
        currentMeasure = [note];
        measureIndex = noteMeasure;
      } else {
        currentMeasure.push(note);
      }
    });
    
    // Add the last measure if it has notes
    if (currentMeasure.length > 0) {
      measures.push({
        index: measureIndex,
        startTime: measureIndex * msPerMeasure,
        endTime: (measureIndex + 1) * msPerMeasure,
        notes: currentMeasure
      });
    }
    
    return measures;
  }
  
  // Main drawing function for the sheet music
  function drawSheetMusic(ctx, width, height, notes, measures, currentTimeMs, tempo, timeSignature) {
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get the milliseconds per beat
    const msPerBeat = 60000 / tempo;
    const beatsPerMeasure = timeSignature.numerator * (4 / timeSignature.denominator);
    const msPerMeasure = msPerBeat * beatsPerMeasure;
    
    // Configure drawing settings
    const settings = {
      // Layout settings
      staffHeight: 80,                       // Height between staff top and bottom
      lineSpacing: 10,                       // Space between lines in a staff
      noteRadius: 6,                         // Note head radius
      measureWidth: 200,                     // Width of a measure in pixels
      staffYPositions: {                     // Vertical position of staves
        treble: height * 0.3,                // Treble staff Y position
        bass: height * 0.7                   // Bass staff Y position
      },
      
      // Time and scrolling settings
      pixelsPerMs: 0.05,                     // How many pixels per millisecond (scrolling speed)
      pixelsPerBeat: 50,                     // How many pixels per beat
      currentLineX: width * 0.3,             // Position of the "now" line (30% from left)
      visibleTimeRange: {
        past: 2000,                          // Show notes 2 seconds in the past
        future: 4000                         // Show notes 4 seconds in the future
      },
      
      // Musical time information
      tempo: tempo,
      timeSignature: timeSignature,
      msPerBeat: msPerBeat,
      msPerMeasure: msPerMeasure,
      
      // Visual appearance
      colors: {
        background: 'transparent',
        lines: '#888',
        text: '#fff',
        noteDefault: '#00d9e8',
        notePlaying: '#ff5252',
        nowLine: '#ff5252'
      }
    };
    
    // Draw the fixed elements (clefs, staff lines)
    drawStaves(ctx, width, settings);
    
    // Draw the "now" line
    drawNowLine(ctx, height, settings);
    
    // Draw measure lines based on current time
    drawMeasureLines(ctx, width, height, currentTimeMs, settings);
    
    // Draw the notes based on current time
    drawNotes(ctx, width, height, notes, currentTimeMs, settings);
  }
  
  // Draw staff lines and clefs
  function drawStaves(ctx, width, settings) {
    const { staffYPositions, lineSpacing } = settings;
    
    // Draw treble and bass staves
    ctx.strokeStyle = settings.colors.lines;
    ctx.lineWidth = 1;
    
    // Draw treble staff lines
    for (let i = 0; i < 5; i++) {
      const y = staffYPositions.treble + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw bass staff lines
    for (let i = 0; i < 5; i++) {
      const y = staffYPositions.bass + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw clef symbols
    ctx.fillStyle = settings.colors.text;
    ctx.font = '60px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // Treble clef
    ctx.fillText('𝄞', 10, staffYPositions.treble + lineSpacing * 2);
    
    // Bass clef
    ctx.fillText('𝄢', 10, staffYPositions.bass + lineSpacing * 2);
  }
  
  // Draw measure lines periodically
  function drawMeasureLines(ctx, width, height, currentTimeMs, settings) {
    const { msPerMeasure, staffYPositions, lineSpacing, currentLineX, pixelsPerMs } = settings;
    
    // Find the current measure
    const currentMeasure = Math.floor(currentTimeMs / msPerMeasure);
    
    // Draw measure lines before and after the current position
    for (let i = -4; i < 8; i++) {
      const measureTime = (currentMeasure + i) * msPerMeasure;
      
      // Calculate x position
      const timeOffset = measureTime - currentTimeMs;
      const x = currentLineX + (timeOffset * pixelsPerMs);
      
      // Only draw if visible
      if (x >= 0 && x <= width) {
        ctx.strokeStyle = settings.colors.lines;
        ctx.lineWidth = i === 0 ? 2 : 1; // Make current measure line thicker
        ctx.beginPath();
        ctx.moveTo(x, staffYPositions.treble - lineSpacing);
        ctx.lineTo(x, staffYPositions.treble + 5 * lineSpacing);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x, staffYPositions.bass - lineSpacing);
        ctx.lineTo(x, staffYPositions.bass + 5 * lineSpacing);
        ctx.stroke();
        
        // Add measure number
        if (i + currentMeasure >= 1) {
          ctx.fillStyle = settings.colors.text;
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(String(i + currentMeasure), x, staffYPositions.treble - 15);
        }
        
        // If this is a quarter note position within the measure, draw a faint line
        for (let beat = 1; beat < settings.timeSignature.numerator; beat++) {
          const beatTime = measureTime + (beat * settings.msPerBeat);
          const beatOffset = beatTime - currentTimeMs;
          const beatX = currentLineX + (beatOffset * pixelsPerMs);
          
          if (beatX >= 0 && beatX <= width) {
            ctx.strokeStyle = 'rgba(136, 136, 136, 0.4)';  // Lighter version of line color
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(beatX, staffYPositions.treble);
            ctx.lineTo(beatX, staffYPositions.treble + 4 * lineSpacing);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(beatX, staffYPositions.bass);
            ctx.lineTo(beatX, staffYPositions.bass + 4 * lineSpacing);
            ctx.stroke();
          }
        }
      }
    }
  }
  
  // Draw the vertical line indicating the current playback position
  function drawNowLine(ctx, height, settings) {
    // Draw "now" line
    ctx.strokeStyle = settings.colors.nowLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(settings.currentLineX, 0);
    ctx.lineTo(settings.currentLineX, height);
    ctx.stroke();
  }
  
  // Draw the notes based on the current time
  function drawNotes(ctx, width, height, notes, currentTimeMs, settings) {
    const { currentLineX, pixelsPerMs, visibleTimeRange } = settings;
    
    // Define the time window for visible notes
    const startTime = currentTimeMs - visibleTimeRange.past;
    const endTime = currentTimeMs + visibleTimeRange.future;
    
    // Draw only notes within our visible time window
    notes.forEach(note => {
      // Only draw notes within the visible time range
      if (note.startTime < endTime && (note.startTime + note.duration) > startTime) {
        // Calculate x position based on time difference from current time
        const timeOffset = note.startTime - currentTimeMs;
        const x = currentLineX + (timeOffset * pixelsPerMs);
        
        // Position within the measure (for better visual distribution)
        const measureStartTime = Math.floor(note.startTime / settings.msPerMeasure) * settings.msPerMeasure;
        const timeIntoMeasure = note.startTime - measureStartTime;
        const measureProgress = timeIntoMeasure / settings.msPerMeasure; // 0 to 1
        
        // Calculate note width based on duration (for longer notes)
        const noteWidth = note.duration * pixelsPerMs;
        
        // Only draw if the note is visible on screen
        if (x >= 0 && x <= width) {
          // Determine if the note is currently playing
          const isPlaying = (note.startTime <= currentTimeMs && 
                           (note.startTime + note.duration) >= currentTimeMs);
          
          // Draw the note
          drawNote(ctx, x, note.midiNote, isPlaying, settings, noteWidth);
        }
      }
    });
  }
  
  // Draw an individual note
  function drawNote(ctx, x, midiNote, isPlaying, settings, noteWidth = 0) {
    const { staffYPositions, lineSpacing, noteRadius } = settings;
    
    // Calculate y position based on MIDI note number
    // Middle C is MIDI note 60
    let y;
    if (midiNote >= 60) {
      // Treble clef (higher notes)
      // Middle C is positioned on the 1st ledger line below the treble staff
      const stepsFromMiddleC = midiNote - 60;
      y = staffYPositions.treble + 5 * lineSpacing - (stepsFromMiddleC * lineSpacing / 2);
    } else {
      // Bass clef (lower notes)
      // Middle C is positioned on the 1st ledger line above the bass staff
      const stepsFromMiddleC = 60 - midiNote;
      y = staffYPositions.bass - lineSpacing + (stepsFromMiddleC * lineSpacing / 2);
    }
    
    // Draw ledger lines if needed
    ctx.strokeStyle = settings.colors.lines;
    ctx.lineWidth = 1;
    
    // Ledger lines above treble staff
    if (midiNote >= 60 && y < staffYPositions.treble - lineSpacing) {
      const linesNeeded = Math.floor((staffYPositions.treble - y) / lineSpacing) + 1;
      for (let i = 1; i <= linesNeeded; i++) {
        const lineY = staffYPositions.treble - i * lineSpacing;
        if (Math.abs(y - lineY) < 2) { // Only draw if note is on this line
          ctx.beginPath();
          ctx.moveTo(x - 10, lineY);
          ctx.lineTo(x + 10, lineY);
          ctx.stroke();
        }
      }
    }
    
    // Ledger lines below treble staff
    if (midiNote >= 60 && y > staffYPositions.treble + 4 * lineSpacing) {
      const linesNeeded = Math.floor((y - staffYPositions.treble - 4 * lineSpacing) / lineSpacing) + 1;
      for (let i = 1; i <= linesNeeded; i++) {
        const lineY = staffYPositions.treble + 4 * lineSpacing + i * lineSpacing;
        if (Math.abs(y - lineY) < 2) {
          ctx.beginPath();
          ctx.moveTo(x - 10, lineY);
          ctx.lineTo(x + 10, lineY);
          ctx.stroke();
        }
      }
    }
    
    // Ledger lines above bass staff
    if (midiNote < 60 && y < staffYPositions.bass - lineSpacing) {
      const linesNeeded = Math.floor((staffYPositions.bass - y) / lineSpacing) + 1;
      for (let i = 1; i <= linesNeeded; i++) {
        const lineY = staffYPositions.bass - i * lineSpacing;
        if (Math.abs(y - lineY) < 2) {
          ctx.beginPath();
          ctx.moveTo(x - 10, lineY);
          ctx.lineTo(x + 10, lineY);
          ctx.stroke();
        }
      }
    }
    
    // Ledger lines below bass staff
    if (midiNote < 60 && y > staffYPositions.bass + 4 * lineSpacing) {
      const linesNeeded = Math.floor((y - staffYPositions.bass - 4 * lineSpacing) / lineSpacing) + 1;
      for (let i = 1; i <= linesNeeded; i++) {
        const lineY = staffYPositions.bass + 4 * lineSpacing + i * lineSpacing;
        if (Math.abs(y - lineY) < 2) {
          ctx.beginPath();
          ctx.moveTo(x - 10, lineY);
          ctx.lineTo(x + 10, lineY);
          ctx.stroke();
        }
      }
    }
    
    // Draw note head
    ctx.fillStyle = isPlaying ? settings.colors.notePlaying : settings.colors.noteDefault;
    ctx.beginPath();
    
    // If it's a long note, draw an extended note shape
    if (noteWidth > noteRadius * 3) {
      // For longer notes, draw elongated shape
      const halfHeight = noteRadius * 0.8;
      
      // Draw rounded rectangle
      ctx.beginPath();
      ctx.moveTo(x - noteRadius, y - halfHeight);
      ctx.lineTo(x + Math.min(noteWidth, 30), y - halfHeight); // Cap the visible width
      ctx.ellipse(x + Math.min(noteWidth, 30), y, noteRadius, halfHeight, 0, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x - noteRadius, y + halfHeight);
      ctx.ellipse(x - noteRadius, y, noteRadius, halfHeight, 0, Math.PI / 2, -Math.PI / 2);
      ctx.fill();
    } else {
      // Regular note head for short notes
      ctx.ellipse(x, y, noteRadius, noteRadius * 0.8, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw stem
    const stemDirection = y < (staffYPositions.treble + staffYPositions.bass) / 2 ? 1 : -1; // down for high notes, up for low
    ctx.strokeStyle = isPlaying ? settings.colors.notePlaying : settings.colors.noteDefault;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + (stemDirection < 0 ? -noteRadius : noteRadius), y);
    ctx.lineTo(x + (stemDirection < 0 ? -noteRadius : noteRadius), y + stemDirection * 30);
    ctx.stroke();
  }
  
  // Process MIDI data to extract note timing information
  function processMidiData(midiData) {
    const notes = [];
    
    if (!midiData || !midiData.track) return notes;
    
    const notesOn = {}; // Track active notes to find their end times
    
    // Process all MIDI events
    midiData.track.forEach(track => {
      if (!track.event) return;
      
      track.event.forEach(event => {
        // Note on event (type 9 with velocity > 0)
        if (event.type === 9 && event.data[1] > 0) {
          const midiNote = event.data[0];
          const velocity = event.data[1];
          const startTime = event.playTime || 0;
          
          // Track this note as active
          notesOn[midiNote] = { startTime, velocity };
        }
        
        // Note off event (type 8 or type 9 with velocity 0)
        if (event.type === 8 || (event.type === 9 && event.data[1] === 0)) {
          const midiNote = event.data[0];
          const endTime = event.playTime || 0;
          
          // If we've seen this note turned on before
          if (notesOn[midiNote]) {
            const { startTime, velocity } = notesOn[midiNote];
            const duration = endTime - startTime;
            
            notes.push({
              midiNote,
              startTime,
              duration,
              velocity
            });
            
            // Remove from active notes
            delete notesOn[midiNote];
          }
        }
      });
    });
    
    // Add any still-active notes with an estimated duration
    Object.keys(notesOn).forEach(midiNote => {
      const { startTime, velocity } = notesOn[midiNote];
      notes.push({
        midiNote: parseInt(midiNote),
        startTime,
        duration: 500, // Default to 500ms if no note-off was found
        velocity
      });
    });
    
    return notes;
  }

  return (
    <div className={styles.sheetMusicContainer}>
      <div className={styles.sheetMusicHeader}>Piano Score</div>
      <div className={styles.sheetMusicContent}>
        <canvas 
          ref={canvasRef} 
          className={styles.sheetMusicCanvas}
        />
      </div>
    </div>
  );
}
