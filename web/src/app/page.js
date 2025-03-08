import PianoVisualizer from '@/components/PianoVisualizer.jsx';

export default function Home() {
  return (
    <div className="container">
      <header>
        <div className="logo">🎹 HeroKeys 🎹</div>
        <p>Visualize suas músicas MIDI com animações elegantes em estilo neon</p>
      </header>
      
      <PianoVisualizer />
      
      <footer>
        <p>© {new Date().getFullYear()} Moises Inc. Todos os direitos reservados</p>
      </footer>
    </div>
  );
}