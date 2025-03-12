/**
 * Sound Controller Utility
 * Manages sound effects for the application with preloading and volume control
 */

// Cache for preloaded sounds
const soundCache = new Map();

// Loading status to prevent duplicate loading requests
const loadingStatus = new Map();

// Default volumes for different sound types
const DEFAULT_VOLUMES = {
  wrongNote: 0.3,
  streak: 0.5,
  perfect: 0.7,
  general: 0.5
};

/**
 * Normalize asset path to ensure proper loading
 * @param {string} path - Path to the sound file
 * @returns {string} - Normalized path
 */
const normalizePath = (path) => {
  // If path doesn't start with http/https and doesn't start with a slash, add one
  if (!path.match(/^(http|https):\/\//) && !path.startsWith('/')) {
    return `/${path}`;
  }
  return path;
};

/**
 * Preload a sound file
 * @param {string} soundId - Identifier for the sound
 * @param {string} url - URL to the sound file
 * @param {number} volume - Initial volume (0-1)
 * @returns {Promise} - Promise resolving when sound is loaded
 */
export const preloadSound = (soundId, url, volume = DEFAULT_VOLUMES.general) => {
  // If already loaded, return cached promise
  if (soundCache.has(soundId)) {
    return Promise.resolve(soundCache.get(soundId));
  }
  
  // If currently loading, return the existing promise
  if (loadingStatus.has(soundId)) {
    return loadingStatus.get(soundId);
  }
  
  const normalizedUrl = normalizePath(url);
  
  const loadPromise = new Promise((resolve, reject) => {
    try {
      const audio = new Audio(normalizedUrl);
      audio.volume = volume;
      
      audio.addEventListener('canplaythrough', () => {
        soundCache.set(soundId, audio);
        loadingStatus.delete(soundId);
        resolve(audio);
      }, { once: true });
      
      audio.addEventListener('error', (e) => {
        console.error(`Error loading sound ${soundId} from ${normalizedUrl}:`, e);
        loadingStatus.delete(soundId);
        reject(e);
      });
      
      // Start preloading
      audio.load();
    } catch (err) {
      console.error(`Exception loading sound ${soundId}:`, err);
      loadingStatus.delete(soundId);
      reject(err);
    }
  });
  
  // Store the loading promise
  loadingStatus.set(soundId, loadPromise);
  
  return loadPromise;
};

/**
 * Play a sound by ID
 * @param {string} soundId - Identifier for the sound
 * @param {number} volume - Optional volume override
 */
export const playSound = (soundId, volume = null) => {
  const sound = soundCache.get(soundId);
  if (!sound) {
    console.warn(`Sound ${soundId} not preloaded`);
    return;
  }
  
  try {
    // Reset the sound to the beginning
    sound.currentTime = 0;
    
    // Apply volume override if provided
    if (volume !== null) {
      sound.volume = volume;
    }
    
    // Play the sound
    sound.play().catch(err => {
      console.error(`Error playing sound ${soundId}:`, err);
    });
  } catch (err) {
    console.error(`Exception playing sound ${soundId}:`, err);
  }
};

/**
 * Preload all game sound effects
 */
export const preloadAllSounds = async () => {
  // If all sounds are already loaded, return immediately
  if (
    soundCache.has('wrongNote') && 
    soundCache.has('streak') && 
    soundCache.has('perfect')
  ) {
    return true;
  }

  try {
    await Promise.all([
      preloadSound('wrongNote', 'sounds/wrong-note.mp3', DEFAULT_VOLUMES.wrongNote),
      preloadSound('streak', 'sounds/streak.mp3', DEFAULT_VOLUMES.streak),
      preloadSound('perfect', 'sounds/perfect.mp3', DEFAULT_VOLUMES.perfect)
    ]);
    console.log('All sounds preloaded successfully');
    return true;
  } catch (err) {
    console.error('Error preloading sounds:', err);
    // Don't throw - return false to indicate failure but allow app to continue
    return false;
  }
};

/**
 * Set global sound volume
 * @param {number} volume - Global volume setting (0-1)
 */
export const setGlobalVolume = (volume) => {
  soundCache.forEach((sound) => {
    sound.volume = volume;
  });
};

/**
 * Mute or unmute all sounds
 * @param {boolean} muted - Whether sounds should be muted
 */
export const setMuted = (muted) => {
  soundCache.forEach((sound) => {
    sound.muted = muted;
  });
};
