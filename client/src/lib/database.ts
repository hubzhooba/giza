import { supabase } from './supabase';
import { SecureRoom, Document } from '@/types';

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
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('external_id', externalId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return {
      id: data.external_id,
      name: data.name,
      creatorId: data.creator_id,
      participants: [], // Load separately if needed
      encryptionKey: data.encryption_key,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      status: data.status,
      contractData: {}, // Load from documents table if needed
    };
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
        arweave_id: document.arweaveId,
        encrypted_content: document.encryptedContent,
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
}