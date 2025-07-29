import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { DatabaseService } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function useLoadUserData() {
  const { user, setRooms, setDocuments } = useStore();

  useEffect(() => {
    // Don't try to load data if no user is logged in
    if (!user?.id) return;

    const loadData = async () => {
      try {
        // Load rooms from Supabase
        const rooms = await DatabaseService.loadUserRooms(user.id);
        setRooms(rooms);

        // Load documents from Supabase
        const documents = await DatabaseService.loadUserDocuments(user.id);
        setDocuments(documents);
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast.error('Failed to load your contracts');
      }
    };

    loadData();

    // Subscribe to real-time changes
    const roomsSubscription = supabase
      .channel('rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `creator_id=eq.${user.id}`,
        },
        async () => {
          // Reload rooms when changes occur
          const rooms = await DatabaseService.loadUserRooms(user.id);
          setRooms(rooms);
        }
      )
      .subscribe();

    const documentsSubscription = supabase
      .channel('documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        async () => {
          // Reload documents when changes occur
          const documents = await DatabaseService.loadUserDocuments(user.id);
          setDocuments(documents);
        }
      )
      .subscribe();

    return () => {
      roomsSubscription.unsubscribe();
      documentsSubscription.unsubscribe();
    };
  }, [user, setRooms, setDocuments]);
}