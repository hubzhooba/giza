import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { DatabaseService } from '@/lib/database';

export function useRealtimeRoom(roomId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { loadRooms, loadDocuments } = useStore();

  useEffect(() => {
    if (!roomId) return;

    let channel: any;

    const setupRealtimeSubscription = async () => {
      console.log('Setting up realtime subscription for room:', roomId);

      // Create a unique channel name
      channel = supabase.channel(`room-updates-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms',
            filter: `external_id=eq.${roomId}`
          },
          async (payload) => {
            console.log('Room update received:', payload);
            
            // Reload room data
            await loadRooms();
            
            // If room was just activated (someone joined), also reload documents
            const oldData = payload.old as any;
            const newData = payload.new as any;
            if (newData && oldData && 
                oldData.status === 'pending' && 
                newData.status === 'active') {
              await loadDocuments();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `room_id=eq.${roomId}`
          },
          async (payload) => {
            console.log('Document update received:', payload);
            await loadDocuments();
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          setIsSubscribed(status === 'SUBSCRIBED');
        });
    };

    setupRealtimeSubscription();

    // Cleanup
    return () => {
      if (channel) {
        console.log('Unsubscribing from room updates');
        supabase.removeChannel(channel);
      }
    };
  }, [roomId, loadRooms, loadDocuments]);

  return { isSubscribed };
}