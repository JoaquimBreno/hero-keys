import React, { useEffect, useRef, memo } from 'react';
import styles from './NotesVisualizer.module.css';

// Piano split point constant
const SPLIT_POINT = 60; // C4

// Use memo to prevent unnecessary re-renders
const NotesVisualizer = memo(function NotesVisualizer({ 
  midiData, 
  currentTime = 0, 
  keyPositions = {},
  lookaheadTime = 2000, // In milliseconds (3 seconds ahead)
  timingOffset = 0, // Add timing offset parameter with default value
  playedMidiNotes = [] // Add played MIDI notes from external device
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const activeNotesRef = useRef(new Set());
  const animationRef = useRef(null);
  const processedNotesRef = useRef(null); // Store processed notes in a ref
  const currentTimeRef = useRef(currentTime); // Store current time in ref (ms)
  const keyPositionsRef = useRef(keyPositions); // Store key positions in ref
  const lastFrameTimeRef = useRef(0); // Track last frame time to ensure consistent timing
  const lookaheadTimeRef = useRef(lookaheadTime); // Store lookahead time in ref (ms)
  const timingOffsetRef = useRef(timingOffset); // Store timing offset in ref
  const playedMidiNotesRef = useRef(playedMidiNotes); // Store played MIDI notes in ref
  
  // Update refs when props change without triggering renders
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  useEffect(() => {
    keyPositionsRef.current = keyPositions;
  }, [keyPositions]);
  
  useEffect(() => {
    lookaheadTimeRef.current = lookaheadTime;
  }, [lookaheadTime]);
  
  useEffect(() => {
    timingOffsetRef.current = timingOffset;
  }, [timingOffset]);
  
  useEffect(() => {
    playedMidiNotesRef.current = playedMidiNotes;
    
    // Create particles for newly played MIDI notes
    if (canvasRef.current && keyPositions) {
      const canvas = canvasRef.current;
      const canvasHeight = canvas.getBoundingClientRect().height;
      
      // Find newly played notes
      playedMidiNotes.forEach(note => {
        if (!activeNotesRef.current.has(note)) {
          createParticlesForNote(note, canvasHeight);
        }
      });
    }
  }, [playedMidiNotes, keyPositions]);
  
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
    
    // Sort notes by start time
    allNotes.sort((a, b) => a.startTime - b.startTime);
    
    processedNotesRef.current = allNotes;
    
    // Log the earliest and latest notes to help debug timing issues
    if (allNotes.length > 0) {
      const earliestNote = allNotes[0];
      const latestNote = allNotes[allNotes.length - 1];
      
      console.log("Earliest note starts at (ms):", earliestNote.startTime);
      console.log("Latest note starts at (ms):", latestNote.startTime);
      console.log("MIDI time range (ms):", latestNote.startTime - earliestNote.startTime);
    }
  }, [midiData]);
  
  useEffect(() => {
    if (!midiData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set up canvas dimensions
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.translate(0, 0);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Set up animation loop with precise timing
    const animate = (timestamp) => {
      // Use the actual timestamp to ensure consistent animation speed
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }
      
      const time = currentTimeRef.current;
      // console.log("Animation loop - Current time:", time);
      
      const positions = keyPositionsRef.current;
      const notes = processedNotesRef.current;
      
      if (!notes) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const canvasWidth = canvas.width / window.devicePixelRatio;
      const canvasHeight = canvas.height / window.devicePixelRatio;
      
      // Draw grid lines aligned with piano keys
      drawPianoAlignedGrid(ctx, canvasWidth, canvasHeight, positions);
      
      // Draw notes
      drawNotes(ctx, notes, time, canvasWidth, canvasHeight, positions);
      
      // Update particles
      updateAndDrawParticles(ctx);
      
      // Check for newly active notes
      checkActiveNotes(notes, time, positions, canvasHeight);
      
      lastFrameTimeRef.current = timestamp;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [midiData]); // Only depends on midiData changing
  
  // Check for active notes and create particles - integrated into animation loop
  function checkActiveNotes(processedNotes, currentTime, keyPositions, canvasHeight) {
    if (!processedNotes || Object.keys(keyPositions).length === 0) return;
    
    // Apply timing offset for consistent synchronization
    const adjustedTime = currentTime + timingOffsetRef.current;
    
    // Find currently active notes with precise time comparison
    const currentlyActive = new Set();
    // console.log("Checking active notes - Current time:", currentTime, "Adjusted time:", adjustedTime);
    
    // Add notes from the MIDI sequence
    processedNotes.forEach(note => {
      // More precise comparison with consistent offset
      if (note.startTime <= adjustedTime && note.endTime >= adjustedTime) {
        currentlyActive.add(note.note);
        
        // If this note wasn't active before, create particles
        if (!activeNotesRef.current.has(note.note)) {
          createParticlesForNote(note.note, canvasHeight);
        }
      }
    });
    
    // Add notes from MIDI device input
    playedMidiNotesRef.current.forEach(note => {
      currentlyActive.add(note);
    });
    
    // Update the ref for the next check
    activeNotesRef.current = currentlyActive;
  }
  
  // Draw grid lines aligned with piano keys
  function drawPianoAlignedGrid(ctx, width, height, keyPositions) {
    if (Object.keys(keyPositions).length === 0) {
      return; // No key positions available yet
    }
    
    // Draw vertical grid lines for each key
    Object.entries(keyPositions).forEach(([noteNumber, keyInfo]) => {
      const x = keyInfo.x;
      const isBlack = keyInfo.isBlack;
      
      // Set grid line style based on whether it's a white or black key
      ctx.strokeStyle = isBlack ? 'rgba(100, 100, 100, 0.1)' : 'rgba(200, 200, 200, 0.1)';
      ctx.lineWidth = isBlack ? 1 : 1.5;
      
      // Draw vertical line from top to bottom
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
    
    // Draw horizontal time markers (keep the existing horizontal grid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const stepSize = height / 10; // Dynamically space horizontal lines based on height
    for (let i = 0; i < height; i += stepSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  }
  
  // Process MIDI data into a suitable format for visualization
  function processMidiData(midiData) {
    // Extract all note-on and note-off events
    console.log("Processing MIDI data - Tracks:", midiData.track.length);
    const allEvents = midiData.track.flatMap(track => 
      track.event.filter(event => event.type === 9 || event.type === 8)
    );
    
    // Calculate absolute time for each event
    let absoluteEvents = [];
    let currentAbsoluteTime = 0;
    
    // Log the first few delta times to help diagnose early note issues
    if (allEvents.length > 0) {
      console.log("First 5 delta times (ms):", allEvents.slice(0, 5).map(e => e.deltaTime));
    }
    
    allEvents.forEach(event => {
      currentAbsoluteTime += event.deltaTime;
      absoluteEvents.push({
        ...event,
        absoluteTime: currentAbsoluteTime,
        isNoteOn: event.type === 9 && event.data[1] > 0,
        note: event.data[0],
        velocity: event.data[1]
      });
    });
    
    // Match note-on with note-off events to create note objects
    const notes = [];
    const activeNotes = {};
    
    absoluteEvents.forEach(event => {
      const noteId = event.note;
      
      if (event.isNoteOn) {
        // Start of note
        activeNotes[noteId] = {
          note: noteId,
          velocity: event.velocity,
          startTime: event.absoluteTime,
          endTime: null
        };
      } else {
        // End of note
        if (activeNotes[noteId]) {
          const note = activeNotes[noteId];
          note.endTime = event.absoluteTime;
          notes.push(note);
          delete activeNotes[noteId];
        }
      }
    });
    
    // Add any notes that didn't have a note-off event
    Object.values(activeNotes).forEach(note => {
      note.endTime = note.startTime + 1000; // Default duration
      notes.push(note);
    });
    
    console.log("Processed MIDI data - Notes:", notes.length);
    
    // If there are notes, log the first few to check timing
    if (notes.length > 0) {
      const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
      console.log("First 5 notes timing (ms):", sortedNotes.slice(0, 5).map(n => ({ 
        note: n.note, 
        start: n.startTime, 
        end: n.endTime,
        duration: n.endTime - n.startTime
      })));
    }
    
    return notes;
  }
  
  // Draw grid lines for visual reference
  function drawGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Draw horizontal time markers
    for (let i = 0; i < height; i += 100) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  }
  
  // Draw all visible notes
  function drawNotes(ctx, notes, currentTime, width, height, keyPositions) {
    const timeWindow = lookaheadTimeRef.current;
    const pixelsPerMs = height / timeWindow;
    
    // Apply timing offset for consistent synchronization
    const adjustedTime = currentTime + timingOffsetRef.current;
    
    // console.log("Drawing notes - Current time (ms):", currentTime, "Adjusted time:", adjustedTime);
    
    // Sort notes by start time to handle overlaps correctly
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    
    // Optimize rendering by only processing notes that will be visible
    const visibleNotes = sortedNotes.filter(note => 
      note.endTime >= adjustedTime - 2000 && note.startTime <= adjustedTime + timeWindow
    );
    
    // Count notes that are shown for debugging
    let shownNotes = visibleNotes.length;
    let skippedNotes = sortedNotes.length - visibleNotes.length;
    
    visibleNotes.forEach(note => {
      // Get position from key positions map
      const keyInfo = keyPositions[note.note];
      
      if (!keyInfo) return; // Skip notes that don't have a corresponding key
      
      const isBlack = keyInfo.isBlack;
      const x = keyInfo.x;
      const width = keyInfo.width * 0.85; // Slightly narrower than the actual key
      const isLeftHand = note.note < SPLIT_POINT;
      
      // Calculate position using adjusted time
      const timeToPlay = note.startTime - adjustedTime;
      const startY = height - (timeToPlay * pixelsPerMs);
      const endY = height - ((note.endTime - adjustedTime) * pixelsPerMs);
      
      const noteHeight = Math.max(startY - endY, 5); // Ensure a minimum height
      
      // Determine if note is currently being played with adjusted time
      const isActive = note.startTime <= adjustedTime && note.endTime >= adjustedTime;
      
      // Also check if this note is being played via MIDI
      const isPlayedViaMidi = playedMidiNotesRef.current.includes(note.note);
      
      // Only draw if at least part of the note is visible
      if (!(startY < 0 || endY > height)) {
        // Draw the note
        ctx.beginPath();
        
        // Draw a rounded rectangle
        const radius = 5;
        const left = x - width / 2;
        const right = x + width / 2;
        const top = Math.min(endY, startY - noteHeight);
        const bottom = startY;
        
        // Only draw if at least part of the note is visible
        if (!(bottom < 0 || top > height)) {
          // Set colors based on note type, state and hand position
          if (isActive || isPlayedViaMidi) {
            // Glowing active note
            ctx.fillStyle = isLeftHand ? '#00e873' : '#00d9e8';
            ctx.shadowColor = isLeftHand ? '#00e873' : '#00d9e8';
            ctx.shadowBlur = 10;
          } else {
            // Regular note with hand position color
            ctx.fillStyle = isBlack ? (isLeftHand ? '#2a563a' : '#2a4956') : (isLeftHand ? '#e0f5ea' : '#e0f0f5');
            ctx.shadowBlur = 0;
          }
          
          ctx.strokeStyle = isBlack ? '#555' : '#e3e3e3';
          ctx.lineWidth = 1;
          
          // Draw rounded rectangle
          ctx.moveTo(left + radius, top);
          ctx.lineTo(right - radius, top);
          ctx.quadraticCurveTo(right, top, right, top + radius);
          ctx.lineTo(right, bottom - radius);
          ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
          ctx.lineTo(left + radius, bottom);
          ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
          ctx.lineTo(left, top + radius);
          ctx.quadraticCurveTo(left, top, left + radius, top);
          
          ctx.fill();
          ctx.stroke();
          
          // Remove shadow effect to avoid affecting other drawings
          ctx.shadowBlur = 0;
          
          // Add a highlight line to the top of active notes
          if (isActive) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(left + 2, bottom);
            ctx.lineTo(right - 2, bottom);
            ctx.stroke();
          }
        }
      }
    });
    
    // Draw MIDI played notes that aren't part of the sequence
    playedMidiNotesRef.current.forEach(noteNumber => {
      const keyInfo = keyPositions[noteNumber];
      if (!keyInfo) return; // Skip if no position information
      
      const isBlack = keyInfo.isBlack;
      const x = keyInfo.x;
      const noteWidth = keyInfo.width * 0.85;
      const isLeftHand = noteNumber < SPLIT_POINT;
      
      // Draw at the bottom of the canvas (real-time played)
      ctx.beginPath();
      const radius = 5;
      const left = x - noteWidth / 2;
      const right = x + noteWidth / 2;
      const bottom = height;
      const top = height - 30; // Fixed height for played notes
      
      // Glowing effect for played notes with color based on hand position
      ctx.fillStyle = isLeftHand ? '#00e873' : '#00d9e8';
      ctx.shadowColor = isLeftHand ? '#00e873' : '#00d9e8';
      ctx.shadowBlur = 15;
      
      // Draw rounded rectangle
      ctx.moveTo(left + radius, top);
      ctx.lineTo(right - radius, top);
      ctx.quadraticCurveTo(right, top, right, top + radius);
      ctx.lineTo(right, bottom - radius);
      ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
      ctx.lineTo(left + radius, bottom);
      ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
      ctx.lineTo(left, top + radius);
      ctx.quadraticCurveTo(left, top, left + radius, top);
      
      ctx.fill();
      
      // Remove shadow effect to avoid affecting other drawings
      ctx.shadowBlur = 0;
    });
    
    // Log how many notes are being shown vs skipped
    // console.log(`Notes rendered: ${shownNotes}, skipped: ${skippedNotes}`);
  }
  
  // Create particles for a newly activated note
  function createParticlesForNote(noteNumber, canvasHeight) {
    if (!keyPositions[noteNumber]) return;
    
    const x = keyPositions[noteNumber].x;
    const numParticles = 20;
    
    // Set color based on split point
    const color = noteNumber < SPLIT_POINT ? '#00e873' : '#00d9e8';
    
    for (let i = 0; i < numParticles; i++) {
      particlesRef.current.push({
        x: x + (Math.random() * 20 - 10),
        y: canvasHeight - (Math.random() * 15),
        vx: Math.random() * 4 - 2,
        vy: -Math.random() * 5 - 2,
        radius: Math.random() * 3 + 1,
        alpha: 1,
        color: color
      });
    }
  }
  
  // Update and draw all particles
  function updateAndDrawParticles(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    
    // Update and filter particles
    particlesRef.current = particlesRef.current
      .filter(p => p.alpha > 0)
      .map(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Add gravity
        particle.vy += 0.1;
        
        // Fade out
        particle.alpha -= 0.02;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        
        // Create gradient for glow effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius
        );
        
        // Use the particle's color
        const color = particle.color || '#00d9e8'; // Default to blue if color not set
        gradient.addColorStop(0, `rgba(${hexToRgb(color)}, ${particle.alpha})`);
        gradient.addColorStop(1, `rgba(${hexToRgb(color)}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        return particle;
      });
    
    ctx.globalCompositeOperation = 'source-over';
  }
  
  // Helper function to convert hex to RGB
  function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }
  
  return (
    <div className={styles.visualizerContainer}>
      <canvas ref={canvasRef} className={styles.visualizerCanvas} />
    </div>
  );
});

export default NotesVisualizer;