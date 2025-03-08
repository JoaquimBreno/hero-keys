    // NotesVisualizer.jsx
import React, { useEffect, useRef } from 'react';
import styles from './NotesVisualizer.module.css';

export default function NotesVisualizer({ midiData, currentTime = 0 }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  
  // Setup canvas and animation
  useEffect(() => {
    if (!midiData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Process MIDI data
    const noteEvents = midiData.track.flatMap(track => 
      track.event
        .filter(event => event.type === 9 || event.type === 8)
        .map(event => ({
          ...event,
          isNoteOn: event.type === 9 && event.data[1] > 0,
          note: event.data[0],
          velocity: event.data[1]
        }))
    );
    
    // Calculate absolute times for all events
    let absoluteEvents = [];
    let currentAbsoluteTime = 0;
    
    noteEvents.forEach(event => {
      currentAbsoluteTime += event.deltaTime;
      absoluteEvents.push({
        ...event,
        absoluteTime: currentAbsoluteTime
      });
    });
    
    // Set up note-on events in a format easier to visualize
    const noteOns = absoluteEvents
      .filter(event => event.isNoteOn)
      .map(event => {
        // Find corresponding note-off
        const noteOff = absoluteEvents.find(e => 
          !e.isNoteOn && 
          e.note === event.note && 
          e.absoluteTime > event.absoluteTime
        );
        
        return {
          note: event.note,
          startTime: event.absoluteTime,
          endTime: noteOff ? noteOff.absoluteTime : event.absoluteTime + 1000,
          velocity: event.velocity
        };
      });
    
    // Create particles when notes are played
    const createParticles = (note) => {
      const numberOfParticles = 20;
      const centerX = mapNoteToX(note);
      
      for (let i = 0; i < numberOfParticles; i++) {
        particlesRef.current.push({
          x: centerX + (Math.random() * 20 - 10),
          y: canvas.height - 20 - (Math.random() * 10),
          vx: Math.random() * 4 - 2,
          vy: -Math.random() * 3 - 2,
          radius: Math.random() * 3 + 1,
          alpha: 1,
          color: '#00d9e8'
        });
      }
    };
    
    // Map MIDI note to x position
    const mapNoteToX = (midiNote) => {
      const totalNotes = 88; // Full piano range
      const lowestNote = 21; // A0
      
      // Calculate position as percentage of canvas width
      const position = (midiNote - lowestNote) / totalNotes;
      return position * canvas.width;
    };
    
    // Map MIDI note to width
    const getNoteWidth = (isBlack) => {
      return isBlack ? 10 : 20;
    };
    
    // Check if note is black key
    const isBlackKey = (midiNote) => {
      const note = midiNote % 12;
      return [1, 3, 6, 8, 10].includes(note);
    };
    
    // Draw notes and particles
    const render = (time) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw falling notes
      const lookAheadTime = currentTime + 3000; // Show notes 3 seconds ahead
      
      noteOns.forEach(note => {
        // Only draw notes in our time window
        if (note.startTime > lookAheadTime || note.endTime < currentTime - 500) return;
        
        const isBlack = isBlackKey(note.note);
        const x = mapNoteToX(note.note);
        const width = getNoteWidth(isBlack);
        const height = (note.endTime - note.startTime) / 15;
        
        // Calculate y position based on time
        const startY = canvas.height - ((note.startTime - currentTime) / 15);
        const endY = startY - height;
        
        // Only draw if visible on canvas
        if (endY < canvas.height + 50) {
          // Draw note
          ctx.fillStyle = isBlack ? '#333' : '#fff';
          ctx.strokeStyle = '#00d9e8';
          ctx.lineWidth = 2;
          
          // Check if note is currently being played
          const isActive = note.startTime <= currentTime && note.endTime >= currentTime;
          if (isActive) {
            ctx.fillStyle = '#00d9e8';
            
            // Create particles for newly activated notes
            if (note.startTime <= currentTime && note.startTime > currentTime - 50) {
              createParticles(note.note);
            }
          }
        // Draw rounded rectangle
          ctx.beginPath();
          const radius = 4;
          ctx.moveTo(x - width/2 + radius, endY);
          ctx.lineTo(x + width/2 - radius, endY);
          ctx.quadraticCurveTo(x + width/2, endY, x + width/2, endY + radius);
          ctx.lineTo(x + width/2, startY - radius);
          ctx.quadraticCurveTo(x + width/2, startY, x + width/2 - radius, startY);
          ctx.lineTo(x - width/2 + radius, startY);
          ctx.quadraticCurveTo(x - width/2, startY, x - width/2, startY - radius);
          ctx.lineTo(x - width/2, endY + radius);
          ctx.quadraticCurveTo(x - width/2, endY, x - width/2 + radius, endY);
          ctx.closePath();
          
          ctx.fill();
          ctx.stroke();
        }
      });
      
      // Update and draw particles
      ctx.globalCompositeOperation = 'lighter';
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      
      particlesRef.current.forEach(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Gravity effect
        particle.vy += 0.05;
        
        // Fade out
        particle.alpha -= 0.02;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.closePath();
        
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius
        );
        gradient.addColorStop(0, `rgba(0, 217, 232, ${particle.alpha})`);
        gradient.addColorStop(1, `rgba(0, 217, 232, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [midiData, currentTime]);
  
  return (
    <div className={styles.visualizerContainer}>
      <canvas ref={canvasRef} className={styles.visualizerCanvas} />
    </div>
  );
}