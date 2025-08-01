import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, SecureRoom, Document, Activity } from '@/types';
import { DatabaseService } from '@/lib/database';
import toast from 'react-hot-toast';

interface AppState {
  user: User | null;
  currentRoom: SecureRoom | null;
  privateKey: string | null;
  rooms: SecureRoom[];
  documents: Document[];
  activities: Activity[];
  
  setUser: (user: User | null) => void;
  setPrivateKey: (key: string | null) => void;
  setCurrentRoom: (room: SecureRoom | null) => void;
  setRooms: (rooms: SecureRoom[]) => void;
  addRoom: (room: SecureRoom) => Promise<void>;
  updateRoom: (roomId: string, updates: Partial<SecureRoom>) => Promise<void>;
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => Promise<void>;
  updateDocument: (documentId: string, updates: Partial<Document>) => Promise<void>;
  loadRooms: () => Promise<void>;
  loadDocuments: () => Promise<void>;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => void;
  logout: () => void;
  clearStore: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      currentRoom: null,
      privateKey: null,
      rooms: [],
      documents: [],
      activities: [],
      
      setUser: (user) => {
        console.log('Setting user in store:', user);
        set({ user });
      },
      setPrivateKey: (privateKey) => set({ privateKey }),
      setCurrentRoom: (currentRoom) => set({ currentRoom }),
      setRooms: (rooms) => set({ rooms }),
      addRoom: async (room) => {
        try {
          // Save to Supabase first
          await DatabaseService.saveRoom(room);
          set((state) => ({ rooms: [...state.rooms, room] }));
        } catch (error) {
          toast.error('Failed to save contract');
          console.error(error);
        }
      },
      updateRoom: async (roomId, updates) => {
        try {
          const room = get().rooms.find(r => r.id === roomId);
          if (room) {
            await DatabaseService.saveRoom({ ...room, ...updates });
          }
          set((state) => ({
            rooms: state.rooms.map((room) =>
              room.id === roomId ? { ...room, ...updates } : room
            ),
          }));
        } catch (error) {
          toast.error('Failed to update contract');
          console.error(error);
        }
      },
      setDocuments: (documents) => set({ documents }),
      addDocument: async (document) => {
        try {
          // Save to Supabase first
          console.log('Saving document to database:', document);
          await DatabaseService.saveDocument(document);
          set((state) => ({ documents: [...state.documents, document] }));
          console.log('Document saved successfully');
        } catch (error) {
          toast.error('Failed to save document');
          console.error('Error saving document:', error);
        }
      },
      updateDocument: async (documentId, updates) => {
        try {
          const document = get().documents.find(d => d.id === documentId);
          if (document) {
            await DatabaseService.saveDocument({ ...document, ...updates });
          }
          set((state) => ({
            documents: state.documents.map((doc) =>
              doc.id === documentId ? { ...doc, ...updates } : doc
            ),
          }));
        } catch (error) {
          toast.error('Failed to update document');
          console.error(error);
        }
      },
      loadRooms: async () => {
        try {
          const rooms = await DatabaseService.loadRooms();
          set({ rooms });
        } catch (error) {
          console.error('Failed to load rooms:', error);
        }
      },
      loadDocuments: async () => {
        try {
          const documents = await DatabaseService.loadDocuments();
          set({ documents });
        } catch (error) {
          console.error('Failed to load documents:', error);
        }
      },
      addActivity: (activity) => {
        const newActivity: Activity = {
          ...activity,
          id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date()
        };
        set((state) => ({
          activities: [newActivity, ...state.activities].slice(0, 50) // Keep last 50 activities
        }));
      },
      logout: () => {
        const state = get();
        // Clear private key from localStorage
        if (state.user) {
          localStorage.removeItem(`pk_${state.user.id}`);
        }
        // Clear Supabase auth storage
        localStorage.removeItem('supabase-auth-token');
        set({
          user: null,
          currentRoom: null,
          privateKey: null,
          rooms: [],
          documents: [],
          activities: [],
        });
      },
      clearStore: () => {
        // Clear all zustand persisted data
        localStorage.removeItem('freelance-platform-storage');
        set({
          user: null,
          currentRoom: null,
          privateKey: null,
          rooms: [],
          documents: [],
          activities: [],
        });
      },
    }),
    {
      name: 'freelance-platform-storage',
      partialize: (state) => ({
        privateKey: state.privateKey,
        activities: state.activities,
        // Don't persist user - let Supabase handle auth state
      }),
      version: 1,
    }
  )
);