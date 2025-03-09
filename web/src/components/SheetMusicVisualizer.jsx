import React, { useEffect, useRef } from 'react';
import styles from './SheetMusicVisualizer.module.css';

export default function SheetMusicVisualizer({ midiData, currentTime }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !midiData) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth;
    const height = canvas.height = canvas.clientHeight;
    
    // Constants for music notation
    const staffHeight = 40;
    const lineSpacing = 10;
    const staffMargin = 60;
    const noteRadius = 6;
    const scrollSpeed = 2;
    let animationFrame;
    
    const drawSheetMusic = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw treble and bass staves
      drawStaves();
      
      // Draw "now" line indicator
      const nowLineX = width * 0.2; // Position the "now" line at 20% from the left
      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nowLineX, 0);
      ctx.lineTo(nowLineX, height);
      ctx.stroke();
      
      // Draw notes based on current MIDI data
      if (midiData && midiData.track) {
        const currentTimeMs = currentTime;
        const pastTimeWindow = 1000;  // Show notes up to 1 second behind
        const futureTimeWindow = 4000; // Show notes 4 seconds ahead
        
        midiData.track.forEach(track => {
          if (track.event) {
            track.event.forEach(event => {
              // Process note on events (type 9 = note on)
              if (event.type === 9 && event.data[1] > 0) {
                const noteTime = event.playTime || 0;
                const midiNote = event.data[0];
                const noteDuration = getNoteEndTime(track.event, event) - noteTime;
                
                // Draw notes that are past, current, and future within our window
                if (noteTime > currentTimeMs - pastTimeWindow && 
                    noteTime < currentTimeMs + futureTimeWindow) {
                  
                  // Calculate x position based on time difference from current time
                  const timeOffset = noteTime - currentTimeMs;
                  const x = nowLineX + (timeOffset / futureTimeWindow * width * 0.7);
                  
                  // Determine if the note is currently playing
                  const isPlaying = (noteTime <= currentTimeMs && 
                                    (noteTime + noteDuration) >= currentTimeMs);
                  
                  // Draw the note on the appropriate staff with status indication
                  drawNote(x, midiNote, isPlaying);
                }
              }
            });
          }
        });
      }
      
      animationFrame = requestAnimationFrame(drawSheetMusic);
    };
    
    // Helper function to find note duration by looking for its note-off event
    function getNoteEndTime(events, noteOnEvent) {
      const noteNumber = noteOnEvent.data[0];
      const startIndex = events.indexOf(noteOnEvent);
      
      // Look for a note off event (type 8 or type 9 with velocity 0)
      for (let i = startIndex + 1; i < events.length; i++) {
        const evt = events[i];
        if ((evt.type === 8 || (evt.type === 9 && evt.data[1] === 0)) && 
            evt.data[0] === noteNumber) {
          return evt.playTime || 0;
        }
      }
      
      // If no note-off found, estimate duration as 500ms
      return (noteOnEvent.playTime || 0) + 500;
    }
    
    function drawStaves() {
      // Draw treble clef staff (top)
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      
      // Treble clef (top staff)
      const trebleY = height * 0.3;
      for (let i = 0; i < 5; i++) {
        const y = trebleY + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Bass clef (bottom staff)
      const bassY = height * 0.7;
      for (let i = 0; i < 5; i++) {
        const y = bassY + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Draw clef symbols
      ctx.fillStyle = '#fff';
      ctx.font = '60px serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      // Treble clef symbol
      ctx.fillText('𝄞', 10, trebleY); 
      
      // Bass clef symbol
      ctx.fillText('𝄢', 10, bassY + lineSpacing);
      
      // Draw middle C ledger line
      ctx.beginPath();
      ctx.moveTo(50, trebleY + 5 * lineSpacing + lineSpacing);
      ctx.lineTo(100, trebleY + 5 * lineSpacing + lineSpacing);
      ctx.stroke();
    }
    
    function drawNote(x, midiNote, isPlaying) {
      // Middle C is MIDI note 60, position notes relative to that
      const trebleY = height * 0.3;
      const bassY = height * 0.7;
      
      // Decide which staff to draw on
      let y;
      
      if (midiNote >= 60) {
        // Treble clef (higher notes)
        // Middle C is 1 ledger line below treble staff
        const stepsFromMiddleC = midiNote - 60;
        y = trebleY + 5 * lineSpacing - stepsFromMiddleC * lineSpacing / 2;
      } else {
        // Bass clef (lower notes)
        // Middle C is 1 ledger line above bass staff
        const stepsFromMiddleC = 60 - midiNote;
        y = bassY - lineSpacing + stepsFromMiddleC * lineSpacing / 2;
      }
      
      // Draw ledger lines if needed
      if (midiNote >= 60) {
        // Ledger lines above treble staff
        if (y < trebleY - lineSpacing) {
          const linesNeeded = Math.floor((trebleY - y) / lineSpacing) + 1;
          for (let i = 1; i <= linesNeeded; i++) {
            const lineY = trebleY - i * lineSpacing;
            if (Math.abs(y - lineY) < 2) {
              ctx.beginPath();
              ctx.moveTo(x - 10, lineY);
              ctx.lineTo(x + 10, lineY);
              ctx.stroke();
            }
          }
        }
        // Ledger lines below treble staff
        if (y > trebleY + 4 * lineSpacing) {
          const linesNeeded = Math.floor((y - trebleY - 4 * lineSpacing) / lineSpacing) + 1;
          for (let i = 1; i <= linesNeeded; i++) {
            const lineY = trebleY + 4 * lineSpacing + i * lineSpacing;
            if (Math.abs(y - lineY) < 2) {
              ctx.beginPath();
              ctx.moveTo(x - 10, lineY);
              ctx.lineTo(x + 10, lineY);
              ctx.stroke();
            }
          }
        }
      } else {
        // Ledger lines above bass staff
        if (y < bassY - lineSpacing) {
          const linesNeeded = Math.floor((bassY - y) / lineSpacing) + 1;
          for (let i = 1; i <= linesNeeded; i++) {
            const lineY = bassY - i * lineSpacing;
            if (Math.abs(y - lineY) < 2) {
              ctx.beginPath();
              ctx.moveTo(x - 10, lineY);
              ctx.lineTo(x + 10, lineY);
              ctx.stroke();
            }
          }
        }
        // Ledger lines below bass staff
        if (y > bassY + 4 * lineSpacing) {
          const linesNeeded = Math.floor((y - bassY - 4 * lineSpacing) / lineSpacing) + 1;
          for (let i = 1; i <= linesNeeded; i++) {
            const lineY = bassY + 4 * lineSpacing + i * lineSpacing;
            if (Math.abs(y - lineY) < 2) {
              ctx.beginPath();
              ctx.moveTo(x - 10, lineY);
              ctx.lineTo(x + 10, lineY);
              ctx.stroke();
            }
          }
        }
      }
      
      // Draw note head with different color based on playing status
      ctx.fillStyle = isPlaying ? '#ff5252' : '#00d9e8';
      ctx.beginPath();
      ctx.ellipse(x, y, noteRadius, noteRadius * 0.8, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw stem (for notes that need it)
      const stemDirection = y < (trebleY + bassY) / 2 ? 1 : -1; // down for high notes, up for low
      ctx.strokeStyle = isPlaying ? '#ff5252' : '#00d9e8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + (stemDirection < 0 ? -noteRadius : noteRadius), y);
      ctx.lineTo(x + (stemDirection < 0 ? -noteRadius : noteRadius), y + stemDirection * 30);
      ctx.stroke();
    }
    
    // Start animation
    drawSheetMusic();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [midiData, currentTime]);
  
  return (
    <div className={styles.sheetMusicContainer}>
      <div className={styles.sheetMusicHeader}>Piano Score</div>
      <canvas ref={canvasRef} className={styles.sheetMusicCanvas} />
    </div>
  );
}
