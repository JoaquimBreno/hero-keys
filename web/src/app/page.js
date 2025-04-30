// FILE: page.js
'use client';
import React from 'react';
import PianoVisualizer from '@/components/PianoVisualizer.jsx';

export default function Home() {
  return (
    <div className="container" style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '95vh',
      overflowY: 'hidden',
      justifyContent: 'space-between',
    }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.8rem 2rem',
        backgroundColor: 'rgba(18, 18, 18, 0.85)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 15px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        width: '100%',
        zIndex: 10,
        borderBottom: '1px solid',
        borderImage: 'linear-gradient(90deg, rgba(80, 80, 80, 0.05), rgba(150, 150, 150, 0.3), rgba(80, 80, 80, 0.05)) 1',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none'
      }}>
        <div className="logo-container" style={{
          display: 'flex',
          alignItems: 'center',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.8rem',
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '0.5px',
            fontFamily: "'Inter', sans-serif",
          }}>
            HeroKeys <span style={{ fontSize: '1.4rem' }}>🎹</span>
          </h1>
        </div>
        
        <div style={{
          height: '24px',
          width: '1px',
          background: 'linear-gradient(to bottom, transparent, rgba(180, 180, 180, 0.3), transparent)',
          margin: '0 1.5rem'
        }}></div>
        
        <p style={{
          margin: 0,
          fontSize: '0.95rem',
          color: '#bbb',
          fontWeight: 400,
          maxWidth: '500px',
          lineHeight: '1.4'
        }}>
          Visualização profissional de MIDI para performances musicais refinadas
        </p>
      </header>

      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1
      }}>
        <PianoVisualizer />
      </main>

      <footer style={{
        width: '100%',
        padding: '0!important',
        textAlign: 'center'
      }}>
        <p>© {new Date().getFullYear()} Moises Inc. Todos os direitos reservados</p>
      </footer>
    </div>
  );
}