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
    
    const { data, error } = await supabase
      .from('rooms')
      .upsert({
        external_id: room.id,
        name: room.name,
        creator_id: room.creatorId,
        creator_email: creator?.email,
        creator_name: creator?.name,
        encryption_key: room.encryptionKey,
        status: room.status,
        created_at: room.createdAt,
        updated_at: room.updatedAt,
      }, {
        onConflict: 'external_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Load a single room by external ID (for authenticated users only)
  static async loadRoom(externalId: string): Promise<SecureRoom | null> {
    console.log('DatabaseService.loadRoom: Loading room with external_id:', externalId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('DatabaseService.loadRoom: User not authenticated');
        return null;
      }
      
      // Simplified query - get room data first
      const { data: roomData, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('external_id', externalId)
        .single();
      
      console.log('DatabaseService.loadRoom: Query result:', { data: roomData, error });
      
      if (error || !roomData) {
        console.log('DatabaseService.loadRoom: No room found or error:', error);
        return null;
      }
      
      // Build room object with proper participant info
      const participants: Participant[] = [];
      
      // Get creator profile separately if needed
      let creatorProfile = null;
      if (roomData.creator_id) {
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
        inviteeId: roomData.invitee_id as string,
        participants,
        encryptionKey: roomData.encryption_key as string,
        createdAt: new Date(roomData.created_at as string),
        updatedAt: new Date(roomData.updated_at as string),
        status: roomData.status as 'pending' | 'active' | 'completed' | 'cancelled',
        contractData: {},
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
  static async loadRooms(): Promise<SecureRoom[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .or(`creator_id.eq.${user.id},invitee_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get all unique creator IDs to fetch profiles in batch
    const creatorIds = Array.from(new Set((rooms || []).map(r => r.creator_id).filter(Boolean)));
    
    // Fetch all creator profiles in one query
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

    return (rooms || []).map(room => {
      const participants: Participant[] = [];
      
      // Add creator
      if (room.creator_id) {
        const creatorProfile = creatorProfiles[room.creator_id as string];
        // Use full_name with proper fallback chain
        const creatorName = creatorProfile?.full_name || 
                           (typeof creatorProfile?.email === 'string' ? creatorProfile.email.split('@')[0] : '') || 
                           'Room Creator';
        
        participants.push({
          userId: room.creator_id as string,
          email: creatorProfile?.email || '',
          name: creatorName,
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
        inviteeId: room.invitee_id as string,
        participants,
        encryptionKey: room.encryption_key as string,
        status: room.status as 'pending' | 'active' | 'completed' | 'cancelled',
        createdAt: new Date(room.created_at as string),
        updatedAt: new Date(room.updated_at as string),
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