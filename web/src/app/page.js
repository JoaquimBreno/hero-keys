// FILE: page.js
'use client';
import React from 'react';
import AudioDragDrop from '@/components/AudioDragDrop.jsx';
import PianoVisualizer from '@/components/PianoVisualizer.jsx';

export default function Home() {
  return (
    <div className="container">
      <header>
        <div className="logo">Moises Piano Visualizer</div>
        <p>Visualize suas músicas MIDI com animações elegantes em estilo neon</p>
      </header>

      <AudioDragDrop/>
      {/* <PianoVisualizer /> */}

      <footer>
        <p>© {new Date().getFullYear()} Moises Inc. Todos os direitos reservados</p>
      </footer>
    </div>
  );
}