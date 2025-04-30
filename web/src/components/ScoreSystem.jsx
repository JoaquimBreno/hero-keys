import React, { useState, useEffect, useRef } from 'react';
import styles from './ScoreSystem.module.css';
import FireEffect from './FireEffect';

// Configuration constants
const STREAK_THRESHOLD = 8; // Number of consecutive correct notes to trigger fire effect
const PERFECT_THRESHOLD = 15; // Number of consecutive correct notes for "Perfect" rating
const VIBRATION_THRESHOLD = 5; // When to start vibrating the piano
const POINTS_BASE = 100; // Base points for a correct chord/set of simultaneous notes
const POINTS_MULTIPLIER_INCREMENT = 0.1; // How much multiplier increases per correct chord
const MAX_MULTIPLIER = 5.0; // Maximum score multiplier
const SCORE_MILESTONE = 1000; // Score milestone for fire effect

export default function ScoreSystem({ 
  midiData, 
  currentTime, 
  playedMidiNotes, 
  onVibrateChange, 
  onFireEffect 
}) {
  // State for scoring and streaks
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [rating, setRating] = useState('');
  const [showFireEffect, setShowFireEffect] = useState(false);
  const [vibrationLevel, setVibrationLevel] = useState(0);
  const [lastScoreMilestone, setLastScoreMilestone] = useState(0); // Track last milestone
  const vibrationTimeoutRef = useRef(null);
  
  // Refs to track state without rerenders
  const scoreRef = useRef(score);
  const streakRef = useRef(streak);
  const multiplierRef = useRef(multiplier);
  const expectedNotesRef = useRef(new Set());
  const activeNotesRef = useRef(new Set());
  const lastPlayedNotesRef = useRef(new Set());
  
  // Keep refs updated with state
  useEffect(() => {
    scoreRef.current = score;
    streakRef.current = streak;
    multiplierRef.current = multiplier;
  }, [score, streak, multiplier]);
  
  // Update expected notes based on MIDI data and current time
  useEffect(() => {
    if (!midiData || !midiData.tracks) return;
    
    const newExpectedNotes = new Set();
    const now = currentTime;
    const timeWindow = 150; // Time window in ms to consider a note "expected"
    
    // Find notes that should be played at this time
    midiData.tracks.forEach(track => {
      if (track.notes && track.notes.length > 0) {
        track.notes.forEach(note => {
          const noteStartTime = note.time * 1000; // Convert to ms
          const noteEndTime = (note.time + note.duration) * 1000;
          
          // Check if this note should be played now (with a small window)
          if (noteStartTime <= now && noteEndTime >= now - timeWindow) {
            newExpectedNotes.add(note.midi);
          }
        });
      }
    });
    
    expectedNotesRef.current = newExpectedNotes;
    activeNotesRef.current = new Set(playedMidiNotes);
    
  }, [midiData, currentTime, playedMidiNotes]);
  
  // Process note hits and misses
  useEffect(() => {
    const expectedNotes = expectedNotesRef.current;
    const activeNotes = new Set(playedMidiNotes);
    const lastPlayedNotes = lastPlayedNotesRef.current;
    
    // Only process if the active notes changed
    if (activeNotes.size !== lastPlayedNotes.size || 
        [...activeNotes].some(note => !lastPlayedNotes.has(note))) {
      
      // Check if all expected notes are played (and no extra wrong notes)
      const allExpectedNotesPlayed = 
        expectedNotes.size > 0 && // There are expected notes to play
        activeNotes.size === expectedNotes.size && // Same number of notes
        [...expectedNotes].every(note => activeNotes.has(note)); // All expected notes are played
      
      // Any wrong notes or incomplete playing
      const wrongNotes = 
        expectedNotes.size > 0 && 
        (activeNotes.size !== expectedNotes.size || 
         [...activeNotes].some(note => !expectedNotes.has(note)));
      
      // Handle perfect chord match
      if (allExpectedNotesPlayed) {
        // Calculate points with current multiplier
        const pointsGained = Math.round(POINTS_BASE * multiplierRef.current);
        
        // Update streak
        const newStreak = streakRef.current + 1; // Increment by 1 for each correct chord
        setStreak(newStreak);
        
        // Update max streak if needed
        if (newStreak > maxStreak) {
          setMaxStreak(newStreak);
        }
        
        // Increase multiplier
        const newMultiplier = Math.min(
          multiplierRef.current + POINTS_MULTIPLIER_INCREMENT,
          MAX_MULTIPLIER
        );
        setMultiplier(newMultiplier);
        
        // Update score
        const newScore = scoreRef.current + pointsGained;
        setScore(newScore);
        
        // Check if we've crossed a 1000 point milestone
        const currentMilestone = Math.floor(newScore / SCORE_MILESTONE);
        const previousMilestone = Math.floor(scoreRef.current / SCORE_MILESTONE);
        
        if (currentMilestone > previousMilestone) {
          // Trigger fire effect for 1 second
          setShowFireEffect(true);
          setTimeout(() => setShowFireEffect(false), 1000); // 1 second duration
          
          if (onFireEffect) {
            onFireEffect(true);
            setTimeout(() => onFireEffect(false), 1000);
          }
          
          // Update last milestone
          setLastScoreMilestone(currentMilestone * SCORE_MILESTONE);
        }
        
        // Update rating
        updateRating(newStreak);
        
        // Check for streak thresholds
        checkStreakThresholds(newStreak);
      }
      
      // Handle wrong notes or incomplete chords
      if (wrongNotes) {
        // Reset streak and lower multiplier
        setStreak(0);
        setMultiplier(1.0);
        setRating('');
        
        // Clear vibration timeout
        if (vibrationTimeoutRef.current) {
          clearTimeout(vibrationTimeoutRef.current);
          vibrationTimeoutRef.current = null;
        }
        
        // Turn off effects
        setShowFireEffect(false);
        setVibrationLevel(0);
        if (onVibrateChange) onVibrateChange(0);
        if (onFireEffect) onFireEffect(false);
      }
    }
    
    // Update last played notes for next comparison
    lastPlayedNotesRef.current = activeNotes;
    
  }, [playedMidiNotes, maxStreak, onVibrateChange, onFireEffect]);
  
  // Update UI for effects based on streak
  useEffect(() => {
    if (onFireEffect) {
      onFireEffect(showFireEffect);
    }
    
    if (onVibrateChange) {
      onVibrateChange(vibrationLevel);
    }
  }, [showFireEffect, vibrationLevel, onFireEffect, onVibrateChange]);
  
  // Check streak thresholds and trigger effects
  const checkStreakThresholds = (newStreak) => {
    // Fire effect threshold
    if (newStreak >= STREAK_THRESHOLD && newStreak % 8 === 0) {
      // Show fire effect
      setShowFireEffect(true);
      setTimeout(() => setShowFireEffect(false), 4000); // Fire effect duration
      
      if (onFireEffect) {
        onFireEffect(true);
        setTimeout(() => onFireEffect(false), 4000);
      }
    }
    
    // Perfect threshold
    if (newStreak >= PERFECT_THRESHOLD && newStreak % PERFECT_THRESHOLD === 0) {
      // Removed sound effect call
    }
    
    // Vibration effect threshold
    if (newStreak >= VIBRATION_THRESHOLD) {
      // Clear any existing timeout
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
      }
      
      // Set vibration intensity
      const intensity = Math.min(Math.floor(newStreak / VIBRATION_THRESHOLD) * 0.2, 1);
      setVibrationLevel(intensity);
      
      // Set timeout to turn off vibration after 1500ms
      vibrationTimeoutRef.current = setTimeout(() => {
        setVibrationLevel(0);
        if (onVibrateChange) onVibrateChange(0);
        vibrationTimeoutRef.current = null;
      }, 1500); // 1.5 seconds of vibration
    } else {
      setVibrationLevel(0);
    }
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (vibrationTimeoutRef.current) {
        clearTimeout(vibrationTimeoutRef.current);
      }
    };
  }, []);
  
  // Update player rating based on streak
  const updateRating = (currentStreak) => {
    if (currentStreak >= PERFECT_THRESHOLD) {
      setRating('Perfect!');
    } else if (currentStreak >= 10) {
      setRating('Excellent!');
    } else if (currentStreak >= 5) {
      setRating('Great!');
    } else if (currentStreak >= 3) {
      setRating('Good!');
    } else {
      setRating('');
    }
  };
  
  // Format large numbers with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <div className={styles.scoreSystem}>
      <div className={styles.scoreDisplay}>
        <h2 className={styles.scoreValue}>{formatNumber(score)}</h2>
        <div className={styles.multiplierContainer}>
          <span className={styles.multiplierLabel}>Multiplier</span>
          <span className={styles.multiplierValue}>×{multiplier.toFixed(1)}</span>
        </div>
      </div>
      
      <div className={styles.streakInfo}>
        <div className={styles.streakDisplay}>
          <span className={styles.streakValue}>{streak}</span>
          <span className={styles.streakLabel}>STREAK</span>
        </div>
        <div className={styles.maxStreakDisplay}>
          <span className={styles.maxStreakValue}>{maxStreak}</span>
          <span className={styles.maxStreakLabel}>MAX</span>
        </div>
      </div>
      
      {rating && (
        <div className={`${styles.ratingDisplay} ${styles[rating.toLowerCase().replace('!', '')]}`}>
          {rating}
        </div>
      )}
    </div>
  );
}
