import React, { useState } from 'react';
import { Note, NoteType } from '../types';
import { Button } from './Button';

interface NoteListProps {
  notes: Note[];
  currentTime: number;
  type: NoteType;
  onAddNote: (content: string, timestamp: number) => void;
  onJumpToTime: (timestamp: number) => void;
  onDeleteNote: (id: string) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const NoteList: React.FC<NoteListProps> = ({ 
  notes, 
  currentTime, 
  type, 
  onAddNote, 
  onJumpToTime,
  onDeleteNote
}) => {
  const [newNote, setNewNote] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote, currentTime);
    setNewNote('');
  };

  const getTypeStyles = () => {
    switch(type) {
      case NoteType.VIDEO:
        return { icon: '📹', label: 'Visual Notes', color: 'text-blue-400' };
      case NoteType.AUDIO:
        return { icon: '🔊', label: 'Audio Notes', color: 'text-purple-400' };
      case NoteType.ORIGINAL:
        return { icon: '🎬', label: 'Original Video Notes', color: 'text-green-400' };
      default:
        return { icon: '📝', label: 'Notes', color: 'text-gray-400' };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="flex flex-col h-full bg-secondary/30 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-textMain flex items-center gap-2">
          <span className={styles.color}>{styles.icon}</span>
          {styles.label}
        </h3>
        <span className="text-xs text-textMuted font-mono bg-gray-800 px-2 py-1 rounded">
          Current: {formatTime(currentTime)}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <div className="text-center text-textMuted py-8 text-sm">
            No notes yet. Play the video and add observations.
          </div>
        ) : (
          notes.map((note) => (
            <div 
              key={note.id} 
              className="bg-secondary p-3 rounded border border-gray-600 group hover:border-accent transition-colors cursor-pointer"
              onClick={() => onJumpToTime(note.timestamp)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-accent font-mono text-xs font-bold bg-accent/10 px-1.5 py-0.5 rounded">
                  {formatTime(note.timestamp)}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-sm text-gray-300">{note.content}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAdd} className="p-4 border-t border-gray-700 bg-secondary/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={`Add note at ${formatTime(currentTime)}...`}
            className="flex-1 bg-primary border border-gray-600 rounded px-3 py-2 text-sm text-textMain focus:border-accent focus:outline-none placeholder-gray-500"
          />
          <Button type="submit" className="whitespace-nowrap py-1">Add</Button>
        </div>
      </form>
    </div>
  );
};