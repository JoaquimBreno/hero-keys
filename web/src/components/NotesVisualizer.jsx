import React, { useEffect, useRef, memo } from 'react';
import styles from './NotesVisualizer.module.css';

// Use memo to prevent unnecessary re-renders
const NotesVisualizer = memo(function NotesVisualizer({ 
  midiData, 
  currentTime = 0, 
  keyPositions = {},
  timeOffset = 0, // Add configurable time offset instead of hardcoded value
  lookaheadTime = 2000, // Reduced from 10000ms to 3000ms (3 seconds ahead)
  verticalOffset = 0 // Fine-tune vertical position of notes
}) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const activeNotesRef = useRef(new Set());
  const animationRef = useRef(null);
  const processedNotesRef = useRef(null); // Store processed notes in a ref
  const currentTimeRef = useRef(currentTime); // Store current time in ref
  const keyPositionsRef = useRef(keyPositions); // Store key positions in ref
  const lastFrameTimeRef = useRef(0); // Track last frame time to ensure consistent timing
  const lookaheadTimeRef = useRef(lookaheadTime); // Store lookahead time in ref
  
  // Update refs when props change without triggering renders
  useEffect(() => {
    currentTimeRef.current = currentTime + timeOffset;
  }, [currentTime, timeOffset]);
  
  useEffect(() => {
    keyPositionsRef.current = keyPositions;
  }, [keyPositions]);
  
  useEffect(() => {
    lookaheadTimeRef.current = lookaheadTime;
  }, [lookaheadTime]);
  
  // Process MIDI data only when it changes
  useEffect(() => {
    if (midiData) {
      processedNotesRef.current = processMidiData(midiData);
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
    
    // Find currently active notes
    const currentlyActive = new Set();
    
    processedNotes.forEach(note => {
      if (note.startTime <= currentTime && note.endTime >= currentTime) {
        currentlyActive.add(note.note);
        
        // If this note wasn't active before, create particles
        if (!activeNotesRef.current.has(note.note)) {
          createParticlesForNote(note.note, canvasHeight);
        }
      }
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
    const allEvents = midiData.track.flatMap(track => 
      track.event.filter(event => event.type === 9 || event.type === 8)
    );
    
    // Calculate absolute time for each event
    let absoluteEvents = [];
    let currentAbsoluteTime = 0;
    
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
    
    // Sort notes by start time to handle overlaps correctly
    const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    
    sortedNotes.forEach(note => {
      // Only draw notes within our time window (with some margin)
      if (note.endTime < currentTime - 500 || note.startTime > currentTime + timeWindow) {
        return;
      }
      
      // Get position from key positions map
      const keyInfo = keyPositions[note.note];
      
      if (!keyInfo) return; // Skip notes that don't have a corresponding key
      
      const isBlack = keyInfo.isBlack;
      const x = keyInfo.x;
      const width = keyInfo.width * 0.85; // Slightly narrower than the actual key
      
      // Precise alignment: 
      // - When note.startTime === currentTime, startY should be exactly height (bottom of canvas)
      // - When note.startTime === currentTime + timeWindow, startY should be 0 (top of canvas)
      const timeToPlay = note.startTime - currentTime;
      const startY = height - (timeToPlay * pixelsPerMs);
      const endY = height - ((note.endTime - currentTime) * pixelsPerMs);
      
      const noteHeight = Math.max(startY - endY, 5); // Ensure a minimum height
      
      // Determine if note is currently being played
      const isActive = note.startTime <= currentTime && note.endTime >= currentTime;
      
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
        // Set colors based on note type and state
        if (isActive) {
          // Glowing active note
          ctx.fillStyle = isBlack ? '#00d9e8' : '#00d9e8';
          ctx.shadowColor = '#00d9e8';
          ctx.shadowBlur = 10;
        } else {
          // Regular note
          ctx.fillStyle = isBlack ? '#333' : '#fff';
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
    });
  }
  
  // Create particles for a newly activated note
  function createParticlesForNote(noteNumber, canvasHeight) {
    if (!keyPositions[noteNumber]) return;
    
    const x = keyPositions[noteNumber].x;
    const numParticles = 20;
    
    for (let i = 0; i < numParticles; i++) {
      particlesRef.current.push({
        x: x + (Math.random() * 20 - 10),
        y: canvasHeight - (Math.random() * 15),
        vx: Math.random() * 4 - 2,
        vy: -Math.random() * 5 - 2,
        radius: Math.random() * 3 + 1,
        alpha: 1,
        color: '#00d9e8'
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
        gradient.addColorStop(0, `rgba(0, 217, 232, ${particle.alpha})`);
        gradient.addColorStop(1, `rgba(0, 217, 232, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        return particle;
      });
    
    ctx.globalCompositeOperation = 'source-over';
  }
  
  return (
    <div className={styles.visualizerContainer}>
      <canvas ref={canvasRef} className={styles.visualizerCanvas} />
    </div>
  );
});

export default NotesVisualizer;