/**
 * PlanWise AI - Firebase Configuration & Real-Time Client Service
 * 
 * Provides:
 * - Real Firebase Auth and Firestore when configured.
 * - Reactive state synchronization and listener support.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithPopup as fbSignInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { UserProfile, Subject, StudyTask } from '../types';

import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let db: any = null;
let auth: any = null;

try {
  if (firebaseConfig && firebaseConfig.projectId && !firebaseConfig.projectId.includes('Placeholder')) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    auth = getAuth(app);
    console.log("[PlanWise AI] Firebase initialized with live project:", firebaseConfig.projectId);
  }
} catch (e) {
  console.warn("[PlanWise AI] Firebase live connection pending project setup, using reactive store.");
}

export { app, db, auth };

// ---------------------------------------------------------------------------
// Local / In-Memory State Synchronization (Ensures 100% Reliability in Previews)
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_KEY_USER = 'planwise_user';
const LOCAL_STORAGE_KEY_SUBJECTS = 'planwise_subjects';
const LOCAL_STORAGE_KEY_TASKS = 'planwise_tasks';

// Initial sample subjects for immediate hackathon exploration
const DEFAULT_SAMPLE_SUBJECTS: Subject[] = [
  {
    id: 'sub_cs101',
    userId: 'demo_user',
    name: 'Algorithms & Data Structures',
    examDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    difficulty: 9,
    priorityScore: 12.86,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_math201',
    userId: 'demo_user',
    name: 'Advanced Linear Algebra',
    examDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    difficulty: 8,
    priorityScore: 6.67,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_sys301',
    userId: 'demo_user',
    name: 'Distributed Systems & Cloud',
    examDate: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
    difficulty: 7,
    priorityScore: 3.89,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_hum102',
    userId: 'demo_user',
    name: 'Ethics in Artificial Intelligence',
    examDate: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
    difficulty: 4,
    priorityScore: 1.43,
    createdAt: new Date().toISOString()
  }
];

class PlanWiseStore {
  private user: UserProfile | null = null;
  private subjects: Subject[] = [];
  private tasks: StudyTask[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedUser = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
      if (savedUser) {
        this.user = JSON.parse(savedUser);
      } else {
        // Start unauthenticated so user sees the Login & Registration screen
        this.user = null;
      }

      const savedSubjects = localStorage.getItem(LOCAL_STORAGE_KEY_SUBJECTS);
      if (savedSubjects) {
        this.subjects = JSON.parse(savedSubjects);
      } else {
        this.subjects = [...DEFAULT_SAMPLE_SUBJECTS];
        this.saveSubjects();
      }

      const savedTasks = localStorage.getItem(LOCAL_STORAGE_KEY_TASKS);
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks);
      }
    } catch (e) {
      console.warn("Storage loading error:", e);
    }
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try { fn(); } catch (err) { console.error(err); }
    });
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  // --- User Profile ---
  public getUser(): UserProfile | null {
    return this.user;
  }

  public setUser(user: UserProfile | null) {
    this.user = user;
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
    }
    this.notify();
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    return [...this.subjects];
  }

  public addSubject(subject: Omit<Subject, 'id' | 'createdAt'>): Subject {
    const newSubject: Subject = {
      ...subject,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.subjects = [newSubject, ...this.subjects];
    this.saveSubjects();
    this.notify();
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<Subject>) {
    this.subjects = this.subjects.map(s => s.id === id ? { ...s, ...updates } : s);
    this.saveSubjects();
    this.notify();
  }

  public deleteSubject(id: string) {
    this.subjects = this.subjects.filter(s => s.id !== id);
    this.saveSubjects();
    this.notify();
  }

  private saveSubjects() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SUBJECTS, JSON.stringify(this.subjects));
    } catch (e) {}
  }

  // --- Tasks ---
  public getTasks(): StudyTask[] {
    return [...this.tasks];
  }

  public setTasks(tasks: StudyTask[]) {
    this.tasks = [...tasks];
    this.saveTasks();
    this.notify();
  }

  public updateTaskStatus(taskId: string, status: 'completed' | 'missed' | 'scheduled') {
    this.tasks = this.tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    this.saveTasks();
    this.notify();
  }

  private saveTasks() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_TASKS, JSON.stringify(this.tasks));
    } catch (e) {}
  }

  public resetDemoData() {
    this.subjects = [...DEFAULT_SAMPLE_SUBJECTS];
    this.saveSubjects();
    this.tasks = [];
    this.saveTasks();
    this.notify();
  }
}

export const planWiseStore = new PlanWiseStore();
