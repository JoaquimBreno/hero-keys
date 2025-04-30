'use client';

import { useEffect, useState } from 'react';
import styles from './CustomCursor.module.css';

export default function CustomCursor() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if it's a touch device
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouch();
    
    if (typeof window !== 'undefined' && !isTouchDevice) {
      const cursor = document.getElementById('cursor');
      const glow = document.getElementById('glow');
      
      // Hide default cursor
      document.body.style.cursor = 'none';
      
      const handleMouseMove = (e) => {
        if (cursor && glow) {
          cursor.style.left = `${e.clientX}px`;
          cursor.style.top = `${e.clientY}px`;
          
          glow.style.left = `${e.clientX}px`;
          glow.style.top = `${e.clientY}px`;
        }
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      
      // Enlarge cursor on interactive elements
      const interactiveElements = document.querySelectorAll('a, button, .browse-button, input[type="file"]');
      
      const handleMouseEnter = () => {
        if (cursor) {
          cursor.style.width = '40px';
          cursor.style.height = '40px';
          cursor.style.borderColor = 'var(--primary-color)';
          cursor.classList.add(styles.active);
        }
      };
      
      const handleMouseLeave = () => {
        if (cursor) {
          cursor.style.width = '30px';
          cursor.style.height = '30px';
          cursor.style.borderColor = 'var(--text-secondary)';
          cursor.classList.remove(styles.active);
        }
      };
      
      interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
      });
      
      // Cleanup
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        
        interactiveElements.forEach(el => {
          el.removeEventListener('mouseenter', handleMouseEnter);
          el.removeEventListener('mouseleave', handleMouseLeave);
        });
        
        // Restore default cursor
        document.body.style.cursor = 'auto';
      };
    }
  }, [isTouchDevice]);

  if (isTouchDevice) return null;

  return (
    <>
      <div className={styles.cursor} id="cursor"></div>
      <div className={styles.glowEffect} id="glow"></div>
    </>
  );
}