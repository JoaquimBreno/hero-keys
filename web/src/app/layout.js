import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CustomCursor from '../components/CustomCursor';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Moises Piano Visualizer',
  description: 'Visualize suas músicas MIDI com animações elegantes em estilo neon',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}