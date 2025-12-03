import React, { useMemo } from 'react';
import { TranscriptSegment } from '../types';

interface SpeakingSpeedViewProps {
  transcript: TranscriptSegment[];
}

export const SpeakingSpeedView: React.FC<SpeakingSpeedViewProps> = ({ transcript }) => {
  
  const stats = useMemo(() => {
    if (!transcript.length) return { wpm: 0, totalWords: 0, duration: 0, segments: [] };

    let totalWords = 0;
    const segmentStats = transcript.map(seg => {
      const words = seg.text.trim().split(/\s+/).length;
      const duration = seg.endTime - seg.startTime;
      totalWords += words;
      // Avoid division by zero
      const wpm = duration > 0 ? Math.round((words / duration) * 60) : 0;
      return { ...seg, wpm };
    });

    const startTime = transcript[0].startTime;
    const endTime = transcript[transcript.length - 1].endTime;
    const totalDuration = endTime - startTime;
    
    // Global Average WPM
    const globalWpm = totalDuration > 0 ? Math.round((totalWords / totalDuration) * 60) : 0;

    return {
      wpm: globalWpm,
      totalWords,
      duration: totalDuration,
      segments: segmentStats
    };
  }, [transcript]);

  const getSpeedCategory = (wpm: number) => {
    if (wpm < 110) return { label: 'Slow', color: 'text-yellow-400', desc: 'Deliberate and thoughtful, but potentially disengaging if too prolonged.' };
    if (wpm < 130) return { label: 'Moderate', color: 'text-blue-400', desc: 'Clear and articulate. Good for instructional content.' };
    if (wpm < 160) return { label: 'Conversational', color: 'text-green-400', desc: 'Natural and engaging. Ideal for storytelling and general communication.' };
    return { label: 'Fast', color: 'text-red-400', desc: 'Energetic and passionate, but ensure you maintain clarity.' };
  };

  const category = getSpeedCategory(stats.wpm);

  if (transcript.length === 0) {
    return (
      <div className="flex flex-col h-full bg-secondary/30 rounded-lg border border-gray-700 items-center justify-center p-8">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-textMuted">Analyzing speaking patterns...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-secondary/30 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-secondary/50">
        <h3 className="text-xl font-bold text-textMain flex items-center gap-2 mb-1">
          <span className="text-accent">⚡</span> Speaking Speed Analysis
        </h3>
        <p className="text-sm text-textMuted">
          Analysis based on {stats.totalWords} words spoken over {Math.round(stats.duration)} seconds.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Main Stat Card */}
        <div className="bg-black/40 rounded-2xl p-8 flex flex-col items-center justify-center border border-gray-700">
           <div className="text-6xl font-black text-white mb-2">{stats.wpm}</div>
           <div className="text-sm text-gray-400 uppercase tracking-widest mb-4">Words Per Minute</div>
           
           <div className={`px-4 py-1.5 rounded-full bg-white/5 border border-white/10 ${category.color} font-bold text-lg mb-2`}>
             {category.label} Pace
           </div>
           <p className="text-center text-gray-400 text-sm max-w-md">
             {category.desc}
           </p>
        </div>

        {/* Breakdown Chart */}
        <div>
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Pace Timeline</h4>
          <div className="space-y-3">
            {stats.segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-4 text-xs">
                <div className="w-16 text-right font-mono text-gray-500">
                  {Math.floor(seg.startTime / 60)}:{Math.floor(seg.startTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="flex-1 h-8 bg-gray-800 rounded-md overflow-hidden relative group">
                  <div 
                    className={`h-full transition-all duration-500 ${getSpeedCategory(seg.wpm).color.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(100, (seg.wpm / 200) * 100)}%` }}
                  ></div>
                  
                  {/* Tooltip */}
                  <div className="absolute inset-0 flex items-center px-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-white">
                    <span className="font-bold mr-2">{seg.wpm} WPM</span> 
                    <span className="truncate opacity-75">"{seg.text.substring(0, 40)}..."</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
