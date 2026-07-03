export interface UserProfile {
  name: string;
  email?: string;
  phone?: string;
  experience: string;
  education: string;
  skills: string[];
  preferredRoles: string[];
  salaryExpectations: string;
  remotePreferences: string;
  languages: string[];
  location: string;
  portfolio: string;
  github: string;
  linkedin: string;
}

export interface Resume {
  id: string;
  name: string;
  content: string; // Markdown content
  score: number;
  atsFeedback: string;
  version: number;
  createdAt: number;
}

export interface CoverLetter {
  id: string;
  title: string;
  jobTitle: string;
  company: string;
  content: string;
  style: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AIMemory {
  skills: string[];
  goals: string[];
  companies: string[];
  facts: string[];
}

// --- Phase 2 Interfaces ---

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  remote: string; // 'remote' | 'hybrid' | 'onsite'
  jobType: string; // 'fulltime' | 'parttime' | 'contract' | 'internship'
  description: string;
  techStack: string[];
  industry: string;
  url?: string;
  createdAt: number;
}

export type ApplicationStatus = 'saved' | 'applied' | 'assessment' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'archived';

export interface Application {
  id: string;
  jobId?: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  remote: string;
  status: ApplicationStatus;
  dateApplied?: number;
  notes: string;
  followUps?: boolean;
  reminderDate?: number;
  jobDesc?: string;
}

export interface Interview {
  id: string;
  applicationId?: string;
  company: string;
  position: string;
  dateTime: number; // Unix timestamp in ms
  timeZone: string;
  meetingLink?: string;
  interviewer?: string;
  checklist: string[];
  notes?: string;
  createdAt: number;
}

