import React, { useEffect, useRef } from 'react';
import styles from './FireEffect.module.css';

export default function FireEffect({ active }) {
  const containerRef = useRef(null);
  const fireParticlesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Initialize and animate fire effect
  useEffect(() => {
    if (!active) return;
    
    const container = containerRef.current;
    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;
    
    // Create fire particles
    const particleCount = Math.floor(canvasWidth / 15); // Adjust density based on width
    createInitialParticles(particleCount, canvasWidth, canvasHeight);
    
    // Start animation loop
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animateParticles);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      fireParticlesRef.current = [];
    };
  }, [active]);
  
  const createInitialParticles = (count, width, height) => {
    const particles = [];
    
    for (let i = 0; i < count; i++) {
      // Create particles along the bottom edge
      particles.push(createParticle(width, height));
    }
    
    fireParticlesRef.current = particles;
  };
  
  const createParticle = (width, height) => {
    // Random position along the bottom of the container
    const x = Math.random() * width;
    const y = height + Math.random() * 20; // Start slightly below the bottom
    
    // Size and movement parameters
    const size = Math.random() * 40 + 20; // Particle size
    const speedY = Math.random() * 3 + 2; // Upward speed
    const speedX = (Math.random() - 0.5) * 2; // Slight horizontal movement
    const lifespan = Math.random() * 1.5 + 1; // Seconds to live
    const opacityVariance = Math.random() * 0.3 + 0.7; // Opacity variation
    
    return {
      x,
      y,
      initialY: y,
      size,
      speedY,
      speedX,
      lifespan: lifespan * 1000, // Convert to milliseconds
      birth: performance.now(),
      opacity: opacityVariance,
      hue: Math.random() * 30 + 200, // Blue fire hue (200-230)
    };
  };
  
  const animateParticles = (timestamp) => {
    if (!containerRef.current || !active) return;
    
    const container = containerRef.current;
    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;
    const delta = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;
    
    // Update existing particles
    const particles = fireParticlesRef.current.map(particle => {
      // Calculate how long the particle has lived
      const age = timestamp - particle.birth;
      
      // Update position based on time delta for consistent movement
      particle.y -= particle.speedY * (delta / 16);
      particle.x += particle.speedX * (delta / 16);
      
      // Calculate life percentage (0 to 1)
      const lifePercentage = age / particle.lifespan;
      
      // Update opacity based on life percentage - fade out towards the end of life
      particle.opacity = Math.max(0, particle.opacity * (1 - lifePercentage * 0.8));
      
      // Decrease size as it rises
      particle.size = Math.max(5, particle.size * (1 - lifePercentage * 0.4));
      
      return particle;
    });
    
    // Filter out dead particles
    const liveParticles = particles.filter(particle => {
      const age = timestamp - particle.birth;
      return age < particle.lifespan && particle.y > -particle.size;
    });
    
    // Add new particles if needed
    const neededParticles = Math.floor(canvasWidth / 15) - liveParticles.length;
    if (neededParticles > 0) {
      for (let i = 0; i < neededParticles; i++) {
        liveParticles.push(createParticle(canvasWidth, canvasHeight));
      }
    }
    
    // Update the particles ref
    fireParticlesRef.current = liveParticles;
    
    // Apply CSS variables for all particles
    updateParticleStyles(liveParticles);
    
    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animateParticles);
  };
  
  const updateParticleStyles = (particles) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Remove all existing particle elements
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Create new particle elements
    particles.forEach((particle, index) => {
      const particleElement = document.createElement('div');
      particleElement.className = styles.particle;
      
      // Apply styles
      particleElement.style.width = `${particle.size}px`;
      particleElement.style.height = `${particle.size * 1.5}px`;
      particleElement.style.left = `${particle.x}px`;
      particleElement.style.bottom = `${containerRef.current.clientHeight - particle.y}px`;
      particleElement.style.opacity = particle.opacity;
      particleElement.style.background = `radial-gradient(ellipse at center, 
        hsla(${particle.hue}, 100%, 70%, ${particle.opacity}) 0%, 
        hsla(${particle.hue - 10}, 100%, 50%, ${particle.opacity * 0.8}) 50%, 
        hsla(${particle.hue - 20}, 100%, 30%, 0) 100%)`;
      
      container.appendChild(particleElement);
    });
  };
  
  return (
    <div className={`${styles.fireEffectContainer} ${active ? styles.active : ''}`}>
      <div ref={containerRef} className={styles.particleContainer}></div>
      <div className={styles.blueGlow}></div>
    </div>
  );
}
