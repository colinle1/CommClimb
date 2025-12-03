import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  onTimeUpdate: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  initialTime?: number;
  mode?: 'video' | 'audio';
  muted?: boolean;
}

export const VideoPlayer = React.forwardRef<HTMLVideoElement, VideoPlayerProps>(({ 
  src, 
  onTimeUpdate, 
  onDurationChange,
  initialTime,
  mode = 'video',
  muted = false
}, ref) => {
  const localRef = useRef<HTMLVideoElement>(null);
  const videoRef = (ref as React.RefObject<HTMLVideoElement>) || localRef;
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Local state for custom controls
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      onDurationChange?.(video.duration);
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate, onDurationChange, videoRef]);

  // Handle seeking from outside props (e.g., clicking a note)
  useEffect(() => {
    if (initialTime !== undefined && videoRef.current && Math.abs(videoRef.current.currentTime - initialTime) > 0.5) {
      videoRef.current.currentTime = initialTime;
      setCurrentTime(initialTime);
    }
  }, [initialTime, videoRef]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper to render the common scrubber and time components
  const Scrubber = () => (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs font-mono text-gray-300 w-10 text-right">{formatTime(currentTime)}</span>
      <input 
        type="range"
        min="0"
        max={duration || 100}
        value={currentTime}
        onChange={handleSeek}
        className="flex-1 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accentHover"
      />
      <span className="text-xs font-mono text-gray-300 w-10">{formatTime(duration)}</span>
    </div>
  );

  const PlayButton = ({ size = 'normal' }: { size?: 'normal' | 'large' }) => (
    <button 
      onClick={togglePlay}
      className={`
        rounded-full bg-accent hover:bg-accentHover text-primary flex items-center justify-center 
        transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/50
        ${size === 'large' ? 'w-16 h-16 mb-6' : 'w-10 h-10 shrink-0'}
      `}
    >
      {isPlaying ? (
        <svg className={size === 'large' ? 'w-8 h-8' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className={`${size === 'large' ? 'w-8 h-8' : 'w-5 h-5'} translate-x-0.5`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );

  return (
    <div className={`relative w-full rounded-xl overflow-hidden bg-black shadow-2xl group ${mode === 'audio' ? 'h-64 flex items-center justify-center' : 'aspect-video'}`}>
      
      {/* --- AUDIO MODE INTERFACE --- */}
      {mode === 'audio' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20 p-6">
           <div className="mb-6 flex flex-col items-center">
             <svg className={`w-12 h-12 text-accent mb-2 ${isPlaying ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
             </svg>
             <h3 className="text-lg font-bold text-textMain">Audio Analysis</h3>
           </div>
           
           <PlayButton size="large" />
           <div className="w-full max-w-md">
             <Scrubber />
           </div>
        </div>
      ) : null}
      
      {/* --- THE VIDEO ELEMENT --- */}
      <video
        ref={videoRef}
        src={src}
        className={`w-full h-full ${mode === 'audio' ? 'opacity-0 absolute pointer-events-none' : 'object-contain'}`}
        // Only show native controls if we are in 'video' mode AND not muted (Original Tab).
        // If muted (Visual Tab), we hide native controls and use custom ones below.
        controls={mode === 'video' && !muted} 
        playsInline
        muted={muted}
      />

      {/* --- VISUAL MODE CUSTOM CONTROLS (No Volume) --- */}
      {muted && mode === 'video' && (
        <>
          {/* Muted Badge */}
          <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-xs text-white/80 flex items-center gap-2 backdrop-blur-sm pointer-events-none border border-white/10">
            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            Visual Only
          </div>

          {/* Custom Bottom Bar - Visible on hover or when paused */}
          <div className={`
            absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent 
            flex items-center gap-4 transition-opacity duration-300 z-10
            opacity-0 group-hover:opacity-100 ${!isPlaying ? 'opacity-100' : ''}
          `}>
             <PlayButton size="normal" />
             <Scrubber />
          </div>
        </>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';