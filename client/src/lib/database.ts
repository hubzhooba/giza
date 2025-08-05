import { supabase } from './supabase';
import { SecureRoom, Document, Participant } from '@/types';

export class DatabaseService {
  // Join a room as the invitee (second party)
  static async joinRoom(roomExternalId: string, userId: string): Promise<{ success: boolean; error?: string; room_id?: string }> {
    try {
      const { data, error } = await supabase
        .rpc('join_room_simple', {
          room_external_id: roomExternalId,
          user_id: userId
        });

      if (error) {
        console.error('DatabaseService.joinRoom: RPC error:', error);
        return { success: false, error: error.message };
      }

      // The RPC function returns a jsonb object with success/error
      if (data && typeof data === 'object') {
        return data as { success: boolean; error?: string; room_id?: string };
      }

      return { success: false, error: 'Unexpected response from server' };
    } catch (error: any) {
      console.error('DatabaseService.joinRoom: Unexpected error:', error);
      return { success: false, error: error.message || 'Failed to join room' };
    }
  }
  // Save room to Supabase
  static async saveRoom(room: SecureRoom) {
    // Get creator info if available
    const creator = room.participants.find(p => p.role === 'creator');
    
    // For wallet users, use wallet address as creator_id if no Supabase user ID
    const creatorId = room.creatorId || creator?.walletAddress || room.creatorWallet;
    
    try {
      console.log('DatabaseService.saveRoom: Attempting to use simple_create_room RPC');
      // Try using the new simple RPC function
      const { data: result, error: rpcError } = await supabase
        .rpc('simple_create_room', {
          room_data: {
            external_id: room.id,
            name: room.name,
            encryption_key: room.encryptionKey,
            creator_id: creatorId || '',
            creator_email: creator?.email || `${creatorId?.substring(0, 8) || 'wallet'}...@arweave`,
            creator_name: creator?.name || `User ${creatorId?.substring(0, 8) || 'wallet'}`,
            creator_wallet: room.creatorWallet || creator?.walletAddress || null,
            description: room.description || null,
            status: room.status || 'pending',
            created_at: room.createdAt.toISOString(),
            updated_at: room.updatedAt.toISOString()
          }
        });
      
      if (rpcError) {
        console.error('DatabaseService.saveRoom simple_create_room RPC error:', rpcError);
        console.error('RPC error code:', rpcError.code);
        console.error('RPC error message:', rpcError.message);
        throw rpcError;
      }
      
      if (result && (result as any).success) {
        // Return the created room data
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', (result as any).id)
          .single();
        
        if (error) throw error;
        return data;
      } else {
        throw new Error((result as any)?.error || 'Failed to create room');
      }
      
    } catch (rpcErr) {
      // Fallback to direct upsert if RPC doesn't exist
      console.log('Falling back to direct upsert');
      
      // Prepare room data
      const roomData: any = {
        external_id: room.id,
        name: room.name,
        encryption_key: room.encryptionKey,
        status: room.status,
        created_at: room.createdAt,
        updated_at: room.updatedAt,
      };
      
      // Only include creator fields if we have a creator ID
      if (creatorId) {
        roomData.creator_id = creatorId;
        roomData.creator_email = creator?.email || `${creatorId.substring(0, 8)}...@arweave`;
        roomData.creator_name = creator?.name || `User ${creatorId.substring(0, 8)}`;
        roomData.creator_wallet = room.creatorWallet || creator?.walletAddress;
      }
      
      // Add description if present
      if (room.description) {
        roomData.description = room.description;
      }
      
      const { data, error } = await supabase
        .from('rooms')
        .upsert(roomData, {
          onConflict: 'external_id'
        })
        .select()
        .single();

      if (error) {
        console.error('DatabaseService.saveRoom error:', error);
        // If it's a foreign key constraint error, log more details
        if (error.code === '23503') {
          console.error('Foreign key constraint error. Room data:', roomData);
          console.error('This usually means creator_id references a non-existent user.');
        }
        // If it's a type mismatch error
        if (error.code === '42883') {
          console.error('Type mismatch error. This usually means UUID vs TEXT issues.');
          console.error('Room data:', roomData);
        }
        throw error;
      }
      return data;
    }
  }

