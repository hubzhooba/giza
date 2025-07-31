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

  // Load a single room by external ID (for authenticated users only)
  static async loadRoom(externalId: string): Promise<SecureRoom | null> {
    console.log('DatabaseService.loadRoom: Loading room with external_id:', externalId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('DatabaseService.loadRoom: User not authenticated');
        return null;
      }
      
      // Query with joined profile data for better participant info
      const { data: roomData, error } = await supabase
        .from('rooms')
        .select(`
          *,
          creator:profiles!rooms_creator_id_fkey(id, email, full_name),
          invitee:profiles!rooms_invitee_id_fkey(id, email, full_name)
        `)
        .eq('external_id', externalId)
        .single();
      
      console.log('DatabaseService.loadRoom: Query result:', { data: roomData, error });
      
      if (error || !roomData) {
        console.log('DatabaseService.loadRoom: No room found or error:', error);
        return null;
      }
      
      // Build room object with proper participant info
      const participants: Participant[] = [];
      
      // Add creator with profile info
      if (roomData.creator_id && roomData.creator) {
        participants.push({
          userId: roomData.creator_id,
          email: roomData.creator.email || '',
          name: roomData.creator.full_name || roomData.creator.email || 'Room Creator',
          role: 'creator',
          hasJoined: true,
          joinedAt: new Date(roomData.created_at),
        });
      }
      
      // Add invitee if exists
      if (roomData.invitee_id) {
        if (roomData.invitee) {
          // Use profile data if available
          participants.push({
            userId: roomData.invitee_id,
            email: roomData.invitee.email || roomData.invitee_email || '',
            name: roomData.invitee.full_name || roomData.invitee_name || roomData.invitee.email || 'Invitee',
            role: 'signer',
            hasJoined: true,
            joinedAt: roomData.invitee_joined_at ? new Date(roomData.invitee_joined_at) : undefined,
          });
        } else {
          // Fallback to room data
          participants.push({
            userId: roomData.invitee_id,
            email: roomData.invitee_email || '',
            name: roomData.invitee_name || 'Invitee',
            role: 'signer',
            hasJoined: true,
            joinedAt: roomData.invitee_joined_at ? new Date(roomData.invitee_joined_at) : undefined,
          });
        }
      }
      
      return {
        id: roomData.external_id,
        name: roomData.name,
        creatorId: roomData.creator_id,
        inviteeId: roomData.invitee_id,
        participants,
        encryptionKey: roomData.encryption_key,
        createdAt: new Date(roomData.created_at),
        updatedAt: new Date(roomData.updated_at),
        status: roomData.status,
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
      inviteeId: room.invitee_id,
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