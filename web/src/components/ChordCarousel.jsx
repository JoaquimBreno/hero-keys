import React, { useEffect, useRef, useState } from 'react';
import styles from './ChordCarousel.module.css';

const ChordCarousel = ({ chords, currentTime }) => {
  const [activeChordIndex, setActiveChordIndex] = useState(0);
  const [chordDisplayFormat, setChordDisplayFormat] = useState('simple_pop'); // Default format
  const carouselRef = useRef(null);
  const chordRefs = useRef([]);

  // Prepare chord data - ensure we're handling the data structure correctly
  const chordsArray = Array.isArray(chords) ? chords : (chords?.data || []);
  
  // Initialize the chord refs array
  useEffect(() => {
    chordRefs.current = chordRefs.current.slice(0, chordsArray.length);
  }, [chordsArray]);

  // Update active chord based on current playback time (now in milliseconds, chords in seconds)
  useEffect(() => {
    if (!chordsArray.length) return;

    // Convert currentTime to seconds if it's in milliseconds
    const currentTimeInSeconds = currentTime / 1000;

    // Find the active chord based on current time
    let newActiveIndex = 0;
    for (let i = chordsArray.length - 1; i >= 0; i--) {
      if (currentTimeInSeconds >= chordsArray[i].start) {
        newActiveIndex = i;
        break;
      }
    }

    // Only update if the active chord has changed
    if (newActiveIndex !== activeChordIndex) {
      setActiveChordIndex(newActiveIndex);

      // Scroll to center the active chord
      if (carouselRef.current && chordRefs.current[newActiveIndex]) {
        const chord = chordRefs.current[newActiveIndex];
        const container = carouselRef.current;
        
        // Calculate scroll position to center the chord
        const scrollLeft = chord.offsetLeft - (container.clientWidth / 2) + (chord.clientWidth / 2);
        
        // Smooth scroll to the new position
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, chordsArray, activeChordIndex]);

  // Function to get the appropriate chord name based on selected format
  const getChordName = (chord) => {
    // Use the selected format, or fall back through formats if the selected one is not available
    switch (chordDisplayFormat) {
      case 'complex_jazz':
        return chord.chord_complex_jazz || chord.chord_simple_jazz || chord.chord_majmin;
      case 'simple_jazz':
        return chord.chord_simple_jazz || chord.chord_basic_jazz || chord.chord_majmin;
      case 'basic_jazz':
        return chord.chord_basic_jazz || chord.chord_simple_jazz || chord.chord_majmin;
      case 'complex_pop':
        return chord.chord_complex_pop || chord.chord_simple_pop || chord.chord_majmin;
      case 'simple_pop':
        return chord.chord_simple_pop || chord.chord_basic_pop || chord.chord_majmin;
      case 'basic_pop':
        return chord.chord_basic_pop || chord.chord_simple_pop || chord.chord_majmin;
      case 'nashville':
        return chord.chord_simple_nashville || chord.chord_basic_nashville || chord.chord_majmin;
      default:
        return chord.chord_majmin || 'N/A';
    }
  };

  // Format time display (mm:ss)
  const formatTime = (timeSeconds) => {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format bar and beat
  const formatBarBeat = (bar, beat) => {
    return `${bar}.${beat}`;
  };

  // Toggle between different chord display formats
  const toggleChordFormat = () => {
    const formats = ['simple_pop', 'complex_pop', 'simple_jazz', 'complex_jazz', 'nashville'];
    const currentIndex = formats.indexOf(chordDisplayFormat);
    const nextIndex = (currentIndex + 1) % formats.length;
    setChordDisplayFormat(formats[nextIndex]);
  };

  // If no chords are available
  if (!chordsArray.length) {
    return <div className={styles.noChords}>No chord data available</div>;
  }

  return (
    <div className={styles.chordCarouselContainer}>
      <button onClick={toggleChordFormat} className={styles.formatToggle}>
        {chordDisplayFormat.replace('_', ' ')}
      </button>
      <div className={styles.centerMarker}></div>
      <div className={styles.carouselTrack} ref={carouselRef}>
        {chordsArray.map((chord, index) => (
          <div
            key={`chord-${index}`}
            ref={el => chordRefs.current[index] = el}
            className={`${styles.chordItem} ${index === activeChordIndex ? styles.activeChord : ''}`}
          >
            <div className={styles.chordTime}>
              {formatTime(chord.start)}
              {chord.start_bar && <span className={styles.barBeat}> ({formatBarBeat(chord.start_bar, chord.start_beat)})</span>}
            </div>
            <div className={styles.chordName}>
              {getChordName(chord)}
              {chord.bass && `/${chord.bass}`}
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChordCarousel;
