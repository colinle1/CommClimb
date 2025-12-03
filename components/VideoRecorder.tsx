import React, { useRef, useState, useEffect } from 'react';
import { Button } from './Button';
import { SpeechTracker } from '../services/speechService';
import { TranscriptSegment } from '../types';

interface VideoRecorderProps {
  onRecordingComplete: (videoFile: File, transcript: TranscriptSegment[], duration: number) => void;
  onCancel: () => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({ onRecordingComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Use a ref for the tracker, initialized as null and set in useEffect
  const speechTracker = useRef<SpeechTracker | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Initialize SpeechTracker here to avoid constructor side effects during render
    if (!speechTracker.current) {
      speechTracker.current = new SpeechTracker(process.env.API_KEY || '');
    }

    if (!speechTracker.current.isSupported()) {
      setIsSupported(false);
      setError("Your browser does not support Speech Recognition. Please use Chrome or Edge.");
      return;
    }
    startCamera();
    return () => {
      stopCamera();
      clearInterval(timerRef.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setError('');
    } catch (err) {
      setError("Could not access camera/microphone. Please allow permissions in your browser settings.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = () => {
    if (!stream || !speechTracker.current) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.start(1000); // Slice every second to ensure data availability
    speechTracker.current.start();
    setIsRecording(true);
    
    // Timer
    const startTime = Date.now();
    setDuration(0);
    timerRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording && speechTracker.current) {
      // Stop logic
      mediaRecorderRef.current.stop();
      const transcript = speechTracker.current.stop();
      
      // Capture the final duration from the timer state
      const finalDuration = duration;

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' });
        
        clearInterval(timerRef.current);
        onRecordingComplete(file, transcript, finalDuration);
      };
      
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-red-400 text-xl mb-4">Browser Not Supported</div>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={onCancel}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black relative rounded-xl overflow-hidden border border-gray-800">
      
      {/* Camera Preview */}
      <video
        ref={videoRef}
        autoPlay
        muted // Mute locally to prevent feedback loop
        playsInline
        className="w-full h-full object-contain transform scale-x-[-1]" // Changed to object-contain to avoid cutoff
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white font-mono text-sm border border-white/10">
            {isRecording ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                REC {formatTime(duration)}
              </span>
            ) : (
              <span className="text-gray-300">Ready</span>
            )}
          </div>
          <Button variant="ghost" onClick={onCancel} className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </div>

        {/* Center Error Message */}
        {error && (
          <div className="self-center bg-red-500/90 text-white px-6 py-4 rounded-xl backdrop-blur-md max-w-md text-center pointer-events-auto">
            <p className="mb-4">{error}</p>
            <Button size="sm" onClick={startCamera} className="bg-white text-red-600 hover:bg-gray-100">Retry Camera</Button>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex justify-center items-center pointer-events-auto mb-8">
          {!error && (
            isRecording ? (
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-lg bg-red-500 hover:bg-red-600 border-4 border-white/20 transition-all flex items-center justify-center shadow-lg"
              >
                <div className="w-6 h-6 bg-white rounded-sm"></div>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 border-4 border-white/20 transition-all shadow-lg flex items-center justify-center group"
              >
                <div className="w-16 h-16 rounded-full bg-red-500 animate-ping absolute opacity-20 group-hover:opacity-40"></div>
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};