  // Load a single room by external ID (for authenticated users only)
  static async loadRoom(externalId: string): Promise<SecureRoom | null> {
    console.log('DatabaseService.loadRoom: Loading room with external_id:', externalId);
    
    try {
      // For wallet users, we don't need Supabase auth
      // The room access is controlled by encryption keys
      
      // Simplified query - get room data first
      const { data: roomData, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('external_id', externalId)
        .maybeSingle();
      
      console.log('DatabaseService.loadRoom: Query result:', { data: roomData, error });
      
      if (error || !roomData) {
        console.log('DatabaseService.loadRoom: No room found or error:', error);
        return null;
      }
      
      // Build room object with proper participant info
      const participants: Participant[] = [];
      
      // Get creator profile separately if needed (only for UUID format IDs)
      let creatorProfile = null;
      if (roomData.creator_id && 
          // Check if creator_id looks like a UUID
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomData.creator_id as string)) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', roomData.creator_id)
          .single();
        
        if (profileError) {
          console.log('DatabaseService.loadRoom: Error fetching creator profile:', profileError);
        } else {
          creatorProfile = profile;
          console.log('DatabaseService.loadRoom: Creator profile:', profile);
        }
      }
      
      // Add creator
      if (roomData.creator_id) {
        // Use full_name with proper fallback chain
        // First try profile data, then room data, then email, then default
        const creatorName = creatorProfile?.full_name || 
                           (roomData.creator_name as string) ||
                           (typeof roomData.creator_email === 'string' ? roomData.creator_email.split('@')[0] : '') ||
                           (typeof creatorProfile?.email === 'string' ? creatorProfile.email.split('@')[0] : '') || 
                           'Room Creator';
        
        const creatorEmail = creatorProfile?.email || roomData.creator_email || '';
        
        participants.push({
          userId: roomData.creator_id as string,
          email: creatorEmail as string,
          name: creatorName as string,
          walletAddress: roomData.creator_wallet as string,
          role: 'creator',
          hasJoined: true,
          joinedAt: new Date(roomData.created_at as string),
        });
      }
      
      // Add invitee if exists - use the data already in rooms table
      if (roomData.invitee_id) {
        participants.push({
          userId: roomData.invitee_id as string,
          email: (roomData.invitee_email as string) || '',
          name: (roomData.invitee_name as string) || (roomData.invitee_email as string) || 'Invitee',
          role: 'signer',
          hasJoined: true,
          joinedAt: roomData.invitee_joined_at ? new Date(roomData.invitee_joined_at as string) : undefined,
        });
      }
      
      return {
        id: roomData.external_id as string,
        name: roomData.name as string,
        creatorId: roomData.creator_id as string,
        creatorWallet: roomData.creator_wallet as string,
        inviteeId: roomData.invitee_id as string,
        participants,
        encryptionKey: roomData.encryption_key as string,
        createdAt: new Date(roomData.created_at as string),
        updatedAt: new Date(roomData.updated_at as string),
        status: roomData.status as 'pending' | 'active' | 'completed' | 'cancelled',
        contractData: {},
        description: roomData.description as string,
      };
    } catch (error) {
      console.error('DatabaseService.loadRoom: Unexpected error:', error);
      return null;
    }
  }

  // Load all rooms for the current user (where they are creator OR invitee)
  static async loadUserRooms(userId: string): Promise<SecureRoom[]> {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .or(`creator_id.eq.${userId},invitee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform database records to SecureRoom objects
    return (data || []).map(room => ({
      id: room.external_id as string,
      name: room.name as string,
      creatorId: room.creator_id as string,
      inviteeId: room.invitee_id as string,
      participants: [], // Will be populated separately if needed
      encryptionKey: room.encryption_key as string,
      createdAt: new Date(room.created_at as string),
      updatedAt: new Date(room.updated_at as string),
      status: room.status as 'pending' | 'active' | 'completed' | 'cancelled',
      contractData: {}, // Load from documents table if needed
      isCreator: room.creator_id === userId,
      isInvitee: room.invitee_id === userId,
    }));
  }

  // Save document to Supabase
  static async saveDocument(document: Document) {
    // First, get the room's UUID from external_id
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('external_id', document.roomId)
      .single();

    if (roomError) throw roomError;

    const { data, error } = await supabase
      .from('documents')
      .upsert({
        external_id: document.id,
        room_id: roomData.id,
        name: document.name,
        type: document.type,
        arweave_id: document.arweaveId,
        encrypted_content: document.encryptedContent,
        fields: document.fields,
        status: document.status,
        created_at: document.createdAt,
        updated_at: document.updatedAt,
      }, {
        onConflict: 'external_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Load all documents for a room
  static async loadRoomDocuments(roomId: string): Promise<Document[]> {
    // First, get the room's UUID from external_id
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('id')
      .eq('external_id', roomId)
      .single() as {
        data: { id: string } | null;
        error: any;
      };

    if (roomError) throw roomError;
    if (!roomData) throw new Error('Room not found');

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('room_id', roomData.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(doc => ({
      id: doc.external_id as string,
      roomId: roomId,
      name: doc.name as string,
      type: doc.type as 'contract' | 'invoice' | undefined,
      arweaveId: doc.arweave_id as string,
      encryptedContent: doc.encrypted_content as string,
      fields: doc.fields as any,
      signatures: [],
      status: doc.status as 'draft' | 'pending_signatures' | 'signed' | 'rejected',
      createdAt: new Date(doc.created_at as string),
      updatedAt: new Date(doc.updated_at as string),
    }));
  }

  // Load all documents for the current user
  static async loadUserDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        rooms!inner(creator_id, external_id)
      `)
      .eq('rooms.creator_id', userId)
      .order('created_at', { ascending: false }) as {
        data: Array<{
          external_id: string;
          name: string;
          type?: string;
          arweave_id?: string;
          encrypted_content?: string;
          fields?: any;
          status: string;
          created_at: string;
          updated_at: string;
          rooms: {
            external_id: string;
          };
        }> | null;
        error: any;
      };

    if (error) throw error;

    return (data || []).map(doc => ({
      id: doc.external_id as string,
      roomId: doc.rooms.external_id as string,
      name: doc.name as string,
      type: doc.type as 'contract' | 'invoice' | undefined,
      arweaveId: doc.arweave_id as string,
      encryptedContent: doc.encrypted_content as string,
      fields: doc.fields as any,
      signatures: [],
      status: doc.status as 'draft' | 'pending_signatures' | 'signed' | 'rejected',
      createdAt: new Date(doc.created_at as string),
      updatedAt: new Date(doc.updated_at as string),
    }));
  }

  // Load all rooms for the current user
  static async loadRooms(walletAddress?: string): Promise<SecureRoom[]> {
    // Try to get auth user first
    const { data: { user } } = await supabase.auth.getUser();
    
    // For wallet users, try the RPC function first
    if (!user && walletAddress) {
      try {
        const { data: rooms, error } = await supabase
          .rpc('get_rooms_for_wallet', { p_wallet_address: walletAddress });
        
        if (!error && rooms && Array.isArray(rooms)) {
          // Process the rooms data
          return this.processRoomsData(rooms);
        }
      } catch (e) {
        console.log('RPC function not available, falling back to direct query');
      }
    }
    
    // Build query based on user type
    let query = supabase.from('rooms').select('*');
    
    if (user) {
      // Auth user - use user ID
      query = query.or(`creator_id.eq.${user.id},invitee_id.eq.${user.id}`);
    } else if (walletAddress) {
      // Wallet user - use wallet address
      query = query.or(`creator_wallet.eq.${walletAddress},creator_id.eq.${walletAddress}`);
    } else {
      // No user - return empty
      return [];
    }
    
    const { data: rooms, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Get all unique creator IDs that are UUIDs to fetch profiles in batch
    const creatorIds = Array.from(new Set(
      (rooms || [])
        .map(r => r.creator_id)
        .filter(id => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id as string))
    ));
    
    // Fetch all creator profiles in one query (only for UUID IDs)
    let creatorProfiles: Record<string, any> = {};
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', creatorIds);
      
      // Create lookup map
      creatorProfiles = (profiles || []).reduce((acc: Record<string, any>, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    }

    return this.processRoomsData(rooms || []);
  }

  // Helper method to process rooms data
  private static processRoomsData(rooms: any[]): SecureRoom[] {
    return (rooms || []).map(room => {
      const participants: Participant[] = [];
      
      // Add creator
      if (room.creator_id) {
        participants.push({
          userId: room.creator_id as string,
          email: room.creator_email || '',
          name: room.creator_name || 'Room Creator',
          walletAddress: room.creator_wallet as string,
          role: 'creator',
          hasJoined: true,
          joinedAt: new Date(room.created_at as string),
        });
      }
      
      // Add invitee if exists
      if (room.invitee_id) {
        participants.push({
          userId: room.invitee_id as string,
          email: (room.invitee_email as string) || '',
          name: (room.invitee_name as string) || (room.invitee_email as string) || 'Invitee',
          role: 'signer',
          hasJoined: true,
          joinedAt: room.invitee_joined_at ? new Date(room.invitee_joined_at as string) : undefined,
        });
      }
      
      return {
        id: room.external_id as string,
        name: room.name as string,
        creatorId: room.creator_id as string,
        creatorWallet: room.creator_wallet as string,
        inviteeId: room.invitee_id as string,
        participants,
        encryptionKey: room.encryption_key as string,
        status: room.status as 'pending' | 'active' | 'completed' | 'cancelled',
        createdAt: new Date(room.created_at as string),
        updatedAt: new Date(room.updated_at as string),
        description: room.description as string,
      };
    });
  }

  // Load all documents for the current user
  static async loadDocuments(): Promise<Document[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return this.loadUserDocuments(user.id);
  }
}