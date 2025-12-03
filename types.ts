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
  AUDIO = 'AUDIO',
  VERBAL = 'VERBAL'
}

export interface Note {
  id: string;
  projectId: string;
  type: NoteType;
  timestamp: number; // For video/audio notes
  transcriptSegmentIndex?: number; // For verbal notes (highlighting)
  highlightStart?: number; // Start char index relative to segment text
  highlightEnd?: number; // End char index relative to segment text
  color?: string; // Hex color for the highlight
  quote?: string; // The specific highlighted text
  content: string;
  createdAt: number;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: number;
  videoFile?: File | null; // Not persisted in localStorage, handled in runtime state
  videoUrl?: string; // Blob URL
  isTranscribing: boolean;
  transcript: TranscriptSegment[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}