import React, { useState, useEffect, useRef } from 'react';
import { User, Project, Note, NoteType, TranscriptSegment } from './types';
import * as Storage from './services/storageService';
import * as GeminiService from './services/geminiService';
import { Button } from './components/Button';
import { VideoPlayer } from './components/VideoPlayer';
import { NoteList } from './components/NoteList';
import { TranscriptView } from './components/TranscriptView';

const App: React.FC = () => {
  // Global State
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'auth' | 'dashboard' | 'project'>('auth');
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Project Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [uploading, setUploading] = useState(false);

  // Edit State
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'original' | 'visual' | 'audio' | 'verbal'>('original');

  // Initialization
  useEffect(() => {
    const storedUser = Storage.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
      loadProjects(storedUser.id);
      setView('dashboard');
    }
  }, []);

  // Pause video when entering Verbal tab
  useEffect(() => {
    if (activeTab === 'verbal' && videoRef.current) {
      videoRef.current.pause();
    }
  }, [activeTab]);

  const loadProjects = (userId: string) => {
    setProjects(Storage.getProjects(userId));
  };

  // --- Auth Handlers ---
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      let loggedUser: User;
      if (isLogin) {
        loggedUser = Storage.loginUser(email, password);
      } else {
        loggedUser = Storage.registerUser(email, password);
      }
      setUser(loggedUser);
      loadProjects(loggedUser.id);
      setView('dashboard');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    Storage.logoutUser();
    setUser(null);
    setView('auth');
    setCurrentProject(null);
  };

  // --- Project Management ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    
    setUploading(true);

    const newProject: Project = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: file.name.split('.')[0],
      createdAt: Date.now(),
      videoFile: file,
      videoUrl: URL.createObjectURL(file),
      isTranscribing: true,
      transcript: []
    };

    // Save initial project state
    Storage.saveProject(newProject);
    setProjects(prev => [...prev, newProject]);
    openProject(newProject);
    setUploading(false);

    // Trigger Transcription in background
    try {
      const transcript = await GeminiService.generateTranscript(file);
      const updatedProject = { ...newProject, transcript, isTranscribing: false };
      
      // Update state
      setCurrentProject(updatedProject);
      
      // Update list
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      
      // Persist (Note: videoUrl is lost on refresh, handled by UI prompt if needed)
      Storage.saveProject(updatedProject);
    } catch (error) {
      console.error("Transcription failed", error);
      // Ideally handle error state in UI
      const failedProject = { ...newProject, isTranscribing: false };
      setCurrentProject(failedProject);
      Storage.saveProject(failedProject);
    }
  };

  const openProject = (project: Project) => {
    if (editingProjectId) return; // Prevent opening if editing name
    setCurrentProject(project);
    setNotes(Storage.getNotes(project.id));
    setActiveTab('original'); // Default to Original view
    setView('project');
  };

  // --- Rename & Delete Handlers ---
  const handleStartRename = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditName(project.name);
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingProjectId) return;
    
    const project = projects.find(p => p.id === editingProjectId);
    if (project && editName.trim()) {
      const updated = { ...project, name: editName.trim() };
      Storage.saveProject(updated);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    }
    setEditingProjectId(null);
    setEditName('');
  };

  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      Storage.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  // --- Note Logic ---
  const addNote = (
    content: string, 
    time: number, 
    type: NoteType, 
    segmentIdx?: number, 
    quote?: string,
    highlightStart?: number,
    highlightEnd?: number,
    color?: string
  ) => {
    if (!currentProject) return;
    const newNote: Note = {
      id: crypto.randomUUID(),
      projectId: currentProject.id,
      type,
      timestamp: time,
      content,
      createdAt: Date.now(),
      transcriptSegmentIndex: segmentIdx,
      quote,
      highlightStart,
      highlightEnd,
      color
    };
    Storage.saveNote(newNote);
    setNotes(prev => [...prev, newNote]);
  };

  const deleteNote = (id: string) => {
    Storage.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const jumpToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      // Removed .play() per requirement
    }
  };

  // --- Views ---

  if (view === 'auth') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="z-10 w-full max-w-md p-8 bg-secondary/50 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl">
          <h1 className="text-4xl font-black text-center mb-2 bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">CommClimb</h1>
          <p className="text-center text-textMuted mb-8">Elevate your communication skills.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input required type="email" className="w-full bg-primary border border-gray-600 rounded px-4 py-2 focus:border-accent outline-none transition-colors" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input required type="password" className="w-full bg-primary border border-gray-600 rounded px-4 py-2 focus:border-accent outline-none transition-colors" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            
            <Button type="submit" className="w-full py-3 text-lg">{isLogin ? 'Sign In' : 'Create Account'}</Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-accent hover:underline">
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="bg-secondary border-b border-gray-700 p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-accent">CommClimb</h1>
          <div className="flex items-center gap-4">
            <span className="text-textMuted">Welcome, {user?.name}</span>
            <Button variant="ghost" onClick={handleLogout}>Log Out</Button>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Your Projects</h2>
            <label className="cursor-pointer">
              <span className="bg-accent text-primary px-4 py-2 rounded-lg font-medium hover:bg-accentHover transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                New Analysis
              </span>
              <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>

          {uploading && (
             <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <span className="text-accent">Processing video...</span>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div 
                key={project.id} 
                onClick={() => openProject(project)} 
                className="bg-secondary/50 border border-gray-700 rounded-xl p-6 hover:border-accent cursor-pointer transition-all hover:shadow-xl group relative"
              >
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={(e) => handleStartRename(e, project)} 
                    className="p-1.5 bg-gray-800 text-gray-400 rounded hover:text-white hover:bg-gray-700 transition-colors"
                    title="Rename"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteProject(e, project.id)} 
                    className="p-1.5 bg-gray-800 text-gray-400 rounded hover:text-red-400 hover:bg-gray-700 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    🎬
                  </div>
                  {project.isTranscribing && <span className="text-xs text-yellow-500 animate-pulse">Transcribing...</span>}
                </div>
                
                {editingProjectId === project.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => handleSaveRename()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') setEditingProjectId(null);
                    }}
                    autoFocus
                    className="w-full bg-primary border border-accent rounded px-2 py-1 text-lg font-semibold text-white outline-none mb-1"
                  />
                ) : (
                  <h3 className="text-lg font-semibold truncate mb-1 text-white group-hover:text-accent transition-colors">{project.name}</h3>
                )}
                
                <p className="text-xs text-textMuted">{new Date(project.createdAt).toLocaleDateString()}</p>
                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-xs text-textMuted">
                  <span>Visual & Audio</span>
                  <span>Verbal</span>
                </div>
              </div>
            ))}
            {projects.length === 0 && !uploading && (
              <div className="col-span-full text-center py-20 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                <p>No projects yet. Upload a video to start climbing!</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Project View
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-secondary border-b border-gray-700 h-14 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('dashboard')} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          <h1 className="font-bold text-lg truncate max-w-xs">{currentProject?.name}</h1>
        </div>
        <div className="flex gap-2">
           {currentProject?.isTranscribing && (
             <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded flex items-center gap-2">
               <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
               AI Analyzing...
             </span>
           )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Player - Hidden when activeTab is Verbal */}
        <div className={`w-2/3 p-6 bg-black flex flex-col items-center justify-center relative ${activeTab === 'verbal' ? 'hidden' : 'flex'}`}>
          {!currentProject?.videoUrl ? (
            <div className="text-center text-red-400">
              <p>Video source expired.</p>
              <p className="text-sm text-gray-500">Please re-upload the file to continue analysis.</p>
              <label className="mt-4 inline-block cursor-pointer">
                 <span className="text-accent underline">Re-upload</span>
                 <input type="file" className="hidden" onChange={(e) => {
                   if(e.target.files?.[0]) {
                     const url = URL.createObjectURL(e.target.files[0]);
                     setCurrentProject(p => p ? {...p, videoUrl: url, videoFile: e.target.files![0]} : null);
                   }
                 }} />
              </label>
            </div>
          ) : (
            <div className="w-full max-w-4xl">
              <VideoPlayer 
                ref={videoRef}
                src={currentProject.videoUrl} 
                onTimeUpdate={setCurrentTime}
                mode={activeTab === 'audio' ? 'audio' : 'video'}
                muted={activeTab === 'visual'} // Mute only in Visual mode
              />
            </div>
          )}
        </div>

        {/* Right: Analysis Tools - Expands when Verbal is active */}
        <div className={`border-l border-gray-700 bg-secondary/10 flex flex-col ${activeTab === 'verbal' ? 'w-full' : 'w-1/3'}`}>
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button 
              onClick={() => setActiveTab('original')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'original' ? 'text-accent border-b-2 border-accent bg-secondary/50' : 'text-gray-400 hover:text-white'}`}
            >
              Original
            </button>
            <button 
              onClick={() => setActiveTab('visual')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'visual' ? 'text-accent border-b-2 border-accent bg-secondary/50' : 'text-gray-400 hover:text-white'}`}
            >
              Visual
            </button>
            <button 
              onClick={() => setActiveTab('audio')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'audio' ? 'text-accent border-b-2 border-accent bg-secondary/50' : 'text-gray-400 hover:text-white'}`}
            >
              Audio
            </button>
            <button 
              onClick={() => setActiveTab('verbal')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'verbal' ? 'text-accent border-b-2 border-accent bg-secondary/50' : 'text-gray-400 hover:text-white'}`}
            >
              Verbal
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden p-4">
             {activeTab === 'original' && (
              <NoteList 
                type={NoteType.ORIGINAL}
                notes={notes.filter(n => n.type === NoteType.ORIGINAL)}
                currentTime={currentTime}
                onAddNote={(content, time) => addNote(content, time, NoteType.ORIGINAL)}
                onJumpToTime={jumpToTime}
                onDeleteNote={deleteNote}
              />
            )}
            {activeTab === 'visual' && (
              <NoteList 
                type={NoteType.VIDEO}
                notes={notes.filter(n => n.type === NoteType.VIDEO)}
                currentTime={currentTime}
                onAddNote={(content, time) => addNote(content, time, NoteType.VIDEO)}
                onJumpToTime={jumpToTime}
                onDeleteNote={deleteNote}
              />
            )}
            {activeTab === 'audio' && (
              <NoteList 
                type={NoteType.AUDIO}
                notes={notes.filter(n => n.type === NoteType.AUDIO)}
                currentTime={currentTime}
                onAddNote={(content, time) => addNote(content, time, NoteType.AUDIO)}
                onJumpToTime={jumpToTime}
                onDeleteNote={deleteNote}
              />
            )}
            {activeTab === 'verbal' && (
              <TranscriptView
                transcript={currentProject?.transcript || []}
                notes={notes.filter(n => n.type === NoteType.VERBAL)}
                onAddHighlight={(idx, content, quote, start, end, color) => 
                  addNote(content, 0, NoteType.VERBAL, idx, quote, start, end, color)
                }
                onDeleteNote={deleteNote}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;