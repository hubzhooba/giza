import { supabase } from './supabase';
import { SecureRoom, Document, Participant } from '@/types';

export class DatabaseService {
  // Join a room as the invitee (second party)
  static async joinRoom(roomExternalId: string, userId: string) {
    const { data, error } = await supabase
      .rpc('join_room', {
        room_external_id: roomExternalId,
        user_id: userId
      });

    if (error) throw error;
    return data;
  }
  // Save room to Supabase
  static async saveRoom(room: SecureRoom) {
    const { data, error } = await supabase
      .from('rooms')
      .upsert({
        external_id: room.id,
        name: room.name,
        creator_id: room.creatorId,
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

  // Load a single room by external ID (works for owners and shared users)
  static async loadRoom(externalId: string): Promise<SecureRoom | null> {
    console.log('DatabaseService.loadRoom: Loading room with external_id:', externalId);
    
    try {
      // First try RPC function (works for both authenticated and unauthenticated)
      console.log('DatabaseService.loadRoom: Trying RPC function');
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_room_for_invite', {
          room_external_id: externalId
        })
        .single();
      
      console.log('DatabaseService.loadRoom: RPC result:', { data: rpcData, error: rpcError });
      
      if (!rpcError && rpcData) {
        // Successfully loaded via RPC
        const participants: Participant[] = [];
        
        // Add creator as participant
        if (rpcData.creator_id) {
          participants.push({
            userId: rpcData.creator_id,
            email: rpcData.creator_email || '',
            name: rpcData.creator_name || '',
            role: 'creator',
            hasJoined: true,
            joinedAt: new Date(rpcData.created_at),
          });
        }
        
        // Add invitee if exists
        if (rpcData.invitee_id) {
          participants.push({
            userId: rpcData.invitee_id,
            email: rpcData.invitee_email || '',
            name: rpcData.invitee_name || '',
            role: 'signer',
            hasJoined: true,
            joinedAt: rpcData.invitee_joined_at ? new Date(rpcData.invitee_joined_at) : undefined,
          });
        }

        return {
          id: rpcData.external_id,
          name: rpcData.name,
          creatorId: rpcData.creator_id,
          participants,
          encryptionKey: rpcData.encryption_key,
          createdAt: new Date(rpcData.created_at),
          updatedAt: new Date(rpcData.updated_at),
          status: rpcData.status,
          contractData: {},
        };
      }
      
      // If RPC failed, check if user is authenticated for fallback
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('DatabaseService.loadRoom: RPC failed and user not authenticated');
        return null;
      }
      
      // Try direct query for authenticated users
      console.log('DatabaseService.loadRoom: Trying direct query for authenticated user');
      const { data: directData, error: directError } = await supabase
        .from('rooms')
        .select('*')
        .eq('external_id', externalId)
        .single();
      
      console.log('DatabaseService.loadRoom: Direct query result:', { data: directData, error: directError });
      
      if (directError || !directData) {
        console.log('DatabaseService.loadRoom: No room found');
        return null;
      }
      
      // Load participants for direct query
      const participants: Participant[] = [];
      
      // Add creator as participant
      if (directData.creator_id) {
        participants.push({
          userId: directData.creator_id,
          email: directData.creator_email || '',
          name: directData.creator_name || '',
          role: 'creator',
          hasJoined: true,
          joinedAt: new Date(directData.created_at),
        });
      }
      
      // Add invitee if exists
      if (directData.invitee_id) {
        participants.push({
          userId: directData.invitee_id,
          email: directData.invitee_email || '',
          name: directData.invitee_name || '',
          role: 'signer',
          hasJoined: true,
          joinedAt: directData.invitee_joined_at ? new Date(directData.invitee_joined_at) : undefined,
        });
      }

      return {
        id: directData.external_id,
        name: directData.name,
        creatorId: directData.creator_id,
        participants,
        encryptionKey: directData.encryption_key,
        createdAt: new Date(directData.created_at),
        updatedAt: new Date(directData.updated_at),
        status: directData.status,
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
      id: room.external_id,
      name: room.name,
      creatorId: room.creator_id,
      inviteeId: room.invitee_id,
      participants: [], // Will be populated separately if needed
      encryptionKey: room.encryption_key,
      createdAt: new Date(room.created_at),
      updatedAt: new Date(room.updated_at),
      status: room.status,
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
      .single();

    if (roomError) throw roomError;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('room_id', roomData.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(doc => ({
      id: doc.external_id,
      roomId: roomId,
      name: doc.name,
      type: doc.type,
      arweaveId: doc.arweave_id,
      encryptedContent: doc.encrypted_content,
      fields: doc.fields,
      signatures: [],
      status: doc.status,
      createdAt: new Date(doc.created_at),
      updatedAt: new Date(doc.updated_at),
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
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(doc => ({
      id: doc.external_id,
      roomId: doc.rooms.external_id,
      name: doc.name,
      type: doc.type,
      arweaveId: doc.arweave_id,
      encryptedContent: doc.encrypted_content,
      fields: doc.fields,
      signatures: [],
      status: doc.status,
      createdAt: new Date(doc.created_at),
      updatedAt: new Date(doc.updated_at),
    }));
  }

  // Load all rooms for the current user
  static async loadRooms(): Promise<SecureRoom[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .or(`creator_id.eq.${user.id},invitee_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(room => ({
      id: room.external_id,
      name: room.name,
      creatorId: room.creator_id,
      participants: [],
      encryptionKey: room.encryption_key,
      status: room.status,
      createdAt: new Date(room.created_at),
      updatedAt: new Date(room.updated_at),
    }));
  }

  // Load all documents for the current user
  static async loadDocuments(): Promise<Document[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    return this.loadUserDocuments(user.id);
  }
}