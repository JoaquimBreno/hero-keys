// AudioPlayer.jsx
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import styles from './AudioPlayer.module.css';

// Use public directory paths instead of imports
const ICON_PATHS = {
  mute: '/mute.svg',
  unmute: '/unmute.svg',
  chord: '/chord.svg',
  sheetMusic: '/sheet-music.svg',
  keys: '/keys.svg',
  noKeys: '/no-keys.svg',
  play: '/play.svg',
  pause: '/pause.svg',
  volumeLow: '/volume-low.svg',
  volumeMedium: '/volume-medium.svg',
  volumeHigh: '/volume-high.svg',
};

const AudioPlayer = forwardRef(({ 
  audioData, 
  onTimeUpdate, 
  fileName, 
  onVisualizerToggle, 
  showSheetMusic,
  onMidiSoundToggle,
  isMidiSoundEnabled,
  onChordCarouselToggle,
  showChordCarousel
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  // Add playback rate state
  const [playbackRate, setPlaybackRate] = useState(1);
  // Add volume state for both audio and MIDI
  const [audioVolume, setAudioVolume] = useState(1);
  const [midiVolume, setMidiVolume] = useState(1);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [volumeControlType, setVolumeControlType] = useState('audio'); // 'audio' or 'midi'
  
  const playbackRates = [0.25, 0.5, 1, 1.25, 1.5];
  const volumeLevels = [0, 0.25, 0.5, 0.75, 1];
  
  const audioRef = useRef(null);
  const currentTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const seekBarContainerRef = useRef(null);
  const volumeControlRef = useRef(null);
  // Add a ref to track the last time we updated the UI
  const lastUIUpdateRef = useRef(0);
  
  // Expose seekToTime function to parent components
  useImperativeHandle(ref, () => ({
    seekToTime: (timeInMs) => {
      seekToTime(timeInMs);
    }
  }));
  
  // Function to seek to a specific time in milliseconds
  const seekToTime = (timeInMs) => {
    seekingRef.current = true;
    
    const seekTimeInSeconds = timeInMs / 1000;
    currentTimeRef.current = seekTimeInSeconds;
    setDisplayTime(seekTimeInSeconds);
    setProgressPercent((seekTimeInSeconds / duration) * 100);
    
    if (audioRef.current) {
      audioRef.current.currentTime = seekTimeInSeconds;
    }
    
    // Schedule the seeking flag to be released
    setTimeout(() => {
      seekingRef.current = false;
      if (onTimeUpdate) {
        onTimeUpdate(timeInMs);
      }
    }, 50);
  };
  
  // Initialize audio with the provided data
  useEffect(() => {
    if (!audioData) return;
  
    let audioUrl;
    
    // Check if audioData is already an ObjectURL
    if (typeof audioData === 'string' && audioData.startsWith('blob:')) {
      audioUrl = audioData;
    } else {
      // Convert Blob/ArrayBuffer to ObjectURL
      const audioBlob = new Blob([audioData], { type: 'audio/wav' });
      audioUrl = URL.createObjectURL(audioBlob);
    }
    
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      // Set initial playback rate and volume
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = audioVolume;
    }
    
    // Only revoke URL if we created it
    return () => {
      if (audioUrl !== audioData) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioData]);

  // Update audio playback rate and volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = audioVolume;
      audioRef.current.muted = audioVolume === 0;
    }
  }, [playbackRate, audioVolume]);
  
  // Update MIDI volume when it changes
  useEffect(() => {
    if (onMidiSoundToggle) {
      onMidiSoundToggle(midiVolume > 0);
    }
  }, [midiVolume, onMidiSoundToggle]);
  
  // Close volume control popup when clicking outside
  useEffect(() => {
    if (!showVolumeControls) return;
    
    const handleClickOutside = (event) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target)) {
        setShowVolumeControls(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeControls]);
  
  // Handle metadata loaded
  const handleMetadataLoaded = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  
  // Set up a more efficient animation loop for time updates
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current && isPlaying && !seekingRef.current) {
        const time = audioRef.current.currentTime;
        const previousTime = currentTimeRef.current;
        currentTimeRef.current = time;
        
        // Throttle UI updates to 4 times per second (250ms)
        const now = Date.now();
        if (now - lastUIUpdateRef.current > 250) {
          setDisplayTime(time);
          setProgressPercent((time / (audioRef.current.duration || 1)) * 100);
          lastUIUpdateRef.current = now;
        }
        
        // Always report current time to parent for synchronization
        // even for small changes to ensure precise note visualization
        if (onTimeUpdate && (Math.abs(time - previousTime) > 0.01 || time !== previousTime)) {
          onTimeUpdate(time * 1000); // Convert to milliseconds for MIDI sync
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, onTimeUpdate, duration]); // Added duration as a dependency
  
  // Handle play/pause
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Get volume icon based on level
  const getVolumeIcon = (volume) => {
    if (volume === 0) return ICON_PATHS.mute;
    if (volume < 0.5) return ICON_PATHS.volumeLow;
    if (volume < 0.8) return ICON_PATHS.volumeMedium;
    return ICON_PATHS.volumeHigh;
  };
  
  // Show volume controls for audio
  const showAudioVolumeControls = () => {
    setVolumeControlType('audio');
    setShowVolumeControls(true);
  };
  
  // Show volume controls for MIDI
  const showMidiVolumeControls = () => {
    setVolumeControlType('midi');
    setShowVolumeControls(true);
  };
  
  // Set volume level
  const setVolumeLevel = (level) => {
    if (volumeControlType === 'audio') {
      setAudioVolume(level);
      setIsMuted(level === 0);
      if (audioRef.current) {
        audioRef.current.volume = level;
        audioRef.current.muted = level === 0;
      }
    } else {
      setMidiVolume(level);
      if (onMidiSoundToggle) {
        onMidiSoundToggle(level > 0);
      }
    }
    setShowVolumeControls(false);
  };
  
  // Handle seek - fixed to prevent infinite loop
  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    seekToTime(seekTime * 1000); // Convert to milliseconds for consistency
  };
  
  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle playback rate change
  const handlePlaybackRateChange = () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackRates.length;
    setPlaybackRate(playbackRates[nextIndex]);
  };
  
  return (
    <div className={styles.audioPlayer}>
      <audio
        ref={audioRef}
        onLoadedMetadata={handleMetadataLoaded}
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className={styles.playerInfo}>
        <span className={styles.fileName}>{fileName || 'Audio File'}</span>
      </div>
      
      <div className={styles.playerControls}>
        <button 
          className={`${styles.playButton} ${isPlaying ? styles.pauseButton : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <img src={isPlaying ? ICON_PATHS.pause : ICON_PATHS.play} alt={isPlaying ? "Pause" : "Play"} />
        </button>
        
        {/* Audio volume button */}
        <div className={styles.volumeControl}>
          <button
            className={`${styles.controlButton} ${audioVolume === 0 ? styles.activeMute : ''}`}
            onClick={showAudioVolumeControls}
            aria-label="Audio Volume"
            title="Audio Volume"
          >
            <img src={ICON_PATHS.mute} alt="Audio Volume" />
          </button>
          
          {showVolumeControls && volumeControlType === 'audio' && (
            <div className={styles.volumePopup} ref={volumeControlRef}>
              <div className={styles.volumeSlider}>
                {volumeLevels.map(level => (
                  <button 
                    key={level}
                    className={`${styles.volumeButton} ${audioVolume === level ? styles.activeVolume : ''}`}
                    onClick={() => setVolumeLevel(level)}
                  >
                    {level === 0 ? 'Mute' : Math.round(level * 100) + '%'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add playback rate button */}
        <button
          className={`${styles.controlButton} ${styles.rateButton}`}
          onClick={handlePlaybackRateChange}
          aria-label={`Change playback speed, current: ${playbackRate}x`}
          title="Change playback speed"
        >
          {playbackRate}x
        </button>
        
        {/* MIDI volume control button */}
        {onMidiSoundToggle && (
          <div className={styles.volumeControl}>
            <button
              className={`${styles.controlButton} ${midiVolume === 0 ? styles.midiSoundDisabled : ''}`}
              onClick={showMidiVolumeControls}
              aria-label="MIDI Volume"
              title="MIDI Volume"
            >
              <img src={midiVolume > 0 ? ICON_PATHS.keys : ICON_PATHS.noKeys} 
                   alt={midiVolume > 0 ? "MIDI sound enabled" : "MIDI sound disabled"} />
            </button>
            
            {showVolumeControls && volumeControlType === 'midi' && (
              <div className={styles.volumePopup} ref={volumeControlRef}>
                <div className={styles.volumeSlider}>
                  {volumeLevels.map(level => (
                    <button 
                      key={level}
                      className={`${styles.volumeButton} ${midiVolume === level ? styles.activeVolume : ''}`}
                      onClick={() => setVolumeLevel(level)}
                    >
                      {level === 0 ? 'Off' : Math.round(level * 100) + '%'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className={styles.timeInfo}>
          <span className={styles.currentTime}>{formatTime(displayTime)}</span>
          
          <div className={styles.seekBarContainer} ref={seekBarContainerRef}>
            <div 
              className={styles.seekBarProgress} 
              style={{ width: `${progressPercent}%` }}
            ></div>
            <div 
              className={styles.seekBarThumb} 
              style={{ left: `${progressPercent}%` }}
            ></div>
            <input
              type="range"
              className={styles.seekBar}
              min="0"
              max={duration || 0}
              step="0.01"
              value={displayTime}
              onChange={handleSeek}
            />
          </div>
          
          <span className={styles.duration}>{formatTime(duration)}</span>
        </div>
        
        {/* Add toggle button for switching visualizers */}
        {onVisualizerToggle && (
          <button
            className={`${styles.toggleButton} ${showSheetMusic ? styles.sheetMusicActive : ''}`}
            onClick={() => onVisualizerToggle(!showSheetMusic)}
            aria-label={showSheetMusic ? 'Show Notes' : 'Show Sheet Music'}
            title={showSheetMusic ? 'Show Notes' : 'Show Sheet Music'}
          >
            <img src={showSheetMusic ? ICON_PATHS.keys : ICON_PATHS.sheetMusic} 
                 alt={showSheetMusic ? "Show Notes" : "Show Sheet Music"} />
          </button>
        )}
        
        {/* Add toggle button for chord carousel if available */}
        {onChordCarouselToggle && (
          <button
            className={`${styles.toggleButton} ${showChordCarousel ? styles.chordsActive : ''}`}
            onClick={onChordCarouselToggle}
            aria-label={showChordCarousel ? 'Hide Chords' : 'Show Chords'}
            title={showChordCarousel ? 'Hide Chords' : 'Show Chords'}
          >
            <img src={ICON_PATHS.chord} alt="Chord" />
          </button>
        )}
      </div>
    </div>
  );
});

export default AudioPlayer;