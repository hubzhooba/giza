# Supabase Setup Guide

This guide explains how to set up the Supabase database tables for data persistence.

## Prerequisites

- Access to your Supabase project dashboard
- Project URL and API keys configured in your `.env.local` file

## Setting up the Database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `/client/src/lib/database-schema.sql`
4. Run the SQL query to create the tables and policies

## Tables Created

### `rooms` Table
Stores secure contract negotiation rooms with end-to-end encryption keys.

### `documents` Table  
Stores contract documents with references to Arweave for permanent storage.

### `participants` Table
Stores participants invited to each room.

## Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own rooms and related data
- Data is isolated between users for security

## Real-time Subscriptions

The application automatically subscribes to changes in rooms and documents, ensuring data stays synchronized across sessions.

## Testing Data Persistence

After running the SQL schema:

1. Create a new contract in the application
2. Refresh the page
3. The contract should persist and be visible in your dashboard
4. Check the Supabase dashboard to see the data in the tables