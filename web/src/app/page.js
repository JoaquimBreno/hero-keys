import PianoVisualizer from '@/components/PianoVisualizer';

export default function Home() {
  return (
    <div className="container">
      <header>
        <div className="logo">Moises Piano Visualizer</div>
        <p>Visualize suas músicas MIDI com animações elegantes em estilo neon</p>
      </header>
      
      <PianoVisualizer />
      
      <footer>
        <p>© {new Date().getFullYear()} Moises Inc. Todos os direitos reservados</p>
      </footer>
    </div>
  );
}