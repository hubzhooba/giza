import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, SecureRoom, Document } from '@/types';
import { DatabaseService } from '@/lib/database';
import toast from 'react-hot-toast';

interface AppState {
  user: User | null;
  currentRoom: SecureRoom | null;
  privateKey: string | null;
  rooms: SecureRoom[];
  documents: Document[];
  
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
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      currentRoom: null,
      privateKey: null,
      rooms: [],
      documents: [],
      
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
          const room = useStore.getState().rooms.find(r => r.id === roomId);
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
          await DatabaseService.saveDocument(document);
          set((state) => ({ documents: [...state.documents, document] }));
        } catch (error) {
          toast.error('Failed to save document');
          console.error(error);
        }
      },
      updateDocument: async (documentId, updates) => {
        try {
          const document = useStore.getState().documents.find(d => d.id === documentId);
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
      logout: () => {
        const state = useStore.getState();
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
        });
      },
    }),
    {
      name: 'freelance-platform-storage',
      partialize: (state) => ({
        privateKey: state.privateKey,
        // Don't persist user - let Supabase handle auth state
      }),
      version: 1,
    }
  )
);