const DB_NAME = 'iphire_db';
const DB_VERSION = 2; // Upgraded schema version to 2 for Phase 2

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  private initDB(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not available'));
        return;
      }
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Version 1 stores
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('resumes')) {
          db.createObjectStore('resumes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('coverLetters')) {
          db.createObjectStore('coverLetters', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('chats')) {
          db.createObjectStore('chats', { keyPath: 'id' });
        }

        // Version 2 stores
        if (!db.objectStoreNames.contains('applications')) {
          db.createObjectStore('applications', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('interviews')) {
          db.createObjectStore('interviews', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('savedJobs')) {
          db.createObjectStore('savedJobs', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.initDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // --- Settings (Key-Value) ---
  public async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const store = await this.getStore('settings', 'readonly');
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result !== undefined ? request.result : defaultValue);
        };
        request.onerror = () => resolve(defaultValue);
      });
    } catch {
      return defaultValue;
    }
  }

  public async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      const store = await this.getStore('settings', 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("Failed to write to IndexedDB settings:", e);
    }
  }

  // --- Resumes ---
  public async getResumes(): Promise<Resume[]> {
    try {
      const store = await this.getStore('resumes', 'readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const list = request.result as Resume[];
          resolve(list.sort((a, b) => b.createdAt - a.createdAt));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async saveResume(resume: Resume): Promise<void> {
    const store = await this.getStore('resumes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(resume);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteResume(id: string): Promise<void> {
    const store = await this.getStore('resumes', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Cover Letters ---
  public async getCoverLetters(): Promise<CoverLetter[]> {
    try {
      const store = await this.getStore('coverLetters', 'readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const list = request.result as CoverLetter[];
          resolve(list.sort((a, b) => b.createdAt - a.createdAt));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async saveCoverLetter(letter: CoverLetter): Promise<void> {
    const store = await this.getStore('coverLetters', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(letter);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteCoverLetter(id: string): Promise<void> {
    const store = await this.getStore('coverLetters', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Chats ---
  public async getChats(): Promise<ChatSession[]> {
    try {
      const store = await this.getStore('chats', 'readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const list = request.result as ChatSession[];
          resolve(list.sort((a, b) => b.updatedAt - a.updatedAt));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async getChat(id: string): Promise<ChatSession | null> {
    try {
      const store = await this.getStore('chats', 'readonly');
      return new Promise((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async saveChat(chat: ChatSession): Promise<void> {
    const store = await this.getStore('chats', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(chat);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteChat(id: string): Promise<void> {
    const store = await this.getStore('chats', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Phase 2: Applications ---
  public async getApplications(): Promise<Application[]> {
    try {
      const store = await this.getStore('applications', 'readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result as Application[]);
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async saveApplication(app: Application): Promise<void> {
    const store = await this.getStore('applications', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(app);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteApplication(id: string): Promise<void> {
    const store = await this.getStore('applications', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Phase 2: Interviews ---
  public async getInterviews(): Promise<Interview[]> {
    try {
      const store = await this.getStore('interviews', 'readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const list = request.result as Interview[];
          resolve(list.sort((a, b) => a.dateTime - b.dateTime));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async saveInterview(int: Interview): Promise<void> {
    const store = await this.getStore('interviews', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(int);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteInterview(id: string): Promise<void> {
    const store = await this.getStore('interviews', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Phase 2: Saved Jobs ---
  public async getSavedJobs(): Promise<Job[]> {
    try {
      const store = await this.getStore('savedJobs', 'readonly');
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const list = request.result as Job[];
          resolve(list.sort((a, b) => b.createdAt - a.createdAt));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async saveJob(job: Job): Promise<void> {
    const store = await this.getStore('savedJobs', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(job);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteJob(id: string): Promise<void> {
    const store = await this.getStore('savedJobs', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllSettings(): Promise<Record<string, any>> {
    try {
      const store = await this.getStore('settings', 'readonly');
      return new Promise((resolve) => {
        const res: Record<string, any> = {};
        const request = store.openCursor();
        request.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
            res[cursor.primaryKey] = cursor.value;
            cursor.continue();
          } else {
            resolve(res);
          }
        };
        request.onerror = () => resolve({});
      });
    } catch {
      return {};
    }
  }

  public async syncCloud(): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Gather all local data
      const settings = await this.getAllSettings();
      const resumes = await this.getResumes();
      const coverLetters = await this.getCoverLetters();
      const chats = await this.getChats();
      const applications = await this.getApplications();
      const interviews = await this.getInterviews();
      const savedJobs = await this.getSavedJobs();

      // 2. POST to sync API
      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          resumes,
          coverLetters,
          chats,
          applications,
          interviews,
          savedJobs
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || `Server returned status ${res.status}`);
      }

      const syncResult = await res.json();
      if (!syncResult.success) {
        throw new Error(syncResult.message || syncResult.error || 'Sync operation failed on server');
      }

      const remote = syncResult.data;

      // 3. Update local settings
      if (remote.settings) {
        const store = await this.getStore('settings', 'readwrite');
        for (const [k, v] of Object.entries(remote.settings)) {
          await new Promise<void>((resolve, reject) => {
            const req = store.put(v, k);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }

      // 4. Update local resumes
      if (Array.isArray(remote.resumes)) {
        const store = await this.getStore('resumes', 'readwrite');
        for (const r of remote.resumes) {
          await new Promise<void>((resolve, reject) => {
            const req = store.put(r);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }

      // 5. Update local coverLetters
      if (Array.isArray(remote.coverLetters)) {
        const store = await this.getStore('coverLetters', 'readwrite');
        for (const cl of remote.coverLetters) {
          await new Promise<void>((resolve, reject) => {
            const req = store.put(cl);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }

      // 6. Update local chats
      if (Array.isArray(remote.chats)) {
        const store = await this.getStore('chats', 'readwrite');
        for (const c of remote.chats) {
          await new Promise<void>((resolve, reject) => {
            const req = store.put(c);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }

      // 7. Update local applications
      if (Array.isArray(remote.applications)) {
        const store = await this.getStore('applications', 'readwrite');
        for (const app of remote.applications) {
          await new Promise<void>((resolve, reject) => {
            const req = store.put(app);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }

      // 8. Update local interviews
      if (Array.isArray(remote.interviews)) {
        const store = await this.getStore('interviews', 'readwrite');
        for (const i of remote.interviews) {
          await new Promise<void>((resolve, reject) => {
            const req = store.put(i);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }

      // 9. Update local savedJobs
      if (Array.isArray(remote.savedJobs)) {
        const store = await this.getStore('savedJobs', 'readwrite');
        for (const j of remote.savedJobs) {
          await new Promise<void>((resolve, reject) => {
            const req = store.put(j);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });
        }
      }

      return { success: true, message: 'Data synced with TiDB Cloud successfully.' };
    } catch (e: any) {
      console.error('syncCloud error:', e);
      return { success: false, message: e.message || 'Sync failed.' };
    }
  }
}

export const dbManager = (typeof window !== 'undefined' ? new IndexedDBManager() : {}) as IndexedDBManager;
