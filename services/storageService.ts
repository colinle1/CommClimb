import { Note, Project, User } from "../types";

const KEYS = {
  USERS: 'commclimb_users',
  PROJECTS: 'commclimb_projects',
  NOTES: 'commclimb_notes',
  CURRENT_USER: 'commclimb_current_user'
};

// --- User Auth Simulation ---

interface StoredUser extends User {
  password?: string;
}

export const getStoredUsers = (): StoredUser[] => {
  const data = localStorage.getItem(KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

export const registerUser = (email: string, password: string): User => {
  const users = getStoredUsers();
  if (users.find(u => u.email === email)) {
    throw new Error("User already exists");
  }
  // Generate a display name from email since name is no longer collected
  const name = email.split('@')[0];
  const newUser: StoredUser = { 
    id: crypto.randomUUID(), 
    email, 
    name,
    password // Store password (in plaintext for this mock local service)
  };
  
  users.push(newUser);
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  
  // Return user without password
  const { password: _, ...userToReturn } = newUser;
  return userToReturn;
};

export const loginUser = (email: string, password: string): User => {
  const users = getStoredUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) throw new Error("User not found");
  if (user.password !== password) throw new Error("Invalid password"); // Simple check

  const { password: _, ...userToReturn } = user;
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(userToReturn));
  return userToReturn;
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(KEYS.CURRENT_USER);
};

// --- Project Persistence ---

export const getProjects = (userId: string): Project[] => {
  const data = localStorage.getItem(KEYS.PROJECTS);
  const allProjects: Project[] = data ? JSON.parse(data) : [];
  return allProjects.filter(p => p.userId === userId);
};

export const saveProject = (project: Project) => {
  const data = localStorage.getItem(KEYS.PROJECTS);
  let allProjects: Project[] = data ? JSON.parse(data) : [];
  
  const existingIndex = allProjects.findIndex(p => p.id === project.id);
  
  // Create a version of the project suitable for storage (remove Blobs/Files)
  const storedProject: Project = {
    ...project,
    videoFile: undefined, 
    videoUrl: undefined // We cannot persist Blob URLs across refreshes without a real backend
  };

  if (existingIndex >= 0) {
    allProjects[existingIndex] = storedProject;
  } else {
    allProjects.push(storedProject);
  }
  
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(allProjects));
};

export const deleteProject = (projectId: string) => {
  // Remove project
  const data = localStorage.getItem(KEYS.PROJECTS);
  let allProjects: Project[] = data ? JSON.parse(data) : [];
  allProjects = allProjects.filter(p => p.id !== projectId);
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(allProjects));

  // Remove notes associated with project
  const notesData = localStorage.getItem(KEYS.NOTES);
  let allNotes: Note[] = notesData ? JSON.parse(notesData) : [];
  allNotes = allNotes.filter(n => n.projectId !== projectId);
  localStorage.setItem(KEYS.NOTES, JSON.stringify(allNotes));
};

// --- Note Persistence ---

export const getNotes = (projectId: string): Note[] => {
  const data = localStorage.getItem(KEYS.NOTES);
  const allNotes: Note[] = data ? JSON.parse(data) : [];
  return allNotes.filter(n => n.projectId === projectId).sort((a, b) => a.timestamp - b.timestamp);
};

export const saveNote = (note: Note) => {
  const data = localStorage.getItem(KEYS.NOTES);
  const allNotes: Note[] = data ? JSON.parse(data) : [];
  allNotes.push(note);
  localStorage.setItem(KEYS.NOTES, JSON.stringify(allNotes));
};

export const deleteNote = (noteId: string) => {
  const data = localStorage.getItem(KEYS.NOTES);
  let allNotes: Note[] = data ? JSON.parse(data) : [];
  allNotes = allNotes.filter(n => n.id !== noteId);
  localStorage.setItem(KEYS.NOTES, JSON.stringify(allNotes));
};