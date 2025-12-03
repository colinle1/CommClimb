export interface User {
  id: string;
  email: string;
  name: string;
}

export interface TranscriptSegment {
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

export enum NoteType {
  ORIGINAL = 'ORIGINAL',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO'
}

export interface Note {
  id: string;
  projectId: string;
  type: NoteType;
  timestamp: number; // For video/audio notes
  content: string;
  createdAt: number;
  // Optional fields for text highlights
  transcriptSegmentIndex?: number;
  quote?: string;
  highlightStart?: number;
  highlightEnd?: number;
  color?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
  videoFile?: File | null; // Not persisted in localStorage, handled in runtime state
  videoUrl?: string; // Blob URL
  duration?: number; // Duration in seconds
  isTranscribing: boolean;
  transcript: TranscriptSegment[